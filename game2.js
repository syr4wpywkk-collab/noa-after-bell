function drawGymLights(){
  if(player.y<14) return;
  const lights=[{x:4.3,y:25.5},{x:7.5,y:25.5},{x:10.7,y:25.5}];
  for(const l of lights){
    const dx=l.x-player.x,dy=l.y-player.y,d=Math.hypot(dx,dy),a=normAng(Math.atan2(dy,dx)-player.a);
    if(Math.abs(a)>FOV*.65) continue;
    const sx=(.5+a/FOV)*W, sz=Math.min(34,160/d);
    const ix=Math.max(0,Math.min(W-1,sx|0)); if(d>depth[ix]) continue;
    const gr=ctx.createRadialGradient(sx,H*.33,0,sx,H*.33,sz);
    gr.addColorStop(0,'rgba(235,250,252,.22)');gr.addColorStop(1,'rgba(235,250,252,0)');
    ctx.fillStyle=gr;ctx.fillRect(sx-sz,H*.33-sz,sz*2,sz*2);
  }
}
function drawGhost(){
  const dx=ghost.x-player.x,dy=ghost.y-player.y,d=Math.hypot(dx,dy);
  const a=normAng(Math.atan2(dy,dx)-player.a);
  if(Math.abs(a)>FOV*.58 || d<.5) return;
  const sx=(.5+a/FOV)*W; const ix=Math.max(0,Math.min(W-1,sx|0));
  if(d>depth[ix]+.15) return;
  const size=Math.min(150,210/d); const baseY=H/2+size*.72;
  ctx.save(); ctx.globalAlpha=Math.max(.28,Math.min(.92,1-d/30));
  const aura=ctx.createRadialGradient(sx,baseY-size*.65,2,sx,baseY-size*.55,size*.85);
  aura.addColorStop(0,'rgba(220,235,236,.13)');aura.addColorStop(1,'rgba(210,230,230,0)');
  ctx.fillStyle=aura;ctx.fillRect(sx-size,baseY-size*1.6,size*2,size*1.8);
  // robe
  ctx.fillStyle='rgba(193,204,202,.88)';ctx.beginPath();ctx.moveTo(sx-size*.22,baseY-size*.82);ctx.quadraticCurveTo(sx,baseY-size*.96,sx+size*.22,baseY-size*.82);ctx.lineTo(sx+size*.34,baseY);ctx.lineTo(sx-size*.34,baseY);ctx.closePath();ctx.fill();
  // head
  ctx.fillStyle='rgba(200,208,205,.90)';ctx.beginPath();ctx.ellipse(sx,baseY-size*1.03,size*.17,size*.21,0,0,Math.PI*2);ctx.fill();
  // hair covering face
  ctx.fillStyle='rgba(3,5,6,.94)';ctx.beginPath();ctx.ellipse(sx,baseY-size*1.02,size*.22,size*.31,0,Math.PI,Math.PI*2);ctx.fill();
  ctx.fillRect(sx-size*.19,baseY-size*1.08,size*.38,size*.36);
  ctx.restore();
}
function drawExit(){
  const ex=7.5,ey=29.6,dx=ex-player.x,dy=ey-player.y,d=Math.hypot(dx,dy),a=normAng(Math.atan2(dy,dx)-player.a);
  if(Math.abs(a)>FOV*.6) return;
  const sx=(.5+a/FOV)*W; const ix=Math.max(0,Math.min(W-1,sx|0)); if(d>depth[ix]+.35) return;
  const s=Math.min(56,120/d);
  ctx.save();ctx.font=`700 ${Math.max(7,s*.34)}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='rgba(132,245,184,.85)';ctx.shadowColor='rgba(90,255,170,.65)';ctx.shadowBlur=9;ctx.fillText('EXIT',sx,H/2-s*.7);ctx.restore();
}
function frame(now){
  const dt=Math.min(.033,(now-last)/1000); last=now;
  if(running) update(dt,now);
  castAndDraw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Controls: keyboard/mouse fallback.
addEventListener('keydown',e=>{keys.add(e.code); if(e.code==='KeyF')toggleFlash(); if(e.code==='KeyP'||e.code==='Tab'){e.preventDefault();togglePhone();}});
addEventListener('keyup',e=>keys.delete(e.code));
let mouseDown=false,lastMX=0;
canvas.addEventListener('mousedown',e=>{mouseDown=true;lastMX=e.clientX;});
addEventListener('mouseup',()=>mouseDown=false);
addEventListener('mousemove',e=>{if(mouseDown&&!phoneOpen){player.a+= (e.clientX-lastMX)*.004;lastMX=e.clientX;}});

// Touch joystick.
let stickId=null,stickCX=0,stickCY=0;
leftZone.addEventListener('pointerdown',e=>{
  if(stickId!==null) return; stickId=e.pointerId; leftZone.setPointerCapture(e.pointerId);
  const r=stickBase.getBoundingClientRect(); stickCX=r.left+r.width/2; stickCY=r.top+r.height/2; updateStick(e.clientX,e.clientY);
});
leftZone.addEventListener('pointermove',e=>{if(e.pointerId===stickId)updateStick(e.clientX,e.clientY);});
leftZone.addEventListener('pointerup',e=>{if(e.pointerId===stickId)releaseStick();});
leftZone.addEventListener('pointercancel',e=>{if(e.pointerId===stickId)releaseStick();});
function updateStick(x,y){
  const r=stickBase.getBoundingClientRect(),max=r.width*.34; let dx=x-stickCX,dy=y-stickCY; const m=Math.hypot(dx,dy); if(m>max){dx*=max/m;dy*=max/m;}
  player.moveX=dx/max;player.moveY=dy/max; stickKnob.style.transform=`translate(${dx}px,${dy}px)`;
}
function releaseStick(){stickId=null;player.moveX=0;player.moveY=0;stickKnob.style.transform='translate(0,0)';}

// Right-side swipe look.
let lookId=null,lastLX=0;
lookZone.addEventListener('pointerdown',e=>{if(e.target.closest('button')||phoneOpen)return;lookId=e.pointerId;lastLX=e.clientX;lookZone.setPointerCapture(e.pointerId);});
lookZone.addEventListener('pointermove',e=>{if(e.pointerId!==lookId||phoneOpen)return;const dx=e.clientX-lastLX;player.a+=dx*.006;lastLX=e.clientX;});
lookZone.addEventListener('pointerup',e=>{if(e.pointerId===lookId)lookId=null;});
lookZone.addEventListener('pointercancel',e=>{if(e.pointerId===lookId)lookId=null;});

function toggleFlash(){flashlight=!flashlight; flashBtn.style.opacity=flashlight?'1':'.45';}
function togglePhone(){phoneOpen=!phoneOpen;phone.classList.toggle('open',phoneOpen);}
flashBtn.addEventListener('pointerdown',e=>{e.stopPropagation();toggleFlash();});
phoneBtn.addEventListener('pointerdown',e=>{e.stopPropagation();togglePhone();});
phone.addEventListener('pointerdown',e=>e.stopPropagation());
fsBtn.addEventListener('click',async()=>{try{if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{}});

function startAudio(){
  try{
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    humOsc=audioCtx.createOscillator();humGain=audioCtx.createGain();
    humOsc.type='sine';humOsc.frequency.value=58;humGain.gain.value=.018;
    const f=audioCtx.createBiquadFilter();f.type='lowpass';f.frequency.value=130;
    humOsc.connect(f).connect(humGain).connect(audioCtx.destination);humOsc.start();
  }catch{}
}
function sting(){
  if(!audioCtx)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(95,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(42,audioCtx.currentTime+.7);g.gain.setValueAtTime(.0001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.055,audioCtx.currentTime+.03);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.8);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.82);
}
document.getElementById('startBtn').addEventListener('click',()=>{start.style.display='none';reset();running=true;last=performance.now();startAudio();});
document.getElementById('retryBtn').addEventListener('click',()=>{reset();running=true;last=performance.now();});
addEventListener('contextmenu',e=>e.preventDefault());
