export const GOALS = ['sleep','memory','focus','strength','calm','energy'];
const DISPLAY_IDS = ['creatine','caffeine','theanine','magnesium'];

export function createPlanner(supplementData, safetyData) {
  const compounds = DISPLAY_IDS.map(id => supplementData.supplements.find(s=>s.id===id));
  if(compounds.some(s=>!s)) throw new Error('Supplement evidence is incomplete.');
  const constraints = new Map(safetyData.constraints.map(c=>[c.id,c]));
  for(const s of compounds) {
    const c=constraints.get(s.id);
    if(!c || !Number.isFinite(c.plannerCap) || c.plannerCap<0 || !Number.isFinite(s.ballQuantity) || s.ballQuantity<=0)
      throw new Error('Dose constraints are incomplete.');
  }
  return function calculatePlan(input={}, context={}) {
    const priorities=Object.fromEntries(GOALS.map(goal=>{
      const value=Number(input?.[goal]);
      return [goal, Number.isFinite(value)?Math.max(0,Math.min(5,Math.floor(value))):0];
    }));
    const p=priorities;
    const blocked=!!(context.pregnant||context.breastfeeding||context.medications||context.kidneyDisease||context.otherSupplements||Number(context.otherCaffeineMg)>0);
    const attention=Math.max(p.focus,p.energy);
    const conflict=p.sleep>=4||p.calm>=4||p.sleep>=attention||p.calm>=attention;
    const request={creatine:!blocked&&p.strength>=2,caffeine:!blocked&&attention>=2&&!conflict};
    const entries=compounds.map((s,bin)=>{
      const c=constraints.get(s.id);
      // Only a whole effective reference dose may be emitted. A lower cap means abstention.
      const reference=s.dailyReference;
      const selected=!!(request[s.id]&&s.automatic&&Number.isFinite(reference)&&reference>0&&reference<=c.plannerCap&&reference%s.ballQuantity===0&&(!c.establishedUpperLimit||reference<=c.establishedUpperLimit)&&(!c.effectiveMinimum||reference>=c.effectiveMinimum));
      const dose=selected?reference:0;
      const goals=selected?(s.id==='creatine'?['strength']:['focus','energy'].filter(g=>p[g]>=2)):[];
      const origin=s.id==='creatine'?3:(p.focus>=p.energy?2:5);
      return {id:s.id,name:s.name,color:s.color,bin,unit:s.unit,ballQuantity:s.ballQuantity,dose,balls:dose/s.ballQuantity,origin,goals};
    });
    const covered=new Set(entries.flatMap(e=>e.goals));
    const uncovered=GOALS.filter(g=>p[g]>0&&!covered.has(g));
    const active=entries.filter(e=>e.dose>0);
    let rationale='Choose what matters. A smaller plan can be the right plan.';
    if(blocked) rationale='These reference assumptions do not apply. No supplement is selected.';
    else if(attention>=2&&conflict) rationale='Sleep and calm take precedence. Caffeine is left out.';
    else if(entries[1].dose&&p.focus>=2&&p.energy>=2) rationale='Focus and energy share one caffeine portion. No doubled dose.';
    else if(active.length) rationale='Effective amounts stay fixed. More priority does not mean more dose.';
    else if(p.memory) rationale='Memory evidence is still emerging. No supplement is added for memory alone.';
    else if(p.sleep||p.calm) rationale='No routine sleep or calm supplement meets this evidence threshold.';
    return {entries,priorities,uncovered,rationale,activeCount:active.length,referenceOnly:true,assumptionsVerified:false};
  };
}
