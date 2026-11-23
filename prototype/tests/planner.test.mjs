import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameState,attemptChange,getControls,toPlan,GOALS,isDoseAllowed} from '../src/planner.js';

const empty = {sleep:0,memory:0,focus:0,strength:0,calm:0,energy:0};
const raise = (state,goal,level) => {
 while(state.priorities[goal]<level){
  const result=attemptChange(state,goal,1);
  assert.equal(result.accepted,true,`${goal} should reach ${level}: ${result.reason}`);
  state=result.state;
 }
 return state;
};

test('a new game has zero of every supplement until the player increases a priority',()=>{
 const state=createGameState();
 assert.deepEqual(state.priorities,empty);
 assert.deepEqual(toPlan(state).map(({balls,dose})=>[balls,dose]),[[0,0],[0,0],[0,0],[0,0]]);
 const result=attemptChange(state,'strength',1);
 assert.equal(result.accepted,true);
 assert.ok(toPlan(result.state).find(p=>p.id==='creatine').balls>0);
});

test('a strength goal produces a complete creatine portion, not a multiplied priority dose',()=>{
 const state=raise(createGameState(empty),'strength',3);
 const entry=toPlan(state).find(p=>p.id==='creatine');
 assert.equal(entry.dose,3000);assert.equal(entry.balls,12);assert.equal(entry.ballQuantity,250);
});

test('max caffeine locks a contradictory Sleep increase and preserves exact state',()=>{
 const state=raise(raise(createGameState(empty),'energy',5),'sleep',1);
 assert.equal(toPlan(state).find(p=>p.id==='caffeine').dose,75);
 const before=JSON.stringify(state),result=attemptChange(state,'sleep',1);
 assert.equal(result.accepted,false);assert.strictEqual(result.state,state);
 assert.equal(JSON.stringify(state),before);assert.match(result.reason,/caffeine|stimulant/i);
 assert.equal(getControls(state).sleep.canIncrease,false);
});

test('reducing stimulant-driving goals unlocks Sleep without an automatic substitution',()=>{
 let state=raise(raise(createGameState(empty),'energy',5),'sleep',1);
 for(let i=0;i<5;i++)state=attemptChange(state,'energy',-1).state;
 assert.equal(toPlan(state).find(p=>p.id==='caffeine').dose,0);
 assert.equal(attemptChange(state,'sleep',1).accepted,true);
});

test('high Sleep can still reach Focus five using nonstimulant alternatives',()=>{
 const state=raise(raise(createGameState(empty),'sleep',5),'focus',5);
 const entries=toPlan(state);
 assert.equal(entries.find(p=>p.id==='caffeine').dose,0);
 assert.ok(entries.filter(p=>p.balls>0).length>=2);
 assert.equal(getControls(state).energy.canIncrease,true);
});

test('Calm also locks stimulant growth and every goal cannot be maxed together',()=>{
 const state=raise(createGameState(empty),'calm',5);
 assert.throws(()=>createGameState(Object.fromEntries(GOALS.map(g=>[g,5]))),/incompatible|feasible/i);
 let current=state;
 while(getControls(current).energy.canIncrease)current=attemptChange(current,'energy',1).state;
 assert.ok(current.priorities.energy<5);
 assert.match(getControls(current).energy.reason,/Calm|caffeine|stimulant/i);
});

test('shared creatine is counted once and survives reducing only one contributing goal',()=>{
 let state=raise(raise(createGameState(empty),'strength',3),'memory',3);
 assert.equal(toPlan(state).find(p=>p.id==='creatine').dose,3000);
 for(let i=0;i<3;i++)state=attemptChange(state,'strength',-1).state;
 assert.equal(toPlan(state).find(p=>p.id==='creatine').dose,3000);
 for(let i=0;i<3;i++)state=attemptChange(state,'memory',-1).state;
 assert.deepEqual(state.counts,[0,0,0,0]);
});

test('valid moves are monotone in the requested direction across many mixed sequences',()=>{
 let state=createGameState(),seed=41771,accepted=0,increases=0,decreases=0;
 for(let n=0;n<6000;n++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const goal=GOALS[seed%6],delta=(seed>>>7)%2?1:-1,before=JSON.stringify(state);
  const result=attemptChange(state,goal,delta);
  if(result.accepted){
   accepted++;if(delta>0)increases++;else decreases++;
   result.state.counts.forEach((count,i)=>assert.ok(delta>0?count>=state.counts[i]:count<=state.counts[i]));
   const doses=toPlan(result.state).map(p=>p.dose);
   assert.ok(doses[0]<=3000&&doses[1]<=75&&doses[2]<=200&&doses[3]<=200);
   assert.equal(result.state.priorities[goal],state.priorities[goal]+delta);
   state=result.state;
  }else{assert.strictEqual(result.state,state);assert.equal(JSON.stringify(state),before);}
 }
 assert.ok(accepted>100&&increases>50&&decreases>50,'Must exercise real accepted changes, not just rejection.');
});

test('bounds and malformed inputs cannot bypass caps or change priorities',()=>{
 const state=createGameState(empty);
 assert.equal(attemptChange(state,'sleep',-1).accepted,false);
 assert.throws(()=>attemptChange(state,'unknown',1),/goal/i);
 assert.throws(()=>attemptChange(state,'sleep',2),/step|delta/i);
 assert.throws(()=>createGameState({...empty,sleep:6}),/priority|0.*5/i);
 assert.throws(()=>createGameState({...empty,sleep:NaN}),/priority/i);
});

test('each goal has several ingredient routes and quantities retain supplement identity',()=>{
 const state=createGameState({sleep:5,memory:5,focus:5,strength:5,calm:5,energy:0});
 const plan=toPlan(state);
 for(const goal of GOALS)assert.ok(plan.filter(p=>p.benefits.some(b=>b.goal===goal)).length>=2,goal);
 assert.deepEqual(plan.map(p=>p.bin),[0,1,2,3]);
 assert.equal(new Set(plan.map(p=>p.color)).size,4);
 assert.equal(plan.find(p=>p.id==='magnesium').unit,'mg elemental');
});

test('independent safety limits veto otherwise allowed catalog portions',()=>{
 const supplement={cap:3000,ballQuantity:250};
 assert.equal(isDoseAllowed(supplement,3000,{plannerCap:1000,establishedUpperLimit:null}),false);
 assert.equal(isDoseAllowed(supplement,3000,{plannerCap:3000,establishedUpperLimit:2000}),false);
 assert.equal(isDoseAllowed({cap:300,ballQuantity:50},300,{plannerCap:300,establishedUpperLimit:350,additionalLimits:[{value:250}]}),false);
 assert.equal(isDoseAllowed({cap:300,ballQuantity:50},200,{plannerCap:300,establishedUpperLimit:350,additionalLimits:[{value:250}]}),true);
});
