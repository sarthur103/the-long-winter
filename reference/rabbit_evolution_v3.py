"""Offline rabbit evolution game-balance prototype. Python 3, standard library only.
Game coefficients are illustrative, not calibrated ecological data.
Run: python rabbit_evolution_v3.py --runs 3000 --tree-seeds 200
"""
from dataclasses import dataclass, replace
from itertools import product
from math import exp, sqrt, ceil, floor
import argparse, random, statistics as st, json

PHYSICAL=('fur','ears','body','legs','coat')
OTHER=('burrow','forage','fat','vigilance','reproduction')
TRAITS=PHYSICAL+OTHER
INDEX={x:i for i,x in enumerate(TRAITS)}
RATES=(3.,2.,1.,.5)
# Temperature (F), external food productivity index, predator pressure (0..1), snow cover (0..1).
# Snow is a deterministic derived level parameter, not a fourth player forecast.
LEVEL=((65,1.17,.16,0),(62,1.08,.20,0),(50,.92,.29,.12),(28,.70,.40,.55),(5,.50,.52,.90),(8,.48,.55,.95),(22,.63,.47,.75),(35,.88,.32,.35),(44,1.04,.23,.08))
STAR_THRESHOLDS=(30,48,58) # Minimum viable colony and mastery thresholds, game objectives, not biological minima.
COLD_MORTALITY=.40
THERMAL_EXPONENT=2.0
ENERGY_MORTALITY=.55
PREDATOR_MORTALITY=.30
CAMOUFLAGE=.80

def stars(pop):return sum(pop>=t for t in STAR_THRESHOLDS)
NAMES=('Temperature','Energy','Predators','Reproduction')

def clamp(x,lo=0.,hi=1.): return max(lo,min(hi,x))
@dataclass(frozen=True)
class State:
    traits:tuple=(20.,)*10
    # (trait index, direction, increment per turn, turns remaining)
    active:tuple=()
    counts:tuple=(0,)*20
    population:int=120
    reserve:float=.34 # average stored energy / baseline turn maintenance
    food:float=1.12 # realized accessible food stock, relative to baseline
    turn:int=0
    scores:tuple=(0.,)*4
    detail:tuple=()

# Pure, uniform random offers over eligible signed adaptations. Pre-shuffled lists
# per round make policy comparisons reproducible, without biasing eligible draws.
def make_deck(seed):
    rng=random.Random(seed)
    deck=[]
    for _ in range(8):
        pair=[]
        for group in (range(5),range(5,10)):
            pool=list(product(group,(-1,1)));rng.shuffle(pool);pair.append(tuple(pool))
        deck.append(tuple(pair))
    return tuple(deck)

def offers(s,deck):
    blocked={i for i,_,_,_ in s.active}
    return tuple(next(a for a in pool if a[0] not in blocked and ((a[1]>0 and s.traits[a[0]]<40) or (a[1]<0 and s.traits[a[0]]>0))) for pool in deck[s.turn])

def add(s,choice):
    if choice is None:return s
    i,d=choice
    if i in {a[0] for a in s.active}:raise ValueError('Trait already developing')
    k=2*i+(d==1); counts=list(s.counts)
    rate=RATES[min(counts[k],3)];counts[k]+=1
    return replace(s,counts=tuple(counts),active=s.active+((i,d,rate,2),))

