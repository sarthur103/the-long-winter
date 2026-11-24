import {makeRun,advance,baseline,offers,stars,choose,label,TRAITS,RATES,THRESHOLDS,LEVEL,SCORE_NAMES,ROUND_NAMES} from './simulation.js';
import {KEY,emptySave,sanitizeSave,replay,record,stats} from './storage.js';
import {drawScene} from './scene.js';
const $=s=>document.querySelector(s),el=id=>document.getElementById(id);
const traitInfo=[
 ['Fur','❆','Thicker fur','Thinner fur','Better insulation; extra bulk makes escape slightly harder.','Less bulk; reduced insulation in cold weather.'],
 ['Ears','◔','Larger ears','Smaller ears','Help release heat, but increase cold exposure.','Reduce cold exposure, but release less heat.'],
 ['Body size','●','Larger body','Smaller body','Retains heat better; raises energy demand and predator vulnerability.','Requires less maintenance; loses heat faster.'],
 ['Leg length','↟','Longer legs','Shorter legs','Better escape and intake, at an energy cost.','Lower energy demand; weaker escape performance.'],
 ['Coat color','◐','Lighter coat','Darker coat','Blends into snow; stands out on bare ground.','Blends into bare ground; stands out in snow.'],
 ['Burrowing','⌂','More burrowing','Less burrowing','More shelter from cold and predators; costs energy and limits foraging.','More time to forage; less shelter from weather and predators.'],
 ['Foraging','♣','More foraging','Less foraging','Increases food intake but also predator exposure.','Less exposure, but reduced food intake.'],
 ['Fat storage','◉','Greater fat storage','Lower fat storage','Larger energy reserves buffer shortfalls; carrying fat can reduce escape.','Less potential stored energy to buffer shortages.'],
 ['Vigilance','◈','More vigilance','Less vigilance','Improves predator avoidance; leaves less time to forage.','More time to forage, at increased predator risk.'],
 ['Reproduction','✦','More reproduction','Less reproduction','Higher reproductive potential, provided energy permits it.','Conserves energy at the cost of potential births.']
];
const choiceName=([i,d])=>traitInfo[i][d>0?2:3];
const starText=n=>'★'.repeat(n)+'☆'.repeat(3-n);
let data=emptySave(),storageOK=true,run=null,screen='home',toastTimer,audioContext;
try {const raw=localStorage.getItem(KEY);if(raw)data=sanitizeSave(JSON.parse(raw))}
catch(e){storageOK=false;console.warn('Save unavailable',e)}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(data));storageOK=true}catch(e){storageOK=false;console.warn(e)}
  el('saveStatus').textContent=storageOK?'Saved automatically on this device.':'Storage unavailable — export a backup from settings.'};
