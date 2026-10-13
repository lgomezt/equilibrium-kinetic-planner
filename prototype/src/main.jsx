import React,{useState,useReducer,useRef,useMemo,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import ArcadeScene from './arcade/ArcadeScene.jsx';
import {createGameState,attemptChange,getControls,toPlan,GOALS,CATALOG,SAFETY} from './planner.js';
import './arcade/arcade.css';
import './arcade/reference-layout.css';

const title=name=>name[0].toUpperCase()+name.slice(1);
const amount=(dose)=>dose>=1000?`${dose/1000} g`:`${dose} mg`;
function updateApp(current,action){
 if(action.type==='notice')return {...current,notice:action.text};
 const result=attemptChange(current.blend,action.goal,action.delta);
 if(!result.accepted)return {...current,notice:result.reason};
 const changed=result.state.counts.some((n,i)=>n!==current.blend.counts[i]);
 const name=title(action.goal),increasing=action.delta>0;
 return {blend:result.state,notice:changed?(increasing?`${name} increased. New portions are on their way.`:`${name} reduced. Only unneeded portions are released.`):`${name} ${increasing?'increased':'reduced'}. The shared blend already covers the balance.`};
}
function App(){
 const [app,dispatch]=useReducer(updateApp,null,()=>({blend:createGameState(),notice:'Higher priorities don’t always need more. Shared benefits count once.'}));
 const state=app.blend,notice=app.notice;
 const setNotice=text=>dispatch({type:'notice',text});
 const [detail,setDetail]=useState(null),popover=useRef(),opener=useRef();
 const [zoomed,setZoomed]=useState(false),scrollPort=useRef();
 const [reducedMotion,setReducedMotion]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const controls=useMemo(()=>getControls(state),[state]),plan=useMemo(()=>toPlan(state),[state]);
 useEffect(()=>{
  const mq=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReducedMotion(mq.matches);
  mq.addEventListener('change',update);return()=>mq.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
  const port=scrollPort.current;
  if(!port)return;
  if(!zoomed){port.scrollLeft=0;port.scrollTop=0;return;}
  if(!matchMedia('(max-width:640px)').matches)return;
  let layoutFrame=0,centerFrame=0;
  layoutFrame=requestAnimationFrame(()=>{
   centerFrame=requestAnimationFrame(()=>{
    if(port.querySelector('.arcade-fallback'))return;
    port.scrollLeft=Math.max(0,(port.scrollWidth-port.clientWidth)/2);
   });
  });
  return()=>{cancelAnimationFrame(layoutFrame);cancelAnimationFrame(centerFrame);};
 },[zoomed]);
 useEffect(()=>{
  if(detail!==null){popover.current?.showPopover();popover.current?.querySelector('.close')?.focus();}
 },[detail]);
 useEffect(()=>{
  window.supplementPlanner={snapshot:()=>({priorities:{...state.priorities},counts:[...state.counts],plan:toPlan(state).map(p=>({id:p.id,balls:p.balls,dose:p.dose,cap:p.cap})),controls:getControls(state)})};
  return()=>{delete window.supplementPlanner;};
 },[state]);
 function change(goal,delta){
  // One atomic reducer preserves consecutive rapid clicks under React batching.
  dispatch({type:'change',goal,delta});
  if(delta>0&&!controls[goal].canIncrease&&state.priorities[goal]<5)showDetail('rules');
 }
 function showDetail(value){opener.current=document.activeElement;setDetail(value);}
 function closeDetails(){setDetail(null);opener.current?.focus();}
 function keepControlVisible(event){
  if(!zoomed||!matchMedia('(max-width:640px)').matches||scrollPort.current?.querySelector('.arcade-fallback'))return;
  const target=event.target;
  if(target instanceof HTMLElement&&target.closest('.arcade-ui'))target.scrollIntoView({block:'nearest',inline:'nearest'});
 }
 const info=typeof detail==='number'?plan[detail]:null;
 const overlays={
  marquee:<header className="arcade-ui arcade-marquee"><h1>A little balance.</h1><p>Choose what matters to you. Let the evidence shape the blend.</p></header>,
  leftPlaque:<div className="arcade-ui arcade-brand"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12.5"/><path d="M3.5 16h25M16 3.5v25"/><circle cx="16" cy="16" r="5"/></svg><span>equilibrium</span></div>,
  rightPlaque:<div className="arcade-ui arcade-motto"><span>SCIENCE. BALANCE.</span><strong>A BRIGHTER YOU.</strong></div>,
  controls:<section className="arcade-ui arcade-controls goals" aria-label="Health goal priorities">{GOALS.map((goal)=>{const name=title(goal),level=state.priorities[goal],control=controls[goal],blocked=!control.canIncrease&&level<5;return <div className={`goal ${blocked?'locked':''}`} key={goal}>
     <span className="goal-name">{name}</span>
     <div className="battery" role="meter" aria-label={`${name} priority`} aria-valuemin="0" aria-valuemax="5" aria-valuenow={level}>{Array.from({length:5},(_,j)=><span key={j} className={`segment ${j<level?'on':''}`}/>)}</div>
     <div className="priority-controls"><button className="stepper" aria-label={`Decrease ${name} priority`} disabled={!control.canDecrease} onClick={()=>change(goal,-1)}>−</button><span className="level"><strong>{level}</strong><span aria-hidden="true">/5</span></span><button className={`stepper ${blocked?'blocked':''}`} aria-label={`Increase ${name} priority`} aria-disabled={!control.canIncrease} aria-describedby={blocked?`${goal}-lock`:undefined} title={!control.canIncrease?control.reason:`Increase ${name}`} disabled={level===5} onFocus={()=>{if(blocked)setNotice(control.reason);}} onMouseEnter={()=>{if(blocked)setNotice(control.reason);}} onClick={()=>change(goal,1)}>+</button></div>
     {blocked&&<span className="sr-only" id={`${goal}-lock`}>{control.reason}</span>}
    </div>;})}</section>,
  labels:[...plan.map((p,i)=><div className="arcade-ui arcade-bin-label dosage" key={p.id} style={{'--color':p.color}}><button className="dose-name" onClick={()=>showDetail(i)} aria-haspopup="dialog" aria-controls="blend-details" aria-expanded={detail===i}><span className="color-key" aria-hidden="true"/>{p.name}</button><div className={`dose-amount ${p.dose?'':'empty'}`}>{p.dose?amount(p.dose):'Not included'}{p.dose>0&&<small>/ day</small>}</div><p className="ball-unit">1 ball = {amount(p.ballQuantity)}{p.id==='magnesium'?' elemental':''}</p></div>),...Array.from({length:2},(_,i)=><div className="arcade-ui arcade-bin-label arcade-bin-spare" key={`spare-${i}`}><span className="spare-name">Unassigned</span><span className="spare-dose" aria-hidden="true">—</span><span className="sr-only">Spare compartment. This blend uses the four existing supplements.</span></div>)],
  footer:<footer className="arcade-ui arcade-footer"><div className="arcade-footer-caption" aria-hidden="true">FUEL A BRIGHTER YOU</div><div className="plan-note" aria-live="polite" aria-atomic="true"><span className="note-dot" aria-hidden="true"/><p>{notice}</p></div><div className="arcade-footer-meta"><span>Exploratory blend · Healthy adult assumptions · Intake & medicines unchecked</span><button className="text-button" onClick={()=>showDetail('rules')} aria-haspopup="dialog" aria-controls="blend-details" aria-expanded={detail==='rules'} title="Evidence & boundaries"><span className="footer-evidence-label">Evidence & boundaries</span><span className="footer-evidence-icon" aria-hidden="true">i</span><span className="footer-evidence-arrow" aria-hidden="true">↗</span></button></div></footer>
 };
 return <div className="arcade-app">
  <div className="arcade-zoom-toolbar"><button type="button" aria-pressed={zoomed} aria-controls="arcade-cabinet-scroll-port" onClick={()=>setZoomed(value=>!value)}>{zoomed?'Fit cabinet':'Zoom cabinet'}</button></div>
  <div id="arcade-cabinet-scroll-port" ref={scrollPort} className={`arcade-scroll-port ${zoomed?'arcade-scroll-port-zoomed':''}`} role="region" aria-label="Scrollable cabinet" tabIndex={zoomed?0:-1} onFocusCapture={keepControlVisible}>
  <main className="arcade-viewport" aria-label="Equilibrium arcade supplement planner"><ArcadeScene plan={plan} reducedMotion={reducedMotion} overlays={overlays}/></main>
  </div>
  <div className="detail" id="blend-details" ref={popover} popover="auto" role="dialog" aria-label={info?`${info.name} evidence`:'Blend boundaries'} onToggle={event=>{if(event.newState==='closed')closeDetails();}}>
   <button className="close" aria-label="Close details" onClick={()=>popover.current.hidePopover()}>×</button>
   {info?<>
    <h2>{info.name}</h2><p>{info.portionNote}</p>
    <p className="meta">{info.benefits.map(b=>`${title(b.goal)} · ${b.evidence}`).join(' / ')}</p>
    {info.benefits.map(b=><p key={b.goal}><strong>{title(b.goal)}.</strong> {b.claim}</p>)}
    <div className="rule"/><p><strong>App cap: {amount(info.cap)}{info.id==='magnesium'?' elemental':''} / day.</strong> {info.safety.limitKind}</p><p>{info.safety.notes}</p>
    {info.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>)}
   </>:<>
    <h2>Room for balance.</h2><p>{notice}</p><p className="meta">Exploratory blend · Real quantities · Conservative caps</p><p>Increasing a goal can add portions or keep the blend as it is. It never removes balls. Lowering a goal releases only the portions no longer needed.</p>
    <p>Sleep and Calm limit caffeine: levels 0–1 allow 75 mg, level 2 allows 50 mg, level 3 allows 25 mg, and levels 4–5 allow none. A conflicting “+” locks until you reduce the opposing goal.</p>
    <p>These locks, priority levels and benefit weights are gameplay rules, not medical thresholds or clinical effect sizes. Exploratory links are shown in each ingredient’s details.</p>
    <div className="rule"/><p>{SAFETY.scope}</p><p>Portions below studied doses do not imply proven benefit. The displayed daily blend is an exploration, not a personal prescription.</p>
    <p className="meta">Application caps: {CATALOG.map(p=>`${p.name} ${amount(p.cap)}${p.id==='magnesium'?' elemental':''}`).join(' · ')}.</p>
   </>}
  </div>
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
