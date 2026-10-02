'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha:false });
const objective = document.getElementById('objective');
const toast = document.getElementById('toast');
const phone = document.getElementById('phone');
const phoneBody = document.getElementById('phoneBody');
const clockEl = document.getElementById('clock');
const flashBtn = document.getElementById('flashBtn');
const phoneBtn = document.getElementById('phoneBtn');
const fsBtn = document.getElementById('fsBtn');
const start = document.getElementById('start');
const ending = document.getElementById('ending');
const stickBase = document.getElementById('stickBase');
const stickKnob = document.getElementById('stickKnob');
const leftZone = document.getElementById('leftZone');
const lookZone = document.getElementById('lookZone');

const W = 480, H = 270, FOV = Math.PI / 3.05;
canvas.width = W; canvas.height = H;
let running = false;
let last = performance.now();
let flashlight = true;
let phoneOpen = false;
let ghostVisible = false;
let ghostSeen = false;
let ghostStart = 0;
let escaped = false;
let shake = 0;
let audioCtx = null, humGain = null, humOsc = null;

const MAP_W = 16, MAP_H = 32;
const map = Array.from({length:MAP_H},()=>Array(MAP_W).fill(1));
// Corridor.
for (let y=1; y<=22; y++) for (let x=5; x<=10; x++) map[y][x]=0;
// Doors/window wall materials on corridor edges.
for (const y of [4,9,14,19]) { map[y][4]=2; map[y+1][4]=2; }
for (const y of [6,11,16,21]) { map[y][11]=3; map[y+1][11]=3; }
// Gym.
for (let y=23; y<=29; y++) for (let x=2; x<=13; x++) map[y][x]=0;
for (let x=2; x<=13; x++) { map[22][x]= x>=5 && x<=10 ? 0 : 4; map[30][x]=4; }
// Exit opening marker is still wall visually; trigger happens before it.
map[30][7]=5; map[30][8]=5;

const player = { x:7.5, y:2.6, a:Math.PI/2, moveX:0, moveY:0 };
const ghost = { x:8.25, y:21.3 };
const keys = new Set();
const depth = new Float32Array(W);