def mechanisms(traits, pop, reserve, food, env):
    f,e,b,l,c,u,g,a,v,r=((t-20)/20 for t in traits)
    temp,productivity,pred,snow=env
    # positive f = thicker fur; positive c = lighter coat. Ear size has no direct predator effect.
    cold=max(0.,(48-temp)/38); heat=max(0.,(temp-72)/25)
    shelter=clamp(.23+.38*u+.24*cold+.19*heat,.06,.78)
    # fur marginal insulation about twice ear-size effect; body and shelter also help.
    cold_load=cold*exp(-1.65*f+.825*e-.75*b)*(1-.72*shelter)
    heat_load=heat*exp(1.35*f-1.05*e+.55*b)*(1-.55*shelter)
    thermal=cold_load+heat_load
    # food productivity drives regeneration; density drives accessible food per rabbit.
    # foraging and vigilance compete for time, shelter limits access.
    camouflage=1-CAMOUFLAGE*c*(2*snow-1)
    # Better concealment permits more safe foraging under predator pressure.
    activity=clamp(.70+.35*g-.25*v-.34*(shelter-.23)-.13*thermal+.40*pred*(1-camouflage),.18,1.10)
    density=max(.25,pop/120)
    access=clamp(food/(.52+.34*density),0,1.7)
    intake=1.24*access*activity*exp(-.05*b+.09*l)
    base=.62*exp(.60*b+.15*l+.075*max(f,0))
    thermal_cost=.36*thermal
    activity_cost=.15*activity*exp(.18*l)
    digging=.06+.13*max(u,0)
    # reproductive allocation constrained by current energetic/thermal state.
    reproduction_potential=clamp(.20*exp(1.1*r)*exp(-.70*thermal)*clamp(intake/(base+thermal_cost+activity_cost+digging),0,1.25),0,.38)
    reproductive_cost=.42*reproduction_potential
    demand=base+thermal_cost+activity_cost+digging+reproductive_cost
    capacity=.46*exp(1.55*a)
    # stored energy buffers shortfall, never creates food. Filling incurs a small cost.
    usable=min(reserve,capacity)
    deficit=max(0.,demand-intake)
    withdrawal=min(usable,deficit*.80)
    residual=max(0.,deficit-withdrawal)
    surplus=max(0.,intake-demand)
    reserve_next=clamp(usable-withdrawal+.70*surplus,0,capacity)
    # Generic predator pressure; no predator classes. coat blends with snow vs ground.
    exposure=activity*(1-.35*shelter)
    # Fur bulk is a small gameplay abstraction, not a validated biological estimate.
    # Actual stored mass, not storage capacity, reduces escape performance.
    vulnerability=exp(.34*b-.95*l-.85*v+.30*max(f,0)+.38*(usable-.34))
    pred_hazard=clamp(PREDATOR_MORTALITY*pred*exposure*camouflage*vulnerability,0,.55)
    cold_death=clamp(COLD_MORTALITY*max(0.,thermal-.18)**THERMAL_EXPONENT,0,.85)
    energy_death=clamp(ENERGY_MORTALITY*(residual/max(demand,.01))**1.25,0,.85)
    # R is realized reproduction, not a free upgrade to population growth.
    birth_rate=reproduction_potential*clamp(1-1.3*residual/max(demand,.01))*exp(-.34*max(0.,density-1))
    birth_rate *= clamp((pop-1)/11)
    births=pop*birth_rate
    death_fraction=1-(1-.028)*(1-cold_death)*(1-energy_death)*(1-pred_hazard)
    deaths=pop*death_fraction
    # scores report normalized game safety indices, not probabilities. Reproduction= .24 birth rate is 100.
    scores=(100*exp(-.83*thermal),100*clamp((intake+withdrawal)/demand),100*exp(-5*pred_hazard),100*clamp(birth_rate/.24))
    # consumption pressure reduces food, external productivity regenerates it each period
    food_next=clamp(.43*food+.57*productivity-.10*density*activity+.045,.12,1.35)
    return scores,(births,deaths,food_next,reserve_next,thermal,intake,demand,pred_hazard,shelter,activity,cold_death,energy_death,capacity)

def step(s,choice=None,level=None):
    if level is None:level=LEVEL
    s=add(s,choice)
    values=list(s.traits); active=[]
    for i,d,rate,left in s.active:
        values[i]=clamp(values[i]+d*rate,0,40)
        if left>1:active.append((i,d,rate,left-1))
    # Midpoint represents the period average while the final state drives the next turn.
    mid=tuple((a+b)/2 for a,b in zip(s.traits,values))
    env=level[s.turn]
    # Blend the food stock with the new climate forecast, so change is visible this turn.
    food=.55*s.food+.45*env[1]
    scores,detail=mechanisms(mid,s.population,s.reserve,food,env)
    births,deaths,food_next,reserve_next=detail[:4]
    deaths=min(s.population,ceil(deaths))
    births=floor(births) if deaths<s.population else 0
    pop=s.population+births-deaths
    detail=(births,deaths)+detail[2:]
    return State(tuple(values),tuple(active),s.counts,pop,reserve_next,food_next,s.turn+1,scores,detail)

def baseline():
    s=State();scores,d=mechanisms(s.traits,s.population,s.reserve,s.food,(61,1.2,.12,0));return replace(s,scores=scores,detail=d)

def value(s):
    # Illustrative policy optimization objective; not the final player score.
    return s.population + 13*s.reserve + 5*s.food if s.population else 0

