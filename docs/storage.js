import {makeRun,advance,stars,label} from './simulation.js';
export const KEY='the-long-winter-v3';
export const emptySave=()=>({version:3,settings:{reducedMotion:false,sound:false,haptics:true,dev:false},current:null,history:[]});
export function replay(entry){
  if(!entry||!Number.isSafeInteger(entry.seed)||entry.seed<0||entry.seed>2147483647||!Array.isArray(entry.choices)||entry.choices.length>8)throw Error('Invalid replay');
  let r=makeRun(entry.seed);for(const a of entry.choices)r=advance(r,a);
  if(entry.complete){if(r.state.turn!==8)throw Error('Incomplete finale');r=advance(r,null)}
  return {...r,assisted:!!entry.assisted};
}
export const record=(r,complete=false)=>({seed:r.seed,choices:r.choices.map(a=>[...a]),complete,assisted:!!r.assisted});
export function sanitizeSave(raw){
  if(raw?.version!==3||!Array.isArray(raw.history))throw Error('This is not a V3 save file');
  const d=emptySave();
  for(const k of Object.keys(d.settings))if(typeof raw.settings?.[k]==='boolean')d.settings[k]=raw.settings[k];
  if(raw.current){const r=replay({...raw.current,complete:false});d.current=record(r)}
  d.history=raw.history.map(e=>{const r=replay({...e,complete:true});return {...record(r,true),date:Number.isFinite(Date.parse(e.date))?new Date(e.date).toISOString():new Date(0).toISOString()}});
  return d;
}
export function stats(history){
  const items=history.filter(e=>!e.assisted).map(replay),count=items.length;
  const final=items.map(r=>r.state.population);
  const frequency={};
  for(const r of items)for(const choice of r.choices){const k=label(choice);frequency[k]=(frequency[k]||0)+1}
  return {count,wins:final.filter(p=>stars(p)>0).length,extinctions:final.filter(p=>p===0).length,highest:items.reduce((v,r)=>Math.max(v,...r.history.map(s=>s.population)),0),best:final.reduce((v,p)=>Math.max(v,p),0),average:count?final.reduce((a,b)=>a+b,0)/count:0,distribution:[0,1,2,3].map(n=>final.filter(p=>stars(p)===n).length),frequency};
}
