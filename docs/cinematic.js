// The film is an illustration of a saved generation, never a simulation input.
const W=768,H=500;
const clamp=x=>Math.max(0,Math.min(1,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const easeOut=x=>1-(1-clamp(x))**3;
const band=(x,a,b)=>clamp((x-a)/(b-a));
const noise=i=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v)};
const color=(a,b,t)=>'rgb('+a.map((v,i)=>Math.round(lerp(v,b[i],t))).join(',')+')';
const env=(temp,food,risk,snow)=>[temp,food,risk,snow];

export function makeOpening({state,seed}){
  return {type:'opening',seed,before:state,after:state,shots:[
    {kind:'valley',ms:2200,name:'Late summer',title:'The Long Winter',copy:'One hundred rabbits make a home at the edge of the woods.',env:env(65,1.17,.16,0)},
    {kind:'forage',ms:1850,name:'The last green days',title:'Fill the burrow before the frost',copy:'There is food in the meadow. There are eyes in the trees.',env:env(50,.92,.27,.06)},
    {kind:'watch',ms:2100,name:'Winter is coming',title:'Eight generations to adapt',copy:'Choose what changes. See who makes it to spring.',env:env(29,.70,.4,.54)}
  ]};
}
export function makeGeneration({before,after,weather,period,choice,choiceLabel,seed}){
  const finale=after.turn===9,ended=after.population===0,empty=before.population===0,hard=weather[3]>.45,rich=weather[1]>.84;
  return {type:finale?'finale':'generation',seed,before,after,choice,shots:[
    {kind:empty?'warren':'forage',ms:1700,name:'Forage',title:empty?'The meadow is quiet':rich?'Out to forage':hard?'Searching beneath the snow':'Searching for food',copy:empty?'No rabbits are left to forage.':hard?'The colony scratches through crusted snow for stems and roots.':rich?'The rabbits hop between clover and berry patches.':'Food is getting harder to find beyond the burrow.',env:weather},
    {kind:empty?'watch':'chase',ms:2200,name:'Predator watch',title:empty?'The fox passes by':'Fox at the treeline',copy:empty?'The abandoned warren makes no sound.':'Ears up. Then a sprint for cover.',env:weather},
    {kind:'warren',ms:1800,name:finale?'Spring tally':'Back at the warren',
      title:ended?'The warren falls quiet':finale?'The last frost has passed':choiceLabel+' takes hold',
      copy:choice?period+' · '+before.traits[choice[0]]+' → '+after.traits[choice[0]]+' / 40 this generation.':period+' · The last adaptation finishes developing.',env:weather}
  ]};
}
export function filmDuration(film){return film.shots.reduce((n,shot)=>n+shot.ms,0)}
export function filmFrame(film,elapsed){
  const total=filmDuration(film),time=Math.max(0,Math.min(total,elapsed));
  let start=0;
  for(let i=0;i<film.shots.length;i++){
    const shot=film.shots[i];
    if(time<start+shot.ms||i===film.shots.length-1)return {shot,index:i,phase:clamp((time-start)/shot.ms),progress:time/total,done:time===total};
    start+=shot.ms;
  }
}