def choose(s,options,policy,rng):
    if policy=='random':return rng.choice(options)
    if policy=='greedy':return max(options,key=lambda a:value(step(s,a)))
    if policy=='lookahead':
        def v(a):
            n=step(s,a)
            for _ in range(len(LEVEL)-n.turn):n=step(n) # Full visible climate forecast; assumes no further selections, never sees actual future offers.
            return value(n)
        return max(options,key=v)
    raise ValueError(policy)

def play(seed,policy):
    deck=make_deck(seed);rng=random.Random(seed+999_999);s=baseline();states=[s];choices=[]
    for _ in range(8):
        opt=offers(s,deck);a=choose(s,opt,policy,rng);choices.append(a);s=step(s,a);states.append(s)
    states.append(step(s));return states,choices

def label(a): return ('+' if a[1]>0 else '-')+TRAITS[a[0]]
def quantile(xs,p):return sorted(xs)[round((len(xs)-1)*p)]
def summary(xs):return {'mean':round(st.mean(xs),2),'p10':round(quantile(xs,.1),2),'median':round(st.median(xs),2),'p90':round(quantile(xs,.9),2),'min':round(min(xs),2),'max':round(max(xs),2),'survive20_pct':round(100*sum(x>=20 for x in xs)/len(xs),2),'survive1_pct':round(100*sum(x>=1 for x in xs)/len(xs),2),'100plus_pct':round(100*sum(x>=100 for x in xs)/len(xs),2),'150plus_pct':round(100*sum(x>=150 for x in xs)/len(xs),2),'200plus_pct':round(100*sum(x>=200 for x in xs)/len(xs),2)}
def tree(s,deck):
    if s.turn==8:return [step(s).population]
    out=[]
    for a in offers(s,deck):out.extend(tree(step(s,a),deck))
    return out

def analyze(n=3000,nt=200,offset=100000):
    result={'level':LEVEL,'thresholds':STAR_THRESHOLDS,'validation_seed_start':offset,'runs_per_policy':n,'tree_seed_start':offset+100000,'policies':{}}
    for p in ('random','greedy','lookahead'):
        runs=[play(seed,p) for seed in range(offset,offset+n)]
        pops=[s[-1].population for s,c in runs]
        result['policies'][p]={'mean':st.mean(pops),'median':st.median(pops),'p10':quantile(pops,.1),'p90':quantile(pops,.9),'min':min(pops),'max':max(pops),'extinction_pct':100*sum(x==0 for x in pops)/n,'fail_pct':[100*sum(x<t for x in pops)/n for t in STAR_THRESHOLDS],'exact_stars_pct':[100*sum(stars(x)==k for x in pops)/n for k in range(4)],'mean_pop_by_turn':[st.mean(s[t].population for s,c in runs) for t in range(10)],'mean_selection_counts':{label(a):sum(c.count(a) for s,c in runs)/n for a in product(range(10),(-1,1))}}
    trees=[tree(baseline(),make_deck(seed)) for seed in range(offset+100000,offset+100000+nt)]
    result['tree']={'seeds':nt,'paths':sum(map(len,trees)),'impossible_pct':[100*sum(max(t)<v for t in trees)/nt for v in STAR_THRESHOLDS],'all_paths_pass_pct':[100*sum(min(t)>=v for t in trees)/nt for v in STAR_THRESHOLDS],'seeds_with_extinction_pct':100*sum(min(t)==0 for t in trees)/nt,'worst_best_population':min(max(t) for t in trees),'median_best_population':st.median(max(t) for t in trees),'median_worst_population':st.median(min(t) for t in trees)}
    states,choices=play(offset,'lookahead');s=baseline()
    for a in choices:s=step(s,a)
    s=step(s);assert s==states[-1] and not s.active
    assert step(replace(baseline(),population=0)).population==0
    result['deterministic_replay_verified']=True
    result['sample_run']=[{'turn':s.turn,'choice':label(choices[s.turn-1]) if 1<=s.turn<=8 else None,'population':s.population,'scores':s.scores} for s in states]
    return result

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--runs',type=int,default=3000);parser.add_argument('--tree-seeds',type=int,default=200);parser.add_argument('--seed-offset',type=int,default=100000);args=parser.parse_args()
    print(json.dumps(analyze(args.runs,args.tree_seeds,args.seed_offset),indent=2))
