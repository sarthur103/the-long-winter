// Canvas illustration: stylized isometric map; deterministic decorations, visual-only particles.
const W=760; const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const rgb=a=>'rgb('+a.join(',')+')';const hash=n=>{let v=Math.sin(n*12.9898+78.233)*43758.5453;return v-Math.floor(v)};
const polygon=(x,points,fill)=>{x.fillStyle=fill;x.beginPath();points.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.closePath();x.fill()};
function ellipse(x,a,b,rx,ry,color){x.fillStyle=color;x.beginPath();x.ellipse(a,b,rx,ry,0,0,Math.PI*2);x.fill()}
function rabbit(x,px,py,traits,t,i){
  const [fur,ears,body,legs,coat]=traits.map(v=>(v-20)/20);
  const scale=.76+hash(i+42)*.37,hop=Math.max(0,Math.sin(t*2.9+i*3))*4;
  x.save();x.translate(px,py-hop);x.scale(scale*(i%2?1:-1),scale);
  ellipse(x,0,6,16,4,'#20303935');
  const color=rgb(mix([153,117,86],[245,245,235],Math.max(0,Math.min(1,(coat+1)/2))));
  const b=11+body*3+fur*2,ear=15+ears*7;
  ellipse(x,-8,-4,5+fur,5+fur,'#eae4d8');ellipse(x,0,-5,b,7+body*2+fur*1.5,color);
  ellipse(x,7,-9,6+fur,6+fur,color);
  x.save();x.translate(5,-13);x.rotate(-.19);ellipse(x,0,-ear*.45,2.8,ear*.55,color);ellipse(x,.2,-ear*.48,1,ear*.35,'#c69890');x.restore();
  x.save();x.translate(10,-13);x.rotate(.26);ellipse(x,0,-ear*.43,2.6,ear*.52,color);x.restore();
  ellipse(x,9,-10,1.6,1.6,'#213139');ellipse(x,13,-7,1.1,1.2,'#805a56');
  ellipse(x,1,1+legs*2,5+legs,2.1,color);ellipse(x,10,1+legs*2,4+legs,2.1,color);x.restore();
}
function pine(x,px,py,s,snow){
  ellipse(x,px,py+4,17*s,6*s,'#18352f42');x.fillStyle='#765b48';x.fillRect(px-2*s,py-16*s,4*s,17*s);
  for(let j=0;j<3;j++){
    const cy=py-(20+j*16)*s,w=(24-j*5)*s,h=(38-j*5)*s;
    polygon(x,[[px,cy-h],[px-w,cy+4*s],[px,cy+9*s],[px+w,cy+4*s]],j%2?'#315f58':'#416e5b');
    if(snow>.03)polygon(x,[[px,cy-h],[px-w*.72,cy-6*s],[px,cy-2*s],[px+w*.68,cy-6*s]],rgb(mix([111,142,123],[229,240,237],snow)));
  }
}
export function drawScene(canvas,state,env,time){
  const ctx=canvas.getContext('2d');const H=canvas.height,snow=env[3],temp=env[0],t=time/1000;
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,rgb(mix([125,166,172],[83,124,150],snow)));sky.addColorStop(1,rgb(mix([206,215,177],[219,239,243],snow)));
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  for(let j=0;j<3;j++){
    const base=H*.43+j*21;polygon(ctx,[[0,base],[85,base-58-j*4],[160,base-23],[262,base-72],[390,base-29],[500,base-85],[620,base-33],[760,base-62],[760,H],[0,H]],rgb(mix([106+j*14,145+j*7,132+j*7],[146+j*17,179+j*14,192+j*11],snow)));
  }
  const tileW=54,tileH=24,top=H*.27;
  const project=(a,b)=>[W*.5+(a-b)*tileW*.5,top+(a+b)*tileH*.5];
  for(let a=0;a<14;a++)for(let b=0;b<14;b++){
    const n=a*97+b*23,shade=hash(n),[x,y]=project(a,b);
    const grass=mix([108,138,90],[153,172,116],shade),ice=mix([190,216,217],[235,241,236],shade);
    polygon(ctx,[[x,y],[x+tileW/2,y+tileH/2],[x,y+tileH],[x-tileW/2,y+tileH/2]],rgb(mix(grass,ice,snow)));
    if(hash(n+1)>.88&&snow<.68){ctx.fillStyle=rgb(mix([76,104,65],[162,177,140],snow));ctx.fillRect(x,y+7,2,5);ctx.fillRect(x+3,y+9,2,4)}
  }
  // Frozen stream crosses the far bank.
  const stream=[];for(let i=0;i<=12;i++){const [x,y]=project(i,1.5+.35*Math.sin(i));stream.push([x,y])}for(let i=12;i>=0;i--){const [x,y]=project(i,2.25+.35*Math.sin(i));stream.push([x,y])}
  polygon(ctx,stream,rgb(mix([94,154,158],[160,204,221],snow)));
  const objects=[];
  for(let i=0;i<22;i++){const a=hash(i+100)*13,b=hash(i+200)*13;if(a>3&&a<11&&b>3&&b<11)continue;const [x,y]=project(a,b);objects.push({y,draw:()=>pine(ctx,x,y,.55+hash(i+80)*.65,snow)})}
  const [bx,by]=project(7,8);objects.push({y:by,draw:()=>{const d=state.traits[5]/20;ellipse(ctx,bx,by+4,27*d,11,'#4e5b4c');ellipse(ctx,bx,by,24*d,12,rgb(mix([133,128,89],[205,220,212],snow)));ellipse(ctx,bx,by+3,10*d,6,'#27342f')}});
  const count=Math.min(32,Math.ceil(state.population/6));for(let i=0;i<count;i++){
    const a=3.1+hash(i+500)*8+.2*Math.sin(t*.7+i),b=3+hash(i+800)*8+.18*Math.cos(t*.9+i),[x,y]=project(a,b);
    objects.push({y,draw:()=>rabbit(ctx,x,y,state.traits,t,i)});
  }
  if(env[2]>.27){
    const px=(t*25+130)%900-70,py=H*.17+Math.sin(t)*6;ctx.strokeStyle='#354650';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(px-22,py-6);ctx.quadraticCurveTo(px-10,py-10-Math.sin(t*6)*4,px,py+2);ctx.quadraticCurveTo(px+11,py-10-Math.sin(t*6)*4,px+23,py-6);ctx.stroke();
  }
  objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
  for(let i=0;i<Math.floor(snow*105);i++){
    const px=(hash(i+2000)*W+t*(6+hash(i+37)*12))%W,py=(hash(i+1000)*H+t*(12+hash(i+90)*25))%H;
    ellipse(ctx,px,py,1+hash(i+134)*2,1+hash(i+134)*2,'#f7ffffae');
  }
  if(temp<10){const frost=ctx.createLinearGradient(0,0,W,H);frost.addColorStop(0,'#b4e6ff21');frost.addColorStop(.5,'#b4e6ff00');frost.addColorStop(1,'#b4e6ff44');ctx.fillStyle=frost;ctx.fillRect(0,0,W,H)}
}
