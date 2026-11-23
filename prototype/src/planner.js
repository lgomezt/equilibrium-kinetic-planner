import supplementData from './data/supplements.json' with {type:'json'};
import safetyData from './data/safety.json' with {type:'json'};

export const GOALS=Object.freeze(['sleep','memory','focus','strength','calm','energy']);
const immutable=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(immutable);Object.freeze(value);}return value;};
export const CATALOG=immutable(supplementData.supplements);
export const SAFETY=immutable(safetyData);
const effectiveCap=(supplement,constraint)=>Math.min(supplement.cap,...[constraint?.plannerCap,constraint?.establishedUpperLimit,...(constraint?.additionalLimits??[]).map(l=>l.value)].filter(Number.isFinite));
export function isDoseAllowed(supplement,dose,constraint){
 return Number.isFinite(dose)&&dose>=0&&dose<=effectiveCap(supplement,constraint)&&dose%supplement.ballQuantity===0;
}
// Invented gameplay targets and weights, never clinical effect magnitudes.
const TARGET=[0,.7,1.7,2.7,3.7,4.7];
const title=g=>g[0].toUpperCase()+g.slice(1);
const caffeineAllowance=p=>[75,75,50,25,0,0][Math.max(p.sleep,p.calm)];
const freezeState=(priorities,counts,lastGoal=null)=>Object.freeze({priorities:Object.freeze(priorities),counts:Object.freeze(counts),lastGoal});

function normalize(priorities){
 const p={};
 for(const goal of GOALS){
  const level=priorities?.[goal]??0;
  if(!Number.isInteger(level)||level<0||level>5)throw new RangeError('Each priority must be an integer from 0 to 5.');
  p[goal]=level;
 }
 return p;
}

// All 72 allowed portions. Safety caps and discrete portions are structural:
// no score or goal priority can create a dose outside this catalog.
const candidates=[];
function enumerate(doses=[]){
 const index=doses.length;
 if(index<CATALOG.length){
  const supplement=CATALOG[index],constraint=SAFETY.constraints.find(c=>c.id===supplement.id);
  if(!constraint)throw new Error(`Missing safety constraint: ${supplement.id}`);
  for(const tier of supplement.tiers)if(isDoseAllowed(supplement,tier,constraint))enumerate([...doses,tier]);
  return;
 }
 const coverage=Object.fromEntries(GOALS.map(g=>[g,0]));
 let cost=0;
 doses.forEach((dose,i)=>{
  if(dose>CATALOG[i].cap||dose%CATALOG[i].ballQuantity)throw new Error('Invalid dose catalog.');
  const ratio=dose/CATALOG[i].cap;
  for(const b of CATALOG[i].benefits)coverage[b.goal]+=ratio*b.gameWeight;
  cost+=ratio*CATALOG[i].cost+(dose?0.1:0);
 });
 candidates.push({doses,counts:doses.map((d,i)=>d/CATALOG[i].ballQuantity),coverage,cost});
}
enumerate();
candidates.sort((a,b)=>a.cost-b.cost||a.doses.reduce((n,d,i)=>n+d/CATALOG[i].cap,0)-b.doses.reduce((n,d,i)=>n+d/CATALOG[i].cap,0));

function solve(priorities,current=null,direction=0){
 return candidates.find(candidate=>
  candidate.doses[1]<=caffeineAllowance(priorities)&&
  (!current||candidate.counts.every((n,i)=>direction>0?n>=current[i]:n<=current[i]))&&
  GOALS.every(goal=>candidate.coverage[goal]+1e-9>=TARGET[priorities[goal]])
 );
}

export function createGameState(priorities){
 const p=normalize(priorities),blend=solve(p);
 if(!blend)throw new RangeError('Incompatible priorities: no feasible blend under the caps and rest rules.');
 return freezeState(p,[...blend.counts]);
}

function blockedReason(state,goal,proposed){
 const resting=proposed.sleep>=proposed.calm?'sleep':'calm';
 if(state.counts[1]*CATALOG[1].ballQuantity>caffeineAllowance(proposed)){
  return `${title(goal)} is locked by the current caffeine. Lower Energy or Focus first to release those balls.`;
 }
 if(caffeineAllowance(proposed)<75&&['focus','energy'].includes(goal)){
  return `${title(goal)} needs more stimulant support than ${title(resting)} allows. Lower ${title(resting)} first.`;
 }
 return `${title(goal)} has reached this blend’s capped capacity. Lower another goal before adding more.`;
}

export function attemptChange(state,goal,delta){
 if(!GOALS.includes(goal))throw new RangeError('Unknown goal.');
 if(delta!==1&&delta!==-1)throw new RangeError('A priority step must be +1 or −1.');
 const level=state.priorities[goal]+delta;
 if(level<0||level>5)return {accepted:false,state,reason:level<0?'Already at zero.':'Already at maximum.'};
 const proposed={...state.priorities,[goal]:level};
 const blend=solve(proposed,state.counts,delta);
 if(!blend)return {accepted:false,state,reason:blockedReason(state,goal,proposed)};
 return {accepted:true,state:freezeState(proposed,[...blend.counts],goal),reason:''};
}

export function getControls(state){
 return Object.fromEntries(GOALS.map(goal=>{
  const increase=attemptChange(state,goal,1);
  return [goal,{canIncrease:increase.accepted,canDecrease:state.priorities[goal]>0,reason:increase.reason}];
 }));
}

export function toPlan(state){
 return CATALOG.map((supplement,bin)=>{
  const origin=state.lastGoal??supplement.benefits.reduce((best,b)=>state.priorities[b.goal]*(b.gameWeight)>state.priorities[best]*(supplement.benefits.find(v=>v.goal===best)?.gameWeight??0)?b.goal:best,supplement.benefits[0].goal);
  const safety=SAFETY.constraints.find(c=>c.id===supplement.id);
  return {...supplement,cap:effectiveCap(supplement,safety),bin,balls:state.counts[bin],dose:state.counts[bin]*supplement.ballQuantity,origin:GOALS.indexOf(origin),safety};
 });
}
