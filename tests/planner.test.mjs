import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlanner} from '../dist/planner.js';
const supplements=JSON.parse(readFileSync(new URL('../dist/data/supplements.json',import.meta.url)));
const safety=JSON.parse(readFileSync(new URL('../dist/data/safety.json',import.meta.url)));
const calculate=createPlanner(supplements,safety);
const dose=(p,id)=>p.entries.find(e=>e.id===id).dose;
test('Strength chooses an effective fixed 3g, independent of priority magnitude',()=>{
 for(let strength=2;strength<=5;strength++) assert.equal(dose(calculate({strength}),'creatine'),3000);
 assert.equal(dose(calculate({strength:1}),'creatine'),0);
});
test('overlapping attention and alertness share one 75mg caffeine portion',()=>{
 const plan=calculate({focus:5,energy:5});
 assert.equal(dose(plan,'caffeine'),75);
 assert.deepEqual(plan.entries.find(e=>e.id==='caffeine').goals,['focus','energy']);
 assert.equal(plan.entries.find(e=>e.id==='caffeine').balls,3);
});
test('Sleep and Calm veto caffeine across the whole combination',()=>{
 assert.equal(dose(calculate({focus:3,sleep:3,strength:4}),'caffeine'),0);
 assert.equal(dose(calculate({focus:5,sleep:4}),'caffeine'),0);
 assert.equal(dose(calculate({energy:5,calm:4}),'caffeine'),0);
 assert.equal(dose(calculate({focus:4,sleep:2}),'caffeine'),75);
 assert.equal(dose(calculate({focus:4,sleep:4,strength:3}),'creatine'),3000);
});
test('goals without general evidence do not manufacture recommendations',()=>{
 const plan=calculate({sleep:5,memory:5,calm:5});
 assert.ok(plan.entries.every(e=>e.dose===0));
 assert.ok(plan.uncovered.includes('memory'));
 for(const p of [calculate({focus:5}),calculate({strength:5})]){
  assert.equal(dose(p,'magnesium'),0);assert.equal(dose(p,'theanine'),0);
 }
});
test('contraindication or unmeasured additional intake fails closed',()=>{
 for(const context of [{pregnant:true},{medications:true},{kidneyDisease:true},{otherCaffeineMg:1},{otherSupplements:true}])
  assert.ok(calculate({strength:5,focus:5},context).entries.every(e=>e.dose===0));
});
test('invalid priorities normalize to integer levels from zero to five',()=>{
 const p=calculate({strength:Infinity,focus:-20,energy:'5',sleep:NaN,calm:2.9});
 assert.equal(p.priorities.strength,0);assert.equal(p.priorities.focus,0);
 assert.equal(p.priorities.energy,5);assert.equal(p.priorities.calm,2);
});
test('all 46656 combinations respect planner caps, effective minima and exact ball quantities',()=>{
 for(let n=0;n<46656;n++){
  let x=n;const input={};for(const goal of ['sleep','memory','focus','strength','calm','energy']){input[goal]=x%6;x=Math.floor(x/6);}
  const p=calculate(input);
  for(const e of p.entries){
   const cap=safety.constraints.find(s=>s.id===e.id).plannerCap;
   assert.ok(e.dose<=cap);assert.equal(e.balls*e.ballQuantity,e.dose);
   assert.ok(Number.isInteger(e.balls));
   if(e.id==='creatine'&&e.dose)assert.equal(e.dose,3000);
   if(e.id==='caffeine'&&e.dose)assert.equal(e.dose,75);
  }
 }
});
test('caps are read from the safety dataset and a reduced cap withholds an ineffective partial dose',()=>{
 const lower=structuredClone(safety);lower.constraints.find(x=>x.id==='creatine').plannerCap=2500;
 const limited=createPlanner(supplements,lower);
 assert.equal(dose(limited({strength:5}),'creatine'),0);
});
