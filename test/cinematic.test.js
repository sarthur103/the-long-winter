import test from 'node:test';
import assert from 'node:assert/strict';
import {advance,makeRun,runOptions,LEVEL,ROUND_NAMES} from '../docs/simulation.js';
import {makeOpening,makeGeneration,filmDuration,filmFrame,drawFilm} from '../docs/cinematic.js';

const run=makeRun(500000);
const choice=runOptions(run)[0],after=advance(run,choice).state;
const opening=makeOpening({state:run.state,seed:run.seed});
const generation=(before=run.state,next=after,weather=LEVEL[0],selected=choice)=>makeGeneration({before,after:next,weather,period:ROUND_NAMES[before.turn],choice:selected,choiceLabel:'An adaptation',seed:run.seed});

test('opening is a short ordered film with three distinct shots',()=>{
  assert.ok(filmDuration(opening)<6500);
  assert.deepEqual(opening.shots.map(s=>s.kind),['valley','forage','watch']);
  assert.match(opening.shots[0].copy,/One hundred rabbits/);
  assert.equal(filmFrame(opening,-10).phase,0);
  assert.equal(filmFrame(opening,2200).index,1);
  assert.equal(filmFrame(opening,100000).done,true);
  assert.equal(filmFrame(opening,100000).phase,1);
});
test('generation follows the forecast and shows the actual trait change without affecting saved state',()=>{
  const f=generation(),saved=structuredClone(run);
  assert.deepEqual(f.shots.map(s=>s.kind),['forage','chase','warren']);
  assert.equal(f.shots[2].copy,ROUND_NAMES[0]+' · 20 → '+after.traits[choice[0]]+' / 40 this generation.');
  assert.ok(f.shots.every(s=>s.env===LEVEL[0]));
  assert.equal(filmFrame(f,3700).index,1);
  assert.deepEqual(run,saved);
});
test('cinematic frames draw with finite coordinates at each cut, including snow, finale, and extinction',()=>{
  const canvas={width:768,height:500,getContext:()=>ctx};
  let coords=0;
  const ctx=new Proxy({},{
    get(target,key){
      if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>({addColorStop(){}});
      if(key in target)return target[key];
      return (...args)=>{for(const v of args)if(typeof v==='number'){assert.ok(Number.isFinite(v));coords++}};
    },set(target,key,value){target[key]=value;return true}
  });
  const zero={...after,population:0};
  const finale={...after,turn:9};
  for(const f of [opening,generation(),generation(run.state,after,LEVEL[5]),generation(run.state,zero),generation(zero,zero,LEVEL[5]),generation({...run.state,turn:8},finale,LEVEL[8],null)]){
    const duration=filmDuration(f);
    for(let t=0;t<=duration;t+=220)drawFilm(canvas,f,filmFrame(f,t));
    drawFilm(canvas,f,filmFrame(f,duration),{still:true});
  }
  assert.ok(coords>1000);
});
