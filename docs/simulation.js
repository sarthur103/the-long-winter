// V3 mechanics and reference replay, with the revised player rules layered on top.
export const TRAITS=['fur','ears','body','legs','coat','burrow','forage','fat','vigilance','reproduction'];
export const RATES=[3,2,1,.5], THRESHOLDS=[30,48,58];
export const GAME_START_POPULATION=100;
export const LEVEL=[[65,1.17,.16,0],[62,1.08,.20,0],[50,.92,.29,.12],[28,.70,.40,.55],[5,.50,.52,.90],[8,.48,.55,.95],[22,.63,.47,.75],[35,.88,.32,.35],[44,1.04,.23,.08]];
export const SCORE_NAMES=['Temperature','Energy','Predators','Reproduction'];
export const ROUND_NAMES=['Late summer','Autumn arrives','First chill','First snowfall','Deep freeze','The long night','Winter loosens','Early thaw','Spring finale'];
export const clamp=(x,lo=0,hi=1)=>Math.max(lo,Math.min(hi,x));
export const stars=pop=>THRESHOLDS.filter(t=>pop>=t).length;
export const label=([i,d])=>(d>0?'+':'-')+TRAITS[i];

// Python random.Random integer seeding, MT19937, and getrandbits-based
// randbelow. Matching Python's shuffle and choice makes seed replay exact.
export class PythonRandom {
  constructor(seed) {
    if (!Number.isSafeInteger(seed)) throw new RangeError('Seed must be a safe integer');
    const key=[]; let k=BigInt(Math.abs(seed));
    do { key.push(Number(k & 0xffffffffn)); k >>= 32n; } while(k);
    this.mt=new Uint32Array(624);this.mt[0]=19650218;
    for(let i=1;i<624;i++)this.mt[i]=(Math.imul(1812433253,this.mt[i-1]^(this.mt[i-1]>>>30))+i)>>>0;
    let i=1,j=0;
    for(let n=Math.max(624,key.length);n>0;n--){
      this.mt[i]=((this.mt[i]^Math.imul(this.mt[i-1]^(this.mt[i-1]>>>30),1664525))+key[j]+j)>>>0;
      if(++i>=624){this.mt[0]=this.mt[623];i=1} if(++j>=key.length)j=0;
    }
    for(let n=623;n>0;n--){
      this.mt[i]=((this.mt[i]^Math.imul(this.mt[i-1]^(this.mt[i-1]>>>30),1566083941))-i)>>>0;
      if(++i>=624){this.mt[0]=this.mt[623];i=1}
    }
    this.mt[0]=0x80000000;this.index=624;
  }
  uint32(){
    if(this.index>=624){
      const a=this.mt;
      for(let i=0;i<624;i++){
        const y=(a[i]&0x80000000)|(a[(i+1)%624]&0x7fffffff);
        a[i]=(a[(i+397)%624]^(y>>>1)^((y&1)?0x9908b0df:0))>>>0;
      } this.index=0;
    }
    let y=this.mt[this.index++];y^=y>>>11;y^=(y<<7)&0x9d2c5680;y^=(y<<15)&0xefc60000;y^=y>>>18;return y>>>0;
  }
  below(n){const bits=32-Math.clz32(n);let v;do{v=this.uint32()>>>(32-bits)}while(v>=n);return v}
  shuffle(a){for(let i=a.length-1;i>0;i--){let j=this.below(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
}
export function makeDeck(seed){
  const rng=new PythonRandom(seed);
  return Array.from({length:8},()=>[0,5].map(start=>rng.shuffle(Array.from({length:10},(_,k)=>[start+Math.floor(k/2),k%2?1:-1]))));
}
export function offers(s,deck){
  const blocked=new Set(s.active.map(a=>a[0]));
  return deck[s.turn].map(pool=>pool.find(([i,d])=>!blocked.has(i)&&(d>0?s.traits[i]<40:s.traits[i]>0)));
}
// Draw one eligible trait per group, not a predetermined signed change.
export function traitOffers(s,deck){
  const blocked=new Set(s.active.map(a=>a[0]));
  return deck[s.turn].map(pool=>pool.find(([i])=>!blocked.has(i))[0]);
}
export function runOptions(run){
  const {state:s,deck,mode}=run;
  return mode==='v3'?offers(s,deck):traitOffers(s,deck).flatMap(i=>[-1,1].filter(d=>d>0?s.traits[i]<40:s.traits[i]>0).map(d=>[i,d]));
}
export function mechanisms(traits,pop,reserve,food,env){
  const [f,e,b,l,c,u,g,a,v,r]=traits.map(t=>(t-20)/20);
  const [temp,productivity,pred,snow]=env, exp=Math.exp;
  const cold=Math.max(0,(48-temp)/38),heat=Math.max(0,(temp-72)/25);
  const shelter=clamp(.23+.38*u+.24*cold+.19*heat,.06,.78);
  const coldLoad=cold*exp(-1.65*f+.825*e-.75*b)*(1-.72*shelter);
  const heatLoad=heat*exp(1.35*f-1.05*e+.55*b)*(1-.55*shelter), thermal=coldLoad+heatLoad;
  const camouflage=1-.80*c*(2*snow-1);
  const activity=clamp(.70+.35*g-.25*v-.34*(shelter-.23)-.13*thermal+.40*pred*(1-camouflage),.18,1.10);
  const density=Math.max(.25,pop/120),access=clamp(food/(.52+.34*density),0,1.7);
  const intake=1.24*access*activity*exp(-.05*b+.09*l);
  const base=.62*exp(.60*b+.15*l+.075*Math.max(f,0));
  const thermalCost=.36*thermal,activityCost=.15*activity*exp(.18*l),digging=.06+.13*Math.max(u,0);
  const reproductionPotential=clamp(.20*exp(1.1*r)*exp(-.70*thermal)*clamp(intake/(base+thermalCost+activityCost+digging),0,1.25),0,.38);
  const demand=base+thermalCost+activityCost+digging+.42*reproductionPotential,capacity=.46*exp(1.55*a);
  const usable=Math.min(reserve,capacity),deficit=Math.max(0,demand-intake),withdrawal=Math.min(usable,deficit*.80);
  const residual=Math.max(0,deficit-withdrawal),surplus=Math.max(0,intake-demand),reserveNext=clamp(usable-withdrawal+.70*surplus,0,capacity);
  const exposure=activity*(1-.35*shelter);
  const vulnerability=exp(.34*b-.95*l-.85*v+.30*Math.max(f,0)+.38*(usable-.34));
  const predHazard=clamp(.30*pred*exposure*camouflage*vulnerability,0,.55);
  const coldDeath=clamp(.40*Math.max(0,thermal-.18)**2,0,.85);
  const energyDeath=clamp(.55*(residual/Math.max(demand,.01))**1.25,0,.85);
  let birthRate=reproductionPotential*clamp(1-1.3*residual/Math.max(demand,.01))*exp(-.34*Math.max(0,density-1));
  birthRate*=clamp((pop-1)/11);
  const births=pop*birthRate,deathFraction=1-(1-.028)*(1-coldDeath)*(1-energyDeath)*(1-predHazard),deaths=pop*deathFraction;
  const scores=[100*exp(-.83*thermal),100*clamp((intake+withdrawal)/demand),100*exp(-5*predHazard),100*clamp(birthRate/.24)];
  const foodNext=clamp(.43*food+.57*productivity-.10*density*activity+.045,.12,1.35);
  return {scores,detail:[births,deaths,foodNext,reserveNext,thermal,intake,demand,predHazard,shelter,activity,coldDeath,energyDeath,capacity]};
}
export function baseline(population=120){
  const s={traits:Array(10).fill(20),active:[],counts:Array(20).fill(0),population,reserve:.34,food:1.12,turn:0};
  return {...s,...mechanisms(s.traits,s.population,s.reserve,s.food,[61,1.2,.12,0])};
}
export function add(s,choice){
  if(choice==null)return s;
  const [i,d]=choice;if(s.active.some(a=>a[0]===i))throw new RangeError('Trait already developing');
  const k=2*i+(d===1?1:0),counts=[...s.counts],rate=RATES[Math.min(counts[k],3)];counts[k]++;
  return {...s,counts,active:[...s.active,[i,d,rate,2]]};
}
export function step(state,choice=null,level=LEVEL){
  if(state.turn>=level.length)throw new RangeError('Winter already complete');
  const s=add(state,choice),traits=[...s.traits],active=[];
  for(const [i,d,rate,left] of s.active){traits[i]=clamp(traits[i]+d*rate,0,40);if(left>1)active.push([i,d,rate,left-1])}
  const mid=traits.map((v,i)=>(v+s.traits[i])/2),env=level[s.turn],food=.55*s.food+.45*env[1];
  const {scores,detail}=mechanisms(mid,s.population,s.reserve,food,env);
  const deaths=Math.min(s.population,Math.ceil(detail[1])),births=deaths<s.population?Math.floor(detail[0]):0;
  return {traits,active,counts:s.counts,population:s.population+births-deaths,reserve:detail[3],food:detail[2],turn:s.turn+1,scores,detail:[births,deaths,...detail.slice(2)]};
}
export const value=s=>s.population?s.population+13*s.reserve+5*s.food:0;
export function choose(s,options,policy,rng){
  if(policy==='random')return options[rng.below(options.length)];
  const val=a=>{let n=step(s,a);if(policy==='lookahead')while(n.turn<LEVEL.length)n=step(n);return value(n)};
  if(!['greedy','lookahead'].includes(policy))throw new RangeError('Unknown policy');
  let best=options[0],score=val(best);
  for(const a of options.slice(1)){const next=val(a);if(next>score){best=a;score=next}}
  return best;
}
export function play(seed,policy){
  const deck=makeDeck(seed),rng=new PythonRandom(seed+999999);let s=baseline();const states=[s],choices=[];
  for(let i=0;i<8;i++){const a=choose(s,offers(s,deck),policy,rng);choices.push(a);s=step(s,a);states.push(s)}states.push(step(s));return {states,choices};
}
export function tree(s,deck){if(s.turn===8)return [step(s).population];return offers(s,deck).flatMap(a=>tree(step(s,a),deck))}
export function makeRun(seed=Math.floor(Math.random()*0x7fffffff),mode='v4'){
  if(!['v3','v4'].includes(mode))throw new RangeError('Unknown game rules');
  const s=baseline(mode==='v3'?120:GAME_START_POPULATION);
  return {seed,mode,state:s,deck:makeDeck(seed),history:[s],choices:[]};
}
export function advance(run,choice){
  const turn=run.state.turn;if(turn===9)return run;
  if(turn<8&&!runOptions(run).some(a=>a[0]===choice?.[0]&&a[1]===choice?.[1]))throw new RangeError('Choice not offered');
  if(turn===8&&choice!==null)throw new RangeError('Finale has no new adaptation');
  const state=step(run.state,choice);return {...run,state,history:[...run.history,state],choices:turn<8?[...run.choices,choice]:run.choices};
}