function toast(message){const t=el('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600)}
function show(id){screen=id;document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));if(id==='home')renderHome();if(id==='game')renderGame();window.scrollTo(0,0);paint()}
function feedback(){
  if(data.settings.haptics&&navigator.vibrate)navigator.vibrate(20);
  if(!data.settings.sound)return;
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audioContext ||=new Audio();audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain(),now=audioContext.currentTime;o.frequency.setValueAtTime(390,now);o.frequency.exponentialRampToValueAtTime(540,now+.12);g.gain.setValueAtTime(.035,now);g.gain.exponentialRampToValueAtTime(.0001,now+.18);o.connect(g).connect(audioContext.destination);o.start();o.stop(now+.19)}catch{}
}
function renderHome(){
  const s=stats(data.history);
  const boxes=[['Winters completed',s.count],['Wins (≥30 rabbits)',s.wins],['Extinctions',s.extinctions],['Best final colony',s.best||'—'],['Peak colony size',s.highest||'—'],['Average final colony',s.count?s.average.toFixed(1):'—']];
  el('lifetime').innerHTML=boxes.map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('');
  const summary=s.distribution.map((n,i)=>i+'★: '+n).join(' · ');
  el('historyList').innerHTML='<p class="hint left">Star record: '+summary+'</p>';
  if(Object.keys(s.frequency).length){const most=Object.entries(s.frequency).sort((a,b)=>b[1]-a[1]);el('historyList').innerHTML+='<details><summary>Adaptation selection counts</summary>'+most.map(([k,n])=>'<div class="history-row"><span>'+k+'</span><b>'+n+'</b></div>').join('')+'</details>'}
  for(const h of data.history.slice().reverse()){
    const r=replay(h),row=document.createElement('div');row.className='history-row';const d=new Date(h.date).toLocaleDateString();row.textContent=d+' · '+r.state.population+' rabbits · '+starText(stars(r.state.population))+(h.assisted?' · Dev':'');el('historyList').append(row);
  }
  el('resumeRun').hidden=!data.current;el('newRun').textContent=data.current?'Start a different winter':'Begin winter';
  if(data.current){el('resumeRun').textContent='Resume winter · '+(data.current.choices.length===8?'Finale':'Round '+(data.current.choices.length+1))}
}
function renderGame(){
  if(!run)return;
  const s=run.state,t=s.turn,env=LEVEL[t],prev=run.history[t-1],ready=t===8;
  el('roundLabel').textContent=ready?'Finale · 9th period':'Round '+(t+1)+' of 8';
  el('starLine').textContent=starText(stars(s.population))+' · final target 30 / 48 / 58';
  el('progress').innerHTML=Array.from({length:9},(_,i)=>'<i class="'+(i<t?'done':i===t?'current':'')+'"></i>').join('');
  el('season').textContent=t?ROUND_NAMES[t-1]:'Before winter';el('population').textContent=s.population;
  el('change').textContent=prev?'+'+s.detail[0]+' born · −'+s.detail[1]+' lost':'120 founder rabbits';
  el('forecastTitle').textContent=ROUND_NAMES[t];
  el('forecast').innerHTML=[['Temperature',env[0]+'°F'],['Food supply',Math.round(env[1]*100)+'%'],['Predator pressure',Math.round(env[2]*100)+'%']].map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('');
  el('forecastTable').innerHTML='<table><thead><tr><th>Period</th><th>Temp.</th><th>Food</th><th>Risk</th></tr></thead><tbody>'+LEVEL.map((e,i)=>'<tr class="'+(i===t?'now':'')+'"><td>'+(i+1)+' · '+ROUND_NAMES[i]+'</td><td>'+e[0]+'°</td><td>'+Math.round(e[1]*100)+'%</td><td>'+Math.round(e[2]*100)+'%</td></tr>').join('')+'</tbody></table>';
  el('dashboard').innerHTML=SCORE_NAMES.map((name,i)=>{const n=Math.round(s.scores[i]);return '<div class="metric"><div class="metric-top"><span>'+name+'</span><b>'+n+'%</b></div><div class="meter" aria-label="'+name+' '+n+'%"><span style="width:'+n+'%;background:'+(n<45?'#e59b86':n<75?'#e9bf83':'#b8d6b5')+'"></span></div></div>'}).join('');
  el('stock').innerHTML='<b><span>Food stock </span>'+s.food.toFixed(2)+'</b><b><span>Stored energy </span>'+s.reserve.toFixed(2)+'</b>';
  el('decisionHeading').textContent=ready?'Let winter end':'Choose an adaptation';el('decisionKicker').textContent=ready?'NO NEW CHOICE':'ONE OF TWO';
  el('decisionText').textContent=ready?'Your last adaptation completes its development. The final spring weather determines your star rating.':'Your chosen trait develops over this period and the next. Repeated changes develop more slowly.';
  const choices=el('choices');choices.replaceChildren();
  if(ready){const b=document.createElement('button');b.className='primary';b.textContent='Enter spring finale';b.onclick=()=>take(null);choices.append(b)}
  else for(const a of offers(s,run.deck)){
    const [i,d]=a,info=traitInfo[i],rate=RATES[Math.min(s.counts[2*i+(d>0?1:0)],3)],b=document.createElement('button');b.className='choice';
    b.innerHTML='<span class="trait-icon">'+info[1]+'</span><span><span class="category">'+(i<5?'PHYSICAL':'BEHAVIORAL')+' · '+(d>0?'+':'−')+(rate*2)+' potential</span><b>'+choiceName(a)+'</b><small>'+info[d>0?4:5]+'</small></span>';
    b.onclick=()=>take(a);choices.append(b);
  }
  el('activeCount').textContent=s.active.length?s.active.length+' developing':'';
  el('traits').innerHTML=traitInfo.map((a,i)=>{const active=s.active.find(v=>v[0]===i);return '<div class="trait-item'+(active?' active':'')+'">'+a[0]+' <b>'+s.traits[i]+'/40</b>'+(active?'<small>'+choiceName(active)+' · 1 period left</small>':'')+'</div>'}).join('');
  el('developer').hidden=!data.settings.dev;el('greedy').disabled=ready;el('lookahead').disabled=ready;
  const dev=el('devData');dev.className='dev-data';dev.textContent='Seed '+run.seed+' · Turn '+t+'\n'+JSON.stringify({traits:s.traits,active:s.active,detail:s.detail.map(x=>Number(x.toFixed(4)))},null,1);
  el('saveStatus').textContent=storageOK?'Saved automatically on this device.':'Storage unavailable — export a backup from settings.';
}
function begin(seed,assisted=false){
  if(data.current&&!confirm('Replace the winter you have in progress?'))return;
  run={...makeRun(seed),assisted};data.current=record(run);save();feedback();show('game');
}
function take(a){
  if(!run||run.state.turn>=9)return;try{
  run=advance(run,a);feedback();
  if(run.state.turn===9){
    const h={...record(run,true),date:new Date().toISOString()};data.history.push(h);data.current=null;save();renderFinal();show('finale');
  }else{data.current=record(run);save();renderGame();paint();toast('Generation '+run.state.turn+' complete.')}
  }catch(e){toast(e.message)}
}
function renderFinal(){
  const s=run.state,n=stars(s.population),peak=Math.max(...run.history.map(a=>a.population));
  el('finaleStars').textContent=starText(n);
  el('finaleTitle').textContent=n===3?'Winter mastered.':n===2?'A thriving colony.':n===1?'Spring is yours.':s.population?'Too few remain.':'The colony is lost.';
  el('finaleCopy').textContent=s.population+' rabbits reach spring. '+(n===3?'Your colony exceeded the mastery threshold.':n?'A viable colony has earned '+n+' star'+(n===1?'':'s')+'.':'A viable colony needs at least 30 rabbits. Try another path.');
  el('runSummary').innerHTML=[['Final population',s.population],['Peak population',peak],['Stars',n+' / 3'],['Starting rabbits',120]].map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('');
  const chart=el('populationChart'),max=Math.max(160,peak),points=run.history.map((a,i)=>[13+i*32.4,106-a.population/max*94]),line=points.map(p=>p.join(',')).join(' ');
  chart.innerHTML=[0,30,58,120].map(v=>'<line x1="13" y1="'+(106-v/max*94)+'" x2="305" y2="'+(106-v/max*94)+'" stroke="#638087" stroke-width=".6" stroke-dasharray="3 4"/>').join('')+'<polygon points="13,106 '+line+' 305,106" fill="#8eb7a328"/><polyline points="'+line+'" fill="none" stroke="#c4e0ba" stroke-width="2.5"/>'+points.map(([x,y],i)=>'<circle cx="'+x+'" cy="'+y+'" r="3" fill="#edbd79"/><text x="'+x+'" y="121" text-anchor="middle" font-size="8" fill="#b6cecd">'+i+'</text>').join('');
  el('finalChoices').innerHTML=run.choices.map((a,i)=>'<div class="choice-history"><span>Round '+(i+1)+'</span><b>'+choiceName(a)+'</b></div>').join('');
}
function paint(time=0){
  if(screen==='home')drawScene(el('homeCanvas'),baseline(),[65,1.17,.16,.08],data.settings.reducedMotion?0:time);
  if(screen==='game'&&run)drawScene(el('gameCanvas'),run.state,run.state.turn?LEVEL[run.state.turn-1]:LEVEL[0],data.settings.reducedMotion?0:time);
}
let previous=0;function animation(now){if(!document.hidden&&!data.settings.reducedMotion&&now-previous>32){previous=now;paint(now)}requestAnimationFrame(animation)}requestAnimationFrame(animation);
function syncSettings(){for(const [id,key] of [['reducedMotion','reducedMotion'],['sound','sound'],['haptics','haptics'],['devMode','dev']])el(id).checked=data.settings[key];el('devPanel').hidden=!data.settings.dev}
for(const [id,key] of [['reducedMotion','reducedMotion'],['sound','sound'],['haptics','haptics'],['devMode','dev']])el(id).onchange=e=>{data.settings[key]=e.target.checked;save();syncSettings();if(screen==='game')renderGame();paint()};
el('newRun').onclick=()=>begin();el('resumeRun').onclick=()=>{run=replay(data.current);show('game')};el('homeButton').onclick=()=>show('home');el('playAgain').onclick=()=>begin();el('backHome').onclick=()=>show('home');el('settingsButton').onclick=()=>{syncSettings();el('settings').showModal()};
el('seedStart').onclick=()=>{const n=Number(el('seed').value);if(!el('seed').value||!Number.isSafeInteger(n)||n<0||n>2147483647){toast('Enter a valid seed from 0 to 2147483647.');return}el('settings').close();begin(n,true)};
for(const p of ['greedy','lookahead'])el(p).onclick=()=>{if(run&&run.state.turn<8){run.assisted=true;take(choose(run.state,offers(run.state,run.deck),p))}};
el('resetSave').onclick=()=>{if(confirm('Erase all saved winters, history and settings from this device?')){data=emptySave();run=null;save();syncSettings();el('settings').close();show('home');toast('Local data erased.')}};
el('exportSave').onclick=()=>{const file=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(file);a.download='long-winter-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
el('importSave').onclick=()=>el('saveFile').click();el('saveFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const newSave=sanitizeSave(JSON.parse(await f.text()));if(!confirm('Replace your local history and current winter with this backup?'))return;data=newSave;run=null;save();syncSettings();el('settings').close();show('home');toast('Backup imported.')}catch(err){toast('Could not import: '+err.message)}finally{e.target.value=''}};
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);
if(matchMedia('(prefers-reduced-motion: reduce)').matches&&!data.current&&!data.history.length)data.settings.reducedMotion=true;
syncSettings();renderHome();paint();
