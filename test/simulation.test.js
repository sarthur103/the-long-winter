import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEVEL,THRESHOLDS,TRAITS,stars,label,baseline,step,play,tree,makeDeck,offers,makeRun,advance} from '../docs/simulation.js';
const ref=JSON.parse(readFileSync(new URL('../reference/rabbit_v3_results.json',import.meta.url),'utf8'));
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-9,`${message}: ${actual} != ${expected}`);
const average=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const sorted=xs=>[...xs].sort((a,b)=>a-b);
const median=xs=>{const a=sorted(xs),n=a.length;return n%2?a[n>>1]:(a[n/2-1]+a[n/2])/2};
const quantile=(xs,p)=>sorted(xs)[Math.round((xs.length-1)*p)];
test('level and star thresholds match the V3 reference',()=>{assert.deepEqual(LEVEL,ref.level);assert.deepEqual(THRESHOLDS,ref.thresholds)});
test('exact seed replay: all ten populations, choices, and 40 safety scores',()=>{
  const {states,choices}=play(ref.validation_seed_start,'lookahead');
  for(const row of ref.sample_run){
    const s=states[row.turn];assert.equal(s.population,row.population);
    assert.equal(row.turn>0&&row.turn<9?label(choices[row.turn-1]):null,row.choice);
    s.scores.forEach((v,i)=>close(v,row.scores[i],`turn ${row.turn} score ${i}`));
  }
  assert.equal(states[9].active.length,0);
});
test('all 15,000 reference policy runs and every reported statistic',()=>{
  const n=ref.runs_per_policy;
  for(const [policy,expected] of Object.entries(ref.policies)){
    const runs=Array.from({length:n},(_,i)=>play(ref.validation_seed_start+i,policy));
    const pops=runs.map(r=>r.states[9].population);
    const actual={mean:average(pops),median:median(pops),p10:quantile(pops,.1),p90:quantile(pops,.9),min:Math.min(...pops),max:Math.max(...pops),extinction_pct:100*pops.filter(x=>x===0).length/n,
      fail_pct:THRESHOLDS.map(t=>100*pops.filter(x=>x<t).length/n),exact_stars_pct:[0,1,2,3].map(k=>100*pops.filter(x=>stars(x)===k).length/n),
      mean_pop_by_turn:Array.from({length:10},(_,t)=>average(runs.map(r=>r.states[t].population))),
      mean_selection_counts:Object.fromEntries(TRAITS.flatMap((_,i)=>[-1,1].map(d=>[label([i,d]),runs.reduce((sum,r)=>sum+r.choices.filter(a=>a[0]===i&&a[1]===d).length,0)/n])))};
    for(const [key,exp] of Object.entries(expected)){
      const act=actual[key];
      if(typeof exp==='number')close(act,exp,`${policy} ${key}`);
      else for(const [k,v] of Object.entries(exp))close(act[k],v,`${policy} ${key} ${k}`);
    }
  }
});
test('400-seed full decision tree: all 102,400 outcomes and aggregate metrics',()=>{
  const n=ref.tree.seeds,trees=Array.from({length:n},(_,i)=>tree(baseline(),makeDeck(ref.tree_seed_start+i)));
  const best=trees.map(t=>Math.max(...t)),worst=trees.map(t=>Math.min(...t));
  const actual={seeds:n,paths:trees.reduce((s,t)=>s+t.length,0),impossible_pct:THRESHOLDS.map(t=>100*best.filter(p=>p<t).length/n),all_paths_pass_pct:THRESHOLDS.map(t=>100*worst.filter(p=>p>=t).length/n),seeds_with_extinction_pct:100*worst.filter(p=>p===0).length/n,worst_best_population:Math.min(...best),median_best_population:median(best),median_worst_population:median(worst)};
  assert.deepEqual(actual,ref.tree);
});
test('choices are grouped, blocked while developing, deterministic after JSON resume, and finale adds no choice',()=>{
  let r=makeRun(123);for(let i=0;i<8;i++){
    const [a,b]=offers(r.state,r.deck);assert.ok(a[0]<5&&b[0]>=5);assert.ok(!r.state.active.some(x=>x[0]===a[0]||x[0]===b[0]));
    const n=advance(r,a);assert.deepEqual(n,advance(JSON.parse(JSON.stringify(r)),a));r=n;
  }
  assert.equal(r.choices.length,8);assert.equal(r.state.turn,8);r=advance(r,null);assert.equal(r.state.turn,9);assert.equal(r.state.active.length,0);
  assert.equal(step({...baseline(),population:0}).population,0);
});
