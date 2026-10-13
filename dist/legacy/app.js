import {createPlanner,GOALS} from './planner.js';
import {createSculpture} from './physics.js';

const formatAmount=(quantity,unit='mg')=>quantity>=1000&&unit==='mg'?`${quantity/1000} g`:`${quantity} ${unit}`;
const names={sleep:'Sleep',memory:'Memory',focus:'Focus',strength:'Strength',calm:'Calm',energy:'Energy'};
const priorities={sleep:2,memory:1,focus:3,strength:3,calm:1,energy:2};
const detail=document.querySelector('#detail');
let detailOpener;
detail.addEventListener('beforetoggle',event=>{
 if(event.newState==='closed'){
  const opener=detailOpener;opener?.setAttribute('aria-expanded','false');
  if(detail.contains(document.activeElement))queueMicrotask(()=>{if(!detail.matches(':popover-open')&&opener?.isConnected)opener.focus();});
 }
});
const sourceX=[175,345,515,685,855,1025];
const feedPaths=sourceX.map(x=>`M ${x} 6 L ${x} 27 C ${x} 78 ${x<710?Math.min(x+350,650):Math.max(x-220,760)} 62 710 92`);
const mainPath='M710 92 C710 125 135 100 135 155 S735 180 735 216 S135 240 135 280 S780 320 875 335';
const wheelPath='M710 92 C820 95 915 92 970 105 A100 100 0 0 1 970 305 Q970 325 1010 335';
const centers=[225,475,725,975];
const sortMain=centers.map(x=>`M875 335 C875 354 ${x} 355 ${x} 390`);
const sortWheel=centers.map(x=>`M1010 335 C1010 358 ${x} 355 ${x} 390`);
const rail=(id,path,width=18)=>`<g class="rail" filter="url(#railShadow)"><path d="${path}" fill="none" stroke="url(#metal)" stroke-width="${width}" stroke-linecap="round"/><path d="${path}" fill="none" stroke="#7c8986" stroke-width="${width-5}" stroke-linecap="round"/><path id="${id}" d="${path}" fill="none" stroke="url(#channel)" stroke-width="${width-8}" stroke-linecap="round"/><path d="${path}" fill="none" stroke="#ffffffb3" stroke-width="1.3" stroke-linecap="round" transform="translate(0 -4)"/></g>`;
const posts=[[175,120,210],[708,199,264],[146,280,359],[680,309,366],[970,306,373],[1025,64,114]];
const sculpture=document.querySelector('#sculpture');
sculpture.innerHTML=`<defs>
 <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#acb3b7"/><stop offset=".18" stop-color="#f5f8fa"/><stop offset=".4" stop-color="#b7bfc4"/><stop offset=".6" stop-color="#818c94"/><stop offset=".85" stop-color="#dce2e5"/><stop offset="1" stop-color="#8e9aa2"/></linearGradient>
 <linearGradient id="channel" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#cdd5da"/><stop offset=".45" stop-color="#f5f8fa"/><stop offset=".65" stop-color="#d0d9df"/><stop offset="1" stop-color="#a5b2bb"/></linearGradient>
 <linearGradient id="post" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#919ea8"/><stop offset=".3" stop-color="#eff3f6"/><stop offset=".55" stop-color="#c0ccd4"/><stop offset="1" stop-color="#8798a4"/></linearGradient>
 <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8b98a3"/><stop offset=".23" stop-color="#f1f5f8"/><stop offset=".5" stop-color="#adbcc6"/><stop offset=".75" stop-color="#edf3f8"/><stop offset="1" stop-color="#8d9eac"/></linearGradient>
 <radialGradient id="hub"><stop stop-color="#dbe4eb"/><stop offset=".35" stop-color="#f6f9fc"/><stop offset=".4" stop-color="#b1c2ce"/><stop offset=".6" stop-color="#8298a9"/><stop offset=".72" stop-color="#e5edf4"/><stop offset="1" stop-color="#a3b7c6"/></radialGradient>
 <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#eef3ef" stop-opacity=".08"/><stop offset=".45" stop-color="#ebf2f7" stop-opacity=".12"/><stop offset="1" stop-color="#cddce8" stop-opacity=".37"/></linearGradient>
 <linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset=".3" stop-color="#e2eaf1"/><stop offset=".65" stop-color="#c6d5e0"/><stop offset="1" stop-color="#e5edf4"/></linearGradient>
 <linearGradient id="partition" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#bdcfdd" stop-opacity=".6"/><stop offset=".35" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#a9bfd0" stop-opacity=".6"/></linearGradient>
 <filter id="railShadow" x="-30%" y="-50%" width="170%" height="220%"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#263c30" flood-opacity=".12"/></filter>
 <filter id="softShadow" x="-30%" y="-40%" width="160%" height="200%"><feDropShadow dx="0" dy="10" stdDeviation="11" flood-color="#304a33" flood-opacity=".1"/></filter>
</defs>
<ellipse cx="593" cy="475" rx="510" ry="8" fill="#304936" opacity=".045"/>
<g opacity=".72">${posts.map(([x,y,end])=>`<rect x="${x-4}" y="${y}" width="8" height="${end-y}" rx="3" fill="url(#post)"/><ellipse cx="${x}" cy="${end}" rx="8" ry="2" fill="#496147" opacity=".09"/>`).join('')}</g>
<g filter="url(#softShadow)"><circle cx="970" cy="205" r="111" fill="none" stroke="url(#rim)" stroke-width="9"/><circle cx="970" cy="205" r="107" fill="none" stroke="#fcfffb" stroke-width="1.7"/><circle cx="970" cy="205" r="115" fill="none" stroke="#87998c" stroke-width="1" opacity=".5"/>
<g id="rotor">${Array.from({length:6},(_,i)=>`<g transform="rotate(${i*60} 970 205)"><rect x="966.5" y="103" width="7" height="78" rx="3" fill="url(#post)"/><circle cx="970" cy="107" r="15" fill="#fbfdfb25" stroke="url(#rim)" stroke-width="3"/><path d="M958 107Q970 123 982 107" fill="none" stroke="#eff5ef" stroke-width="1"/></g>`).join('')}</g>
<circle cx="970" cy="205" r="26" fill="url(#hub)" stroke="#869b8b" stroke-width="1"/><circle cx="970" cy="205" r="11" fill="url(#post)" stroke="#f2f7ef" stroke-width="2"/></g>
${sortMain.map((p,i)=>rail(`sort-main-${i}`,p,13)).join('')}
${sortWheel.map((p,i)=>rail(`sort-wheel-${i}`,p,13)).join('')}
${rail('main-route',mainPath,22)}
${rail('wheel-route',wheelPath,17)}
${feedPaths.map((p,i)=>rail(`feed-${i}`,p,18)).join('')}
${sourceX.map(x=>`<path d="M${x-9} 1V21M${x+9} 1V21" stroke="url(#post)" stroke-width="4" stroke-linecap="round"/><path d="M${x-5} 1H${x+5}" stroke="#6c8071" stroke-width="1" opacity=".3"/>`).join('')}
<g filter="url(#softShadow)"><rect x="90" y="379" width="1020" height="94" rx="29" fill="url(#glass)" stroke="url(#rim)" stroke-width="3"/><rect x="95" y="384" width="1010" height="83" rx="25" fill="none" stroke="#fff" stroke-width="2" opacity=".9"/><path d="M110 460Q95 460 95 444V414Q95 386 120 385H1080Q1105 386 1105 414V444Q1105 465 1080 466H120" fill="none" stroke="url(#base)" stroke-width="6"/>
${[350,600,850].map(x=>`<rect x="${x-4}" y="385" width="8" height="80" rx="4" fill="url(#partition)"/><path d="M${x-1} 390V460" stroke="#fff" stroke-width="1.6" opacity=".8"/>`).join('')}
<path d="M119 392H1080" stroke="#fff" stroke-width="2" opacity=".65"/><path d="M117 458H1080" stroke="#fff" stroke-width="1.5" opacity=".7"/></g>`;