function cell(x,y){
  if (x<0||y<0||x>=MAP_W||y>=MAP_H) return 1;
  return map[y][x];
}
function normAng(a){ while(a>Math.PI)a-=Math.PI*2; while(a<-Math.PI)a+=Math.PI*2; return a; }
function dist(a,b,c,d){ return Math.hypot(a-c,b-d); }
function canMove(x,y){
  const r=.22;
  return cell(Math.floor(x-r),Math.floor(y-r))===0 && cell(Math.floor(x+r),Math.floor(y-r))===0 && cell(Math.floor(x-r),Math.floor(y+r))===0 && cell(Math.floor(x+r),Math.floor(y+r))===0;
}
function reset(){
  player.x=7.5; player.y=2.6; player.a=Math.PI/2; player.moveX=0; player.moveY=0;
  flashlight=true; phoneOpen=false; ghostVisible=false; ghostSeen=false; ghostStart=0; escaped=false; shake=0;
  phone.classList.remove('open'); ending.style.display='none';
  phoneBody.textContent='まだ大丈夫。\n\n体育館だけ明るい。\n出口はその奥にありそう。';
  objective.textContent='目的：体育館の先の EXIT を探す';
}
function showToast(text, ms=1900){
  toast.textContent=text; toast.style.opacity='1';
  clearTimeout(showToast.t); showToast.t=setTimeout(()=>toast.style.opacity='0',ms);
}
function setNoa(text){ phoneBody.textContent=text; }
function triggerGhost(){
  if (ghostSeen) return;
  ghostSeen=true; ghostVisible=true; ghostStart=performance.now(); shake=.9;
  objective.textContent='目的：体育館を抜けて EXIT へ';
  showToast('廊下の先に、何かいる。',2300);
  setNoa('止まらなくていい。\n\n体育館の先に EXIT が見える。\n近づいて確認しなくていい。');
  sting();
}
function update(dt, now){
  let f=0,s=0;
  if(keys.has('KeyW')||keys.has('ArrowUp')) f+=1;
  if(keys.has('KeyS')||keys.has('ArrowDown')) f-=1;
  if(keys.has('KeyD')) s+=1;
  if(keys.has('KeyA')) s-=1;
  f += -player.moveY; s += player.moveX;
  const m=Math.hypot(f,s); if(m>1){f/=m;s/=m;}
  let speed = keys.has('ShiftLeft') ? 4.8 : 3.15;
  if(phoneOpen) speed*=.58;
  const dx=(Math.cos(player.a)*f + Math.cos(player.a+Math.PI/2)*s)*speed*dt;
  const dy=(Math.sin(player.a)*f + Math.sin(player.a+Math.PI/2)*s)*speed*dt;
  if(canMove(player.x+dx,player.y)) player.x+=dx;
  if(canMove(player.x,player.y+dy)) player.y+=dy;
  if(!ghostSeen && player.y>14.6) triggerGhost();
  if(ghostVisible && now-ghostStart>4800){
    ghostVisible=false;
    showToast('……消えた。',1700);
    setNoa('……消えた。\n\nそのまま出口へ。\n戻って確認しなくていい。');
  }
  if(ghostSeen && player.y>28.55 && !escaped){
    escaped=true; running=false; ending.style.display='flex';
    setNoa('外に出た。\n\nもう振り返らなくていい。');
  }
  if(shake>0) shake=Math.max(0,shake-dt*1.5);
  clockEl.textContent = player.y>14 ? '00:03' : '00:02';
}
function wallColor(type, side, d, inGym){
  let base;
  if(type===2) base=[47,72,75];
  else if(type===3) base=[15,35,42];
  else if(type===4) base=[104,105,100];
  else if(type===5) base=[37,92,71];
  else base = inGym ? [139,143,140] : [92,103,102];
  let k=Math.max(.18,1-d*.055)*(side?0.78:1);
  if(type===5) k*=1.22;
  return `rgb(${base.map(v=>Math.min(255,Math.floor(v*k))).join(',')})`;
}
function castAndDraw(){
  const inGym = player.y>22.2;
  const sx = shake ? (Math.random()-.5)*shake*3 : 0;
  const sy = shake ? (Math.random()-.5)*shake*2 : 0;
  ctx.save(); ctx.translate(sx,sy);
  // ceiling / floor
  let g=ctx.createLinearGradient(0,0,0,H/2);
  g.addColorStop(0,inGym?'#182024':'#05090b'); g.addColorStop(1,inGym?'#293033':'#0d1416');
  ctx.fillStyle=g; ctx.fillRect(-4,-4,W+8,H/2+4);
  let fg=ctx.createLinearGradient(0,H/2,0,H);
  fg.addColorStop(0,inGym?'#4c473e':'#121719'); fg.addColorStop(1,inGym?'#2a2926':'#050708');
  ctx.fillStyle=fg; ctx.fillRect(-4,H/2,W+8,H/2+4);

  for(let x=0;x<W;x++){
    const camX=2*x/W-1;
    const rayA=player.a + Math.atan(camX*Math.tan(FOV/2));
    const rayDirX=Math.cos(rayA), rayDirY=Math.sin(rayA);
    let mapX=Math.floor(player.x), mapY=Math.floor(player.y);
    const deltaX=Math.abs(1/(rayDirX||1e-9)), deltaY=Math.abs(1/(rayDirY||1e-9));
    let stepX, stepY, sideX, sideY;
    if(rayDirX<0){stepX=-1;sideX=(player.x-mapX)*deltaX;} else {stepX=1;sideX=(mapX+1-player.x)*deltaX;}
    if(rayDirY<0){stepY=-1;sideY=(player.y-mapY)*deltaY;} else {stepY=1;sideY=(mapY+1-player.y)*deltaY;}
    let hit=0, side=0, loops=0;
    while(!hit && loops++<64){
      if(sideX<sideY){sideX+=deltaX;mapX+=stepX;side=0;} else {sideY+=deltaY;mapY+=stepY;side=1;}
      hit=cell(mapX,mapY);
    }
    let perp;
    if(side===0) perp=(mapX-player.x+(1-stepX)/2)/(rayDirX||1e-9);
    else perp=(mapY-player.y+(1-stepY)/2)/(rayDirY||1e-9);
    perp=Math.max(.04,perp*Math.cos(rayA-player.a));
    depth[x]=perp;
    const line=Math.min(H*2,H/perp*1.05);
    const y0=(H-line)/2;
    ctx.fillStyle=wallColor(hit,side,perp,inGym);
    ctx.fillRect(x,y0,1,line);
    // subtle wall seam/light glint
    if(perp<10 && x%17===0){ctx.fillStyle='rgba(220,240,240,.03)';ctx.fillRect(x,y0,1,line);}
  }
  drawGymLights();
  if(ghostVisible) drawGhost();
  drawExit();
  // vignette / flashlight
  ctx.restore();
  ctx.save();
  let dark=flashlight ? (inGym?.35:.68) : (inGym?.62:.88);