function outline(ctx,fill,paint,stroke=null,width=1){
  ctx.beginPath();paint(ctx);
  if(fill){ctx.fillStyle=fill;ctx.fill()}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
}
function bean(c,x,y,rx,ry,fill,angle=0){
  outline(c,fill,g=>g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),angle,0,Math.PI*2));
}
function drawLine(c,ink,width,paint){c.lineCap='round';c.lineJoin='round';outline(c,null,paint,ink,width)}
function gradient(c,x,y,u,v,stops){
  const g=c.createLinearGradient(x,y,u,v);for(const [at,ink] of stops)g.addColorStop(at,ink);return g;
}
function fir(c,x,y,s,ink,snow=0){
  c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#2f3430';c.fillRect(-4,-57,8,59);
  for(let j=0;j<3;j++){
    const top=-120+j*27,w=27+j*8;
    outline(c,ink,g=>{g.moveTo(0,top);g.lineTo(-w,top+64);g.quadraticCurveTo(0,top+71,w,top+64);g.closePath()});
    if(snow>.15){
      c.globalAlpha=snow*.86;
      outline(c,'#d5e5df',g=>{g.moveTo(0,top);g.lineTo(-w*.64,top+43);g.quadraticCurveTo(0,top+35,w*.68,top+44);g.closePath()});
      c.globalAlpha=1;
    }
  }c.restore();
}
function hills(c,col,alt,offset){
  outline(c,col,g=>{g.moveTo(-40,alt);g.bezierCurveTo(85+offset,alt-132,141+offset,alt-109,239+offset,alt-46);g.bezierCurveTo(353+offset,alt+39,485+offset,alt-135,607+offset,alt-67);g.quadraticCurveTo(712+offset,alt-54,808,alt-101);g.lineTo(808,H);g.lineTo(-40,H);g.closePath()});
}
function landscape(c,{snow,wide,phase,seed,watch=false}){
  const pan=(phase-.5)*(wide?32:15),alt=wide?310:289;
  c.fillStyle=gradient(c,0,0,0,H,[[0,color([44,102,114],[40,67,95],snow)],[.54,color([223,186,132],[171,197,206],snow)],[1,'#a9b5a0']]);c.fillRect(0,0,W,H);
  const sunX=wide?565:625,sunY=wide?103:91;
  const haze=c.createRadialGradient(sunX,sunY,8,sunX,sunY,109);haze.addColorStop(0,watch?'#e1edf2aa':'#ffe5acb9');haze.addColorStop(1,'#ffe5ac00');
  bean(c,sunX,sunY,109,109,haze);bean(c,sunX,sunY,39,39,watch?'#e2e9dd':'#f9dca2');
  for(let i=0;i<4;i++){
    const x=45+i*195+noise(seed+i)*45-pan*.4,y=52+i%2*56;
    drawLine(c,'#e8e5d64a',2,g=>{g.moveTo(x,y);g.quadraticCurveTo(x+46,y-14,x+122,y-4)});
  }
  hills(c,color([101,135,127],[108,132,149],snow),alt-27,pan*.18);
  hills(c,color([68,110,103],[83,112,130],snow),alt+25,-pan*.3);
  for(let i=0;i<26;i++){
    const x=i*34-30-pan*.55,y=alt+40+Math.sin(i*.61)*21+noise(i+8)*24,s=.28+noise(i+66)*.57;
    fir(c,x,y,s,color([51,91,83],[66,95,111],snow),snow*.35);
  }
  const grass=gradient(c,0,alt+4,0,H,[[0,color([100,128,84],[197,217,220],snow)],[.6,color([137,153,94],[192,214,223],snow)],[1,color([61,98,70],[132,170,182],snow)]]);
  hills(c,grass,wide?365:407,pan);
  for(let i=0;i<32;i++){
    const x=noise(seed+14+i*3)*W,y=wide?338+noise(i+214)*157:324+noise(i+214)*174;
    bean(c,x,y,6+17*noise(i+608),1.5+3*noise(i+6),snow>.4?'#e2eeee66':'#c6bf885b',-.07);
  }
  if(wide){
    outline(c,color([75,120,124],[131,173,190],snow),g=>{g.moveTo(0,440);g.bezierCurveTo(152,367,217,398,296,367);g.quadraticCurveTo(342,350,399,360);g.bezierCurveTo(274,369,246,445,0,490);g.closePath()});
    drawLine(c,'#d2e5db83',3,g=>{g.moveTo(23,454);g.quadraticCurveTo(159,401,226,402)});
  }
}
function plant(c,x,y,s,snow,type=0,amount=1,drift=0){
  if(amount<=0)return;c.save();c.translate(x,y);c.scale(s,s);
  const ink=snow>.45?'#516c56':'#345b41',leaf=snow>.45?'#72846a':'#769858';
  drawLine(c,ink,2.7,g=>{g.moveTo(0,0);g.quadraticCurveTo(-3,-18,drift,-45*amount);g.moveTo(-1,-7);g.quadraticCurveTo(-16,-13,-22,-29*amount);g.moveTo(0,-12);g.quadraticCurveTo(14,-17,17,-37*amount)});
  if(type===1&&amount>.35){bean(c,drift,-44*amount,5,5,'#b95f4b');bean(c,drift-6,-39*amount,4.2,4.2,'#d58958');bean(c,17,-37*amount,3.5,3.5,'#d98d55')}
  else{bean(c,drift+5,-35*amount,11,5,leaf,-.53);bean(c,-15,-22*amount,10,4.5,leaf,.49);bean(c,12,-25*amount,9,4,leaf,-.57)}
  if(snow>.3)bean(c,0,1,11,4,'#e6eeeb');c.restore();
}
function burrow(c,x,y,s,snow){
  c.save();c.translate(x,y);c.scale(s,s);
  bean(c,0,12,81,22,'#283b3359');bean(c,0,0,75,39,color([123,109,76],[193,210,208],snow));
  bean(c,5,9,43,27,color([79,75,54],[132,155,152],snow));bean(c,7,12,34,23,'#25322e');
  bean(c,8,17,25,14,'#131f20');bean(c,0,-23,53,10,color([173,153,100],[228,238,232],snow),-.03);
  for(let i=0;i<5;i++)bean(c,-45+i*17,30+noise(i)*6,7,4,color([103,104,77],[169,194,191],snow),.12);
  c.restore();
}