const goalInfo={
 sleep:'Sleep matters in the whole plan. Raising it can remove caffeine. The evidence does not justify a routine sleep supplement for every healthy adult; magnesium and melatonin are not automatically added.',
 memory:'Creatine has an emerging memory signal, but results vary by population and dose. Memory alone does not add it here. When creatine is selected for strength, it stays one fixed dose.',
 focus:'Caffeine can improve attention acutely. It shares one 75 mg early-day portion with Energy, and yields to Sleep or Calm. Theanine research is promising for short-term tasks but does not establish a routine daily plan.',
 strength:'Creatine monohydrate can support strength-training adaptation and repeated high-intensity efforts. Priorities 2–5 select the same 3 g reference, with no loading dose. Benefits develop over weeks.',
 calm:'Calm changes the whole plan by discouraging caffeine. No supplement has sufficiently strong general daily evidence to be automatically added for this goal.',
 energy:'Energy means acute alertness here. It shares one caffeine portion with Focus; it does not add a second dose or treat persistent fatigue.'
};
let calculate,controller,supplementData,safetyData,plan,announceTimer;

function openDetail(button,title,html){
 if(detail.matches(':popover-open'))detail.hidePopover();
 detailOpener=button;button.setAttribute('aria-controls','detail');button.setAttribute('aria-expanded','true');
 detail.innerHTML=`<button class="close" aria-label="Close details">×</button><h2 id="detail-title">${title}</h2>${html}`;
 detail.querySelector('.close').addEventListener('click',()=>detail.hidePopover());
 detail.showPopover();
 const rect=button.getBoundingClientRect(),box=detail.getBoundingClientRect();
 const left=Math.min(window.innerWidth-box.width-14,Math.max(14,rect.left+rect.width/2-box.width/2));
 const top=rect.top>box.height+25?rect.top-box.height-12:Math.min(window.innerHeight-box.height-14,rect.bottom+12);
 detail.style.left=`${left}px`;detail.style.top=`${Math.max(14,top)}px`;
 detail.querySelector('.close').focus({preventScroll:true});
}
function fitLayout(){
 const installation=document.querySelector('.installation');
 if(innerWidth<=640){installation.style.width='100%';return;}
 const main=document.querySelector('main');
 const fixed=['.intro','.goals','.dosages','.plan-note'].reduce((sum,selector)=>sum+document.querySelector(selector).getBoundingClientRect().height,0);
 const available=Math.max(100,main.clientHeight-fixed-14);
 installation.style.width=`${Math.min(1120,innerWidth-80,available*2.4)}px`;
}
window.addEventListener('resize',()=>requestAnimationFrame(fitLayout));
function renderGoals(){
 document.querySelector('#goals').innerHTML=GOALS.map(g=>`<div class="goal" data-goal="${g}"><button class="goal-name" data-info="${g}" aria-label="Read evidence for ${names[g]}">${names[g]}</button><div class="battery" role="meter" aria-label="${names[g]} priority" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${priorities[g]}">${Array.from({length:5},(_,i)=>`<span class="segment ${i<priorities[g]?'on':''}"></span>`).join('')}</div><div class="priority-controls"><button class="stepper" data-goal="${g}" data-delta="-1" aria-label="Decrease ${names[g]} priority" ${priorities[g]===0?'disabled':''}>−</button><span class="level"><strong>${priorities[g]}</strong><span aria-hidden="true">/5</span></span><button class="stepper" data-goal="${g}" data-delta="1" aria-label="Increase ${names[g]} priority" ${priorities[g]===5?'disabled':''}>+</button></div></div>`).join('');
}
function update(changed){
 plan=calculate(priorities);controller.setPlan(plan);
 for(const g of GOALS){
  const root=document.querySelector(`.goal[data-goal="${g}"]`);
  root.querySelector('.battery').setAttribute('aria-valuenow',priorities[g]);
  root.querySelectorAll('.segment').forEach((segment,i)=>segment.classList.toggle('on',i<priorities[g]));
  root.querySelector('.level strong').textContent=priorities[g];
  root.querySelector('[data-delta="-1"]').disabled=priorities[g]===0;
  root.querySelector('[data-delta="1"]').disabled=priorities[g]===5;
  if(g===changed){root.classList.remove('changed');void root.offsetWidth;root.classList.add('changed');}
 }
 document.querySelector('#dosages').innerHTML=plan.entries.map(e=>`<div class="dosage" style="--color:${e.color}"><button class="dose-name" data-supplement="${e.id}" aria-label="View ${e.name} evidence and safety"><span class="color-key"></span>${e.name}</button><div class="dose-amount ${e.dose?'':'empty'}">${e.dose?`${formatAmount(e.dose,e.unit)}<small>${e.id==='creatine'?'/ day':'early day'}</small>`:(e.id==='theanine'?'Not routine':e.id==='magnesium'?'Not indicated':'Not selected')}</div><p class="ball-unit">${e.dose?`1 ball = ${e.ballQuantity} mg`:(e.id==='theanine'?'Short-term evidence':e.id==='magnesium'?'Intake not assessed':`1 ball = ${e.ballQuantity} mg`)}</p></div>`).join('');
 document.querySelector('#rationale').textContent=plan.rationale;
 fitLayout();
 clearTimeout(announceTimer);announceTimer=setTimeout(()=>{document.querySelector('#announcer').textContent=`${changed?names[changed]+' priority '+priorities[changed]+'. ':''}${plan.activeCount} reference options. ${plan.rationale}`;},220);
}
function showSupplement(button,id){
 const s=supplementData.supplements.find(s=>s.id===id),c=safetyData.constraints.find(c=>c.id===id);
 const active=plan.entries.find(e=>e.id===id).dose;
 const paragraphs={
 creatine:`<p>One purple ball represents ${s.ballQuantity} mg of creatine monohydrate. ${s.dailyReference/s.ballQuantity} balls make the fixed <strong>${formatAmount(s.dailyReference)} daily reference</strong> for ongoing strength training.</p><p>Memory effects are emerging and do not add a second dose. No loading phase is used; benefits take weeks.</p><p>There is no established upper limit. This planner’s ${formatAmount(c.plannerCap)} cap is a conservative choice. Kidney disease and medication use need professional review; water-weight gain and stomach upset can occur.</p>`,
 caffeine:`<p>One amber ball represents ${s.ballQuantity} mg. ${s.dailyReference/s.ballQuantity} make a single <strong>${formatAmount(s.dailyReference)} early-day portion</strong> for attention and alertness, only if those priorities outweigh Sleep and Calm.</p><p>Assumes no other caffeine and use at least 8 hours before bedtime. Timing and actual intake are not measured. Caffeine is optional; do not use bulk pure powder.</p><p>EFSA’s 200 mg single-dose and 400 mg daily assessment levels count <strong>all sources</strong> and are not targets or a guarantee. Sensitivity, pregnancy, conditions and medicines can change suitability.</p>`,
 theanine:`<p>Single-dose studies suggest a short-term attention benefit at 200 mg. They do not establish a long-term daily recommendation, so <strong>no balls are added</strong>.</p><p>Stress and anxiety evidence is mixed. No established upper limit exists. One coauthor of the 2026 review founded a supplement company; that conflict is recorded in the dataset.</p>`,
 magnesium:`<p>No routine magnesium dose is added for Sleep or Calm. General sleep evidence is small or conflicting, and a dietary shortfall has not been assessed.</p><p>Amounts refer to <strong>elemental magnesium</strong>. The US adult limit is 350 mg from supplements and medicines; the EU added-source limit is 250 mg. Natural food magnesium is excluded.</p><p>Kidney impairment increases toxicity risk. Magnesium can interfere with antibiotics and oral bisphosphonates. These interactions are recorded, not personally screened.</p>`
 };
 openDetail(button,s.name,`${paragraphs[id]}<div class="rule"></div>${s.sources.slice(0,2).map(source=>`<a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title}</a>`).join('')}<p class="meta">${active?'Reference option under the stated assumptions.':'Excluded from automatic daily selection.'}</p>`);
}
renderGoals();
document.querySelector('#goals').addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.info){openDetail(button,names[button.dataset.info],`<p>${goalInfo[button.dataset.info]}</p><p class="meta">Priorities are preferences, not a validated clinical score.</p>`);return;}
 const g=button.dataset.goal;if(!g||!calculate)return;
 priorities[g]=Math.max(0,Math.min(5,priorities[g]+Number(button.dataset.delta)));update(g);
});
document.querySelector('#dosages').addEventListener('click',event=>{const b=event.target.closest('[data-supplement]');if(b)showSupplement(b,b.dataset.supplement);});
document.querySelector('#evidence-button').addEventListener('click',event=>openDetail(event.currentTarget,'Evidence, with limits.',`<p>This is a conservative <strong>healthy-adult reference</strong>, not an individual prescription. It assumes no pregnancy, kidney disease, medicines, other supplements or caffeine.</p><p>Priorities select fixed effective amounts and resolve conflicts. They do not measure deficiency, establish personal safety or prove a blend is optimal. Sleep, Memory and Calm may have no qualifying supplement.</p><p>Caffeine is optional and at least 8 hours before bedtime. No actual intake or medication screen is performed. Check suitability before using the reference amounts.</p><div class="rule"></div><a href="data/supplements.json" target="_blank">Supplement evidence dataset</a><a href="data/safety.json" target="_blank">Safety dataset</a><p class="meta">Research reviewed 10 October 2026. Sources include NIH ODS, NCCIH, EFSA and peer-reviewed trial reviews.</p>`));
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
try {
 [supplementData,safetyData]=await Promise.all(['supplements','safety'].map(async name=>{
  const inline=document.getElementById(`${name}-data`);if(inline)return JSON.parse(inline.textContent);
  const response=await fetch(`data/${name}.json`);if(!response.ok)throw new Error('Research dataset unavailable');return response.json();
 }));
 calculate=createPlanner(supplementData,safetyData);
 controller=createSculpture({canvas:document.querySelector('#balls'),svg:sculpture,supplements:supplementData.supplements.slice(0,4),reducedMotion:reduced.matches});
 reduced.addEventListener('change',event=>controller.setReducedMotion(event.matches));
 update();
 window.equilibrium={getPlan:()=>structuredClone(plan),getPriorities:()=>({...priorities}),physics:controller,setPriorities:values=>{for(const g of GOALS){const n=Number(values[g]);if(Number.isFinite(n))priorities[g]=Math.max(0,Math.min(5,Math.floor(n)));}update();}};
}catch(error){console.error(error);document.querySelector('#rationale').textContent='The evidence data could not load. No plan is generated.';document.querySelectorAll('.stepper').forEach(b=>b.disabled=true);}
