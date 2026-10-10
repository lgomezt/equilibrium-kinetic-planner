import React,{useState,useReducer,useLayoutEffect,useRef,useMemo,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import Scene from './Scene.jsx';
import {createGameState,attemptChange,getControls,toPlan,GOALS,CATALOG,SAFETY} from './planner.js';
import '../../dist/styles.css';
import './study.css';

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
 const [app,dispatch]=useReducer(updateApp,null,()=>({blend:createGameState(),notice:'Higher priorities don’t always need more. Shared benefits count once.'})),installation=useRef();
 const state=app.blend,notice=app.notice;
 const setNotice=text=>dispatch({type:'notice',text});
 const [detail,setDetail]=useState(null),popover=useRef(),opener=useRef();
 const [reducedMotion,setReducedMotion]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const controls=useMemo(()=>getControls(state),[state]),plan=useMemo(()=>toPlan(state),[state]);
 useEffect(()=>{
  const mq=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReducedMotion(mq.matches);
  mq.addEventListener('change',update);return()=>mq.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
  if(detail!==null){popover.current?.showPopover();popover.current?.querySelector('.close')?.focus();}
 },[detail]);
 useEffect(()=>{
  window.supplementPlanner={snapshot:()=>({priorities:{...state.priorities},counts:[...state.counts],plan:toPlan(state).map(p=>({id:p.id,balls:p.balls,dose:p.dose,cap:p.cap})),controls:getControls(state)})};
  return()=>{delete window.supplementPlanner;};
 },[state]);
 useLayoutEffect(()=>{
  const fit=()=>{
   if(innerWidth<=640){installation.current.style.width='100%';return;}
   const main=document.querySelector('main');
   const fixed=['.intro','.goals','.dosages','.plan-note'].reduce((sum,s)=>sum+document.querySelector(s).getBoundingClientRect().height,0);
   installation.current.style.width=Math.min(1280,innerWidth-64,Math.max(200,main.clientHeight-fixed-16)*2.05)+'px';
  };fit();window.addEventListener('resize',fit);
  const observer=new ResizeObserver(fit);observer.observe(document.querySelector('.plan-note'));
  return()=>{window.removeEventListener('resize',fit);observer.disconnect();};
 },[]);
 function change(goal,delta){
  // One atomic reducer preserves consecutive rapid clicks under React batching.
  dispatch({type:'change',goal,delta});
 }
 function showDetail(value){opener.current=document.activeElement;setDetail(value);}
 function closeDetails(){setDetail(null);opener.current?.focus();}
 const info=typeof detail==='number'?plan[detail]:null;
 return <>
  <header className="topbar"><div className="wordmark"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12.5"/><path d="M3.5 16h25M16 3.5v25"/><circle cx="16" cy="16" r="5"/></svg>equilibrium</div><span className="mode"><span className="mode-dot"/>a playful balance</span></header>
  <main>
   <div className="intro"><h1>A little balance.</h1><p>Choose what matters to you. Let the blend find its balance.</p></div>
   <div className="installation" ref={installation}>
    <section className="goals" aria-label="Health goal priorities">{GOALS.map((goal)=>{const name=title(goal),level=state.priorities[goal],control=controls[goal],blocked=!control.canIncrease&&level<5;return <div className={`goal ${blocked?'locked':''}`} key={goal}>
     <span className="goal-name">{name}</span>
     <div className="battery" role="meter" aria-label={`${name} priority`} aria-valuemin="0" aria-valuemax="5" aria-valuenow={level}>{Array.from({length:5},(_,j)=><span key={j} className={`segment ${j<level?'on':''}`}/>)}</div>
     <div className="priority-controls"><button className="stepper" aria-label={`Decrease ${name} priority`} disabled={!control.canDecrease} onClick={()=>change(goal,-1)}>−</button><span className="level"><strong>{level}</strong><span aria-hidden="true">/5</span></span><button className={`stepper ${blocked?'blocked':''}`} aria-label={`Increase ${name} priority`} aria-disabled={!control.canIncrease} aria-describedby={blocked?`${goal}-lock`:undefined} title={!control.canIncrease?control.reason:`Increase ${name}`} disabled={level===5} onFocus={()=>{if(blocked)setNotice(control.reason);}} onMouseEnter={()=>{if(blocked)setNotice(control.reason);}} onClick={()=>change(goal,1)}>+</button></div>
     {blocked&&<span className="sr-only" id={`${goal}-lock`}>{control.reason}</span>}
    </div>;})}</section>
    <div className="machine"><Scene plan={plan} reducedMotion={reducedMotion}/></div>
    <section className="dosages" aria-label="Daily blend quantities">{plan.map((p,i)=><div className="dosage" key={p.id} style={{'--color':p.color}}><button className="dose-name" onClick={()=>showDetail(i)} aria-haspopup="dialog" aria-controls="blend-details" aria-expanded={detail===i}><span className="color-key"/>{p.name}</button><div className={`dose-amount ${p.dose?'':'empty'}`}>{p.dose?amount(p.dose):'Not included'}{p.dose>0&&<small>/ day</small>}</div><p className="ball-unit">1 ball = {amount(p.ballQuantity)}{p.id==='magnesium'?' elemental':''}</p></div>)}</section>
    <div className="plan-note" aria-live="polite" aria-atomic="true"><span className="note-dot"/><p>{notice}</p></div>
   </div>
  </main>
  <footer><span>Exploratory blend · Healthy adult assumptions · Intake & medicines unchecked</span><button className="text-button" onClick={()=>showDetail('rules')} aria-haspopup="dialog" aria-controls="blend-details" aria-expanded={detail==='rules'}>Evidence & boundaries <span aria-hidden="true">↗</span></button></footer>
  <div className="detail" id="blend-details" ref={popover} popover="auto" role="dialog" aria-label={info?`${info.name} evidence`:'Blend boundaries'} onToggle={event=>{if(event.newState==='closed')closeDetails();}}>
   <button className="close" aria-label="Close details" onClick={()=>popover.current.hidePopover()}>×</button>
   {info?<>
    <h2>{info.name}</h2><p>{info.portionNote}</p>
    <p className="meta">{info.benefits.map(b=>`${title(b.goal)} · ${b.evidence}`).join(' / ')}</p>
    {info.benefits.map(b=><p key={b.goal}><strong>{title(b.goal)}.</strong> {b.claim}</p>)}
    <div className="rule"/><p><strong>App cap: {amount(info.cap)}{info.id==='magnesium'?' elemental':''} / day.</strong> {info.safety.limitKind}</p><p>{info.safety.notes}</p>
    {info.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>)}
   </>:<>
    <h2>Room for balance.</h2><p>Increasing a goal can add portions or keep the blend as it is. It never removes balls. Lowering a goal releases only the portions no longer needed.</p>
    <p>Sleep and Calm limit caffeine: levels 0–1 allow 75 mg, level 2 allows 50 mg, level 3 allows 25 mg, and levels 4–5 allow none. A conflicting “+” locks until you reduce the opposing goal.</p>
    <p>These locks, priority levels and benefit weights are gameplay rules, not medical thresholds or clinical effect sizes. Exploratory links are shown in each ingredient’s details.</p>
    <div className="rule"/><p>{SAFETY.scope}</p><p>Portions below studied doses do not imply proven benefit. The displayed daily blend is an exploration, not a personal prescription.</p>
    <p className="meta">Application caps: {CATALOG.map(p=>`${p.name} ${amount(p.cap)}${p.id==='magnesium'?' elemental':''}`).join(' · ')}.</p>
   </>}
  </div>
 </>;
}
createRoot(document.getElementById('root')).render(<App/>);