// Side-on character rigs: paws and ears have independent motion, not a sliding stamp.
function rabbit(c,x,y,s,face,t,traits,action='hop',food=false,accent=0){
  const [fur,ears,body,legs,coat]=traits.map(v=>(v-20)/20);
  const cycle=t*(action==='run'?7.2:3.45),stride=(action==='hop'||action==='run')?Math.sin(cycle*Math.PI*2):0;
  const jump=(action==='hop'||action==='run')?Math.max(0,stride)*(action==='run'?21:13):0;
  const nibble=action==='eat'?Math.sin(t*25)*2.2:0,down=action==='eat'?14:action==='alert'?-5:0;
  const length=38+body*11+fur*5,earLength=30+ears*21;
  const tint=clamp(.48+coat*.55+accent*.09),pelt=color([154,116,78],[243,237,216],tint),light=color([196,158,112],[253,249,235],tint);
  bean(c,x,y+2,s*(34-jump*.3),s*6,'#172c2855');
  c.save();c.translate(x,y-jump*s);c.scale(s*face,s);
  bean(c,-length+1,-23,10+fur*2,10+fur*2,light,-.3);
  bean(c,-8,-18,length,21+body*5+fur*3,pelt,-.09+stride*.055);
  bean(c,-26,-11,19+body*5,12+fur*2,light,.23);
  const paw=5+legs*3;
  bean(c,-26-stride*17,-3+stride*3,13,paw,pelt,stride*.15);
  bean(c,23+stride*15,-2-stride*3,11,paw,light,-stride*.14);
  const headX=22+stride*3,headY=-29+down+nibble;
  c.save();c.translate(headX,headY);
  for(let i=0;i<2;i++){
    c.save();c.translate(-9+i*9,-12);c.rotate((action==='run'?-.75:action==='eat'?-.42:-.21)+i*.24+stride*.22);
    bean(c,0,-earLength*.42,6.3,earLength*.6,i?pelt:light);
    bean(c,.7,-earLength*.47,2.8,earLength*.42,'#ce9f97');c.restore();
  }
  bean(c,0,0,18+fur*3,16+fur*2,pelt,-.15);bean(c,12,6,10,8,light,.12);
  const blink=Math.sin(t*3.1+accent*4)>.993;bean(c,5,-3,2.9,blink?.75:3.25,'#18262b');if(!blink)bean(c,5.6,-4,1.05,1,'#fff9e5');
  bean(c,20,3,2.9,2.25,'#805850');
  drawLine(c,'#57655f80',.8,g=>{g.moveTo(17,7);g.lineTo(26,5);g.moveTo(17,8);g.lineTo(25,10)});
  if(food){drawLine(c,'#57774b',2,g=>{g.moveTo(21,7);g.lineTo(34,10)});bean(c,33,8,7,3,'#879957',-.32)}
  c.restore();c.restore();
}
function fox(c,x,y,s,t,run=false,face=1){
  const a=t*(run?8:3)*Math.PI*2,stride=Math.sin(a),hop=run?Math.max(0,stride)*10:0;
  bean(c,x,y+2,70*s,10*s,'#202e2e4f');
  c.save();c.translate(x,y-hop*s);c.scale(s*face,s);
  outline(c,'#b65c34',g=>{g.moveTo(-35,-31);g.bezierCurveTo(-66,-47,-112,-36,-132,-14+Math.cos(a)*6);g.bezierCurveTo(-113,-8,-74,-1,-36,-17);g.closePath()});
  outline(c,'#e5d2ac',g=>{g.moveTo(-132,-14+Math.cos(a)*6);g.quadraticCurveTo(-118,-21,-103,-24);g.lineTo(-109,-11);g.quadraticCurveTo(-120,-7,-132,-14+Math.cos(a)*6);g.closePath()});
  for(let i=0;i<4;i++){
    const dx=-30+i*19,k=(i%2?1:-1)*stride*(run?31:8);
    drawLine(c,i%2?'#653b30':'#503b34',8,g=>{g.moveTo(dx,-27);g.lineTo(dx+k*.55,-14);g.lineTo(dx+k,-1)});
  }
  bean(c,-7,-32,53,17,'#c86636',-.08);
  bean(c,29,-22,22,10,'#eacdb4',-.19);
  const h=run?-38:-29;
  outline(c,'#d8763f',g=>{g.moveTo(24,h+8);g.lineTo(27,h-23);g.lineTo(38,h-10);g.lineTo(45,h-25);g.lineTo(53,h-4);g.lineTo(77,h+7);g.lineTo(56,h+17);g.lineTo(36,h+16);g.closePath()});
  outline(c,'#ead5b5',g=>{g.moveTo(46,h+8);g.lineTo(76,h+7);g.lineTo(57,h+17);g.lineTo(35,h+16);g.closePath()});
  bean(c,55,h+1,3.5,2.25,'#2b2526',-.19);bean(c,76,h+7,4,3.2,'#2d2929');
  c.restore();
}
function particles(c,snow,phase,seed){
  const count=18+Math.floor(snow*43);
  for(let i=0;i<count;i++){
    const x=(noise(seed+i*11)*W+phase*(snow?92:40))%W,y=(noise(i*11+53)*H+phase*(snow?122:20))%H;
    bean(c,x,y,.7+noise(i*3)*2,.7+noise(i*3)*1.9,snow>.15?'#f3fbf4b8':'#fff4cd5c');
  }
}
function debris(c,x,y,snow,p,seed){
  for(let i=0;i<8;i++){
    const d=noise(seed+i*45),k=(p*3+d)%1;
    bean(c,x-k*(29+d*35),y-Math.sin(k*Math.PI)*(7+d*11),1.5+d*3,1.2+d,snow>.4?'#effaf6a2':'#b4a17d74');
  }
}

