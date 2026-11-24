import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRun,advance,offers,runOptions,stars} from '../docs/simulation.js';
import {emptySave,record,replay,sanitizeSave,stats} from '../docs/storage.js';
test('export/import preserves current run and deterministic future offers',()=>{
  let r=makeRun(500000);for(let i=0;i<4;i++)r=advance(r,runOptions(r)[0]);
  let d=emptySave();d.current=record(r);d.settings.sound=true;
  const restored=sanitizeSave(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(restored,d);assert.deepEqual(replay(restored.current).state,r.state);
  assert.deepEqual(runOptions(replay(restored.current)),runOptions(r));
});
test('complete run history derives statistics; developer games do not affect lifetime scores',()=>{
  let r=makeRun(123);for(let i=0;i<8;i++)r=advance(r,runOptions(r)[0]);r=advance(r,null);
  const e={...record(r,true),date:new Date(0).toISOString()};const d=emptySave();d.history=[e,{...e,assisted:true}];
  const clean=sanitizeSave(d),s=stats(clean.history);assert.equal(s.count,1);assert.equal(s.best,r.state.population);assert.equal(s.distribution[stars(r.state.population)],1);assert.equal(Object.values(s.frequency).reduce((a,b)=>a+b,0),8);
});
test('old version 3 saves retain original 120-rabbit rules after migration',()=>{
  let r=makeRun(234,'v3');for(let i=0;i<3;i++)r=advance(r,offers(r.state,r.deck)[0]);
  const old={version:3,settings:{sound:true},history:[],current:{seed:r.seed,choices:r.choices,complete:false,assisted:false}};
  const upgraded=sanitizeSave(old);assert.equal(upgraded.version,4);assert.equal(upgraded.current.mode,'v3');
  assert.deepEqual(replay(upgraded.current).state,r.state);assert.equal(replay(upgraded.current).history[0].population,120);
});
test('invalid seed, invalid choice, and an incomplete finale cannot be imported',()=>{
  const d=emptySave();d.current={seed:123,choices:[[10,1]]};assert.throws(()=>sanitizeSave(d));
  assert.throws(()=>replay({seed:-1,choices:[]}));assert.throws(()=>replay({seed:1,choices:[],complete:true}));
});