export function drawFilm(canvas,film,frame,{still=false}={}){
  const c=canvas.getContext('2d');if(!c)return;
  const {shot,index,phase:p,progress}=frame,seed=film.seed%997;
  const [temp,food,risk,rawSnow]=shot.env,snow=shot.kind==='watch'?lerp(rawSnow*.6,rawSnow,p):rawSnow;
  const alive=film.before.population>0,survivors=film.after.population>0;
  const traits=film.before.traits.map((v,i)=>lerp(v,film.after.traits[i],smooth(progress)));
  const flip=film.type==='opening'?1:(film.after.turn%2?1:-1);
  const t=still?0:p*shot.ms/1000;
  c.save();c.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  landscape(c,{snow,wide:shot.kind==='valley',phase:p,seed,watch:shot.kind==='watch'});
  if(shot.kind==='valley'){
    burrow(c,573,345,1.16,snow);
    for(let i=0;i<6;i++){
      const y=377+i*13,x=lerp(-35+i*36,355+i*37,easeOut(p))*1.02;
      rabbit(c,x,y,.64+i*.047,1,t+i*.13,traits,'hop',i%3===0);
    }
    fir(c,49,411,1.56,'#244c42',snow);fir(c,753,404,1.64,'#294e43',snow);
  }else if(shot.kind==='forage'){
    const foot=379,spot=372+(seed%49)-24,foodGone=.76*smooth(band(p,.4,.88));
    for(let i=0;i<6;i++)plant(c,spot+i*25-53,foot+22+noise(i+88)*24,.7+noise(i+14)*.65,snow,i%3===0?1:0,i<3?1-foodGone:1,Math.sin(t*2+i)*2);
    if(alive){
      const arrival=smooth(band(p,0,.45)),exit=smooth(band(p,.80,1));
      const x=lerp(104,spot-44,arrival)+exit*104;
      const i=film.choice?.[0],less=film.choice?.[1]<0;
      const pause=i===6&&less?.56:.43;
      rabbit(c,x,foot+28,1.45,1,t,traits,p<pause||p>.8?'hop':'eat',p>.64,1);
      rabbit(c,lerp(95,spot+108,arrival),foot-12,.88,-1,t+.16,traits,p>.42?'eat':'hop',p>.64&&food>.83,.3);
      rabbit(c,lerp(65,spot-117,arrival),foot+6,.82,1,t+.41,traits,p>.54?'alert':'hop',false,.5);
    }
    plant(c,64,496,2,snow,1,1,Math.sin(t*2)*4);plant(c,699,469,1.9,snow,0,1,4);
  }else if(shot.kind==='chase'){
    c.save();if(flip<0){c.translate(W,0);c.scale(-1,1)}
    burrow(c,678,357,1.16,snow);fir(c,50,382,1.53,'#274b47',snow);fir(c,149,324,.86,'#39625a',snow);
    const sprint=band(p,.33,.93),dash=smooth(sprint),stalk=smooth(band(p,.04,.46));
    fox(c,lerp(-74,179,stalk)+smooth(band(p,.49,.93))*(risk>.34?248:122),366,1.27,t,p>.48&&p<.94);
    for(let i=0;i<3;i++)if(alive){
      const x=lerp(400-i*44,711-i*13,dash);
      if(x<688){debris(c,x-21,405+i*12,snow,sprint,seed+i);rabbit(c,x,404+i*12,1.02-i*.12,1,t+i*.19,traits,p<.33?'alert':'run',false,i*.3)}
    }
    plant(c,582,474,1.65,snow,0,1,Math.sin(t*6)*7);c.restore();
  }else{
    burrow(c,549,377,1.56,snow);
    if(shot.kind==='watch')fox(c,lerp(88,230,smooth(p)),354,.98,t,false);
    if(alive&&shot.kind==='watch'){
      rabbit(c,536+smooth(p)*35,419,1.32,1,t,traits,p>.58?'hop':'alert');
      rabbit(c,617+smooth(p)*34,377,.87,1,t+.21,traits,p>.37?'hop':'alert');
    }else if(survivors&&shot.kind==='warren'){
      const arriving=smooth(band(p,0,.52)),face=film.choice?.[0]===8?-1:1;
      rabbit(c,lerp(179,385,arriving),411,1.45,face,t,traits,p<.48?'hop':film.choice?.[0]===6?'eat':'alert',film.choice?.[0]===6);
      rabbit(c,lerp(274,477,arriving),396,.91,1,t+.15,traits,p<.5?'hop':'eat',true,.4);
      if(film.after.detail[0]>0){rabbit(c,552-17*smooth(band(p,.45,1)),403,.58,-1,t+.33,traits,'hop');rabbit(c,585,408,.52,1,t+.56,traits,'eat')}
    }
    for(let i=0;i<4;i++)plant(c,104+i*35,465+noise(i)*20,.87,snow,temp>38?1:0);
    fir(c,719,405,1.25,'#284c48',snow);
  }
  if(!still)particles(c,snow,p,seed);
  c.fillStyle=gradient(c,0,0,0,H,[[0,'#0d202958'],[.18,'#0d202900'],[.75,'#0d202900'],[1,'#0d202985']]);c.fillRect(0,0,W,H);
  if(!still){
    const fade=(1-smooth(band(p,0,.10)))*.75+(index<film.shots.length-1?(1-smooth(band(1-p,0,.07)))*.68:0);
    if(fade>.005){c.fillStyle='rgba(13,29,38,'+fade+')';c.fillRect(0,0,W,H)}
  }
  c.restore();
}
