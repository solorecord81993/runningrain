import * as THREE from 'three';

const names = ['height','speed','intensity','depth','heightOut','speedOut','intensityOut','depthOut','directionOut','rainJoystick','joyThumb','toggleControls','closeControls','controlsBackdrop','controlsPanel','total','headHits','torsoHits','armHits','legHits','headDrops','torsoDrops','armDrops','legDrops','water','timeText','accumulated','chart','chartStart','chartEnd','scene','sceneCaption','rainVector','pause','reset','resetView'];
const el = Object.fromEntries(names.map(id => [id, document.getElementById(id)]));
const fmt = n => Math.round(n).toLocaleString('th-TH');
const fmtRate = n => n.toLocaleString('th-TH',{maximumFractionDigits:2,minimumFractionDigits:2});
const dropVolume = Math.PI/6*.002**3;
const equivalentMmH = dropsPerSecond => dropsPerSecond*dropVolume*3600*1000/(.255*params.height*.78*params.height);
const joystick = {x:0,y:22/65*2-1};
const getParams = () => {const depth=+el.depth.value/100,lateral=-joystick.x,scale=Math.min(1,Math.hypot(lateral,depth));return {height:+el.height.value/100,speed:+el.speed.value/3.6,rain:+el.intensity.value,tilt:(joystick.y+1)/2*65*Math.PI/180,az:scale<.01?0:Math.atan2(lateral,-depth),directionScale:scale};};
let params = getParams(), running = true, elapsed = 0, cumulative = 0, posePhase = 0, lastFrame = performance.now(), nextSample = 0, secondBucket = 0, bucketTime = 0, nextGraph = 1;
let current = {head:0,torso:0,arms:0,legs:0,total:0}, series = [{t:0,r:0,rain:params.rain}];
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x102d42,.08);
const camera = new THREE.PerspectiveCamera(38,1,.1,70);
let orbit = -.76, elev = .38;
function moveCamera(){let radius=4.6;camera.position.set(Math.cos(orbit)*Math.cos(elev)*radius,1.05+Math.sin(elev)*radius,Math.sin(orbit)*Math.cos(elev)*radius);camera.lookAt(0,.9,0)}
moveCamera();
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas:el.scene,antialias:true,alpha:true,powerPreference:'low-power'}); renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.55; }
catch(error){el.sceneCaption.textContent='อุปกรณ์นี้ไม่สามารถแสดงภาพสามมิติได้';el.total.textContent='—';throw error}
scene.add(new THREE.HemisphereLight(0xc5eeff,0x16344b,2.4));
const key = new THREE.DirectionalLight(0xffffff,2.35);key.position.set(3,6,4);scene.add(key);
const rim = new THREE.DirectionalLight(0x64d9ff,1.5);rim.position.set(-4,3,-3);scene.add(rim);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x143146,roughness:1,transparent:true,opacity:.82}));ground.rotation.x=-Math.PI/2;ground.position.y=-.023;scene.add(ground);
const grid = new THREE.GridHelper(18,36,0x386c81,0x285165);grid.position.y=-.015;grid.material.opacity=.36;grid.material.transparent=true;scene.add(grid);
const ring = new THREE.Mesh(new THREE.RingGeometry(.73,.76,72),new THREE.MeshBasicMaterial({color:0x62d6f1,transparent:true,opacity:.33,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.008;scene.add(ring);
const heading=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(-.55,.025,-.69),1.1,0xf8ba70,.22,.12);scene.add(heading);
const mat=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness,metalness:.03,side:THREE.DoubleSide});
const skin=mat(0xe7a982),hair=mat(0x173248),shirt=mat(0x308daf),shirtDark=mat(0x216981),trousers=mat(0x1d506c),shoes=mat(0x111f31),joint=mat(0x2b7291);
const figure=new THREE.Group();scene.add(figure);const targets=[];
function part(parent,geometry,material,name,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.userData.part=name;parent.add(m);targets.push(m);return m}
function orb(parent,radius,material,name,x,y,z,sx=1,sy=1,sz=1){let m=part(parent,new THREE.SphereGeometry(radius,12,9),material,name,x,y,z);m.scale.set(sx,sy,sz);return m}
function limb(parent,length,top,bottom,material,name){let m=part(parent,new THREE.CylinderGeometry(top,bottom,length,12),material,name,0,-length/2,0);return m}
orb(figure,.20,trousers,'torso',0,.91,0,1.04,.65,1.26);
const body=new THREE.Group();body.position.y=.91;figure.add(body);
part(body,new THREE.CylinderGeometry(.175,.22,.52,15),shirt,'torso',0,.26,0).scale.z=1.28;
orb(body,.18,shirt,'torso',0,.48,0,1.08,.52,1.35);
orb(body,.10,skin,'head',0,.57,0,.75,1,.75);
orb(body,.145,skin,'head',0,.76,0,.86,1.07,.86);
const hairMesh=orb(body,.148,hair,'head',0,.818,-.018,.89,.46,.9);
const eyeMaterial=mat(0x173147);orb(body,.011,eyeMaterial,'head',.11,.77,.052,.5,1,1);orb(body,.011,eyeMaterial,'head',.11,.77,-.052,.5,1,1);
const armPivots=[],elbows=[],legPivots=[],knees=[];
for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(0,.48,side*.26);body.add(arm);armPivots.push(arm);
  orb(arm,.075,shirtDark,'arms',0,-.03,0);limb(arm,.27,.069,.054,shirtDark,'arms');
  const elbow=new THREE.Group();elbow.position.y=-.27;arm.add(elbow);elbows.push(elbow);
  orb(elbow,.055,joint,'arms',0,0,0);limb(elbow,.25,.052,.034,skin,'arms');orb(elbow,.037,skin,'arms',0,-.27,0,.8,1.2,.8);
  const hip=new THREE.Group();hip.position.set(0,.82,side*.12);figure.add(hip);legPivots.push(hip);
  orb(hip,.093,trousers,'legs',0,-.035,0);limb(hip,.39,.103,.077,trousers,'legs');
  const knee=new THREE.Group();knee.position.y=-.39;hip.add(knee);knees.push(knee);
  orb(knee,.075,trousers,'legs',0,0,0);limb(knee,.35,.07,.052,trousers,'legs');
  orb(knee,.08,shoes,'legs',.065,-.37,0,1.8,.58,1);
}
function pose(phase){let motion=Math.min(1,params.speed/3.3),run=Math.max(0,Math.min(1,(params.speed-2.5)/3));
  let swing=motion*(.36+.36*run),s=Math.sin(phase),other=-s;
  legPivots[0].rotation.z=s*swing;legPivots[1].rotation.z=-s*swing;
  knees[0].rotation.z=-Math.max(0,other)*(.08+.76*motion);knees[1].rotation.z=-Math.max(0,s)*(.08+.76*motion);
  armPivots[0].rotation.z=-s*(swing*.83);armPivots[1].rotation.z=s*(swing*.83);
  elbows[0].rotation.z=(.1+run*.9)*(1+.25*Math.max(0,s));elbows[1].rotation.z=(.1+run*.9)*(1+.25*Math.max(0,-s));
  body.rotation.z=-.08*run;figure.position.y=motion*.018*Math.abs(Math.sin(phase));figure.scale.setScalar(params.height/1.7);
  figure.updateMatrixWorld(true);
}
pose(0);
const raycaster=new THREE.Raycaster();raycaster.far=8;
const direction=new THREE.Vector3(),u=new THREE.Vector3(),v=new THREE.Vector3(),center=new THREE.Vector3(),origin=new THREE.Vector3();
const box=new THREE.Box3(),corner=new THREE.Vector3(),relative=new THREE.Vector3();
const hits=[],count={head:0,torso:0,arms:0,legs:0};
function rainVelocity(){const fall=7,horiz=fall*Math.tan(params.tilt)*params.directionScale;return new THREE.Vector3(-horiz*Math.cos(params.az)-params.speed,-fall,horiz*Math.sin(params.az))}
function sampleRate(){
  if(params.rain===0)return {head:0,torso:0,arms:0,legs:0,total:0};
  const velocity=rainVelocity(),magnitude=velocity.length();direction.copy(velocity).normalize();
  raycaster.far=8;
  u.set(0,0,1).cross(direction).normalize();v.copy(direction).cross(u).normalize();
  box.setFromObject(figure);box.getCenter(center);
  let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity;
  for(let ix=0;ix<2;ix++)for(let iy=0;iy<2;iy++)for(let iz=0;iz<2;iz++){
    corner.set(ix?box.max.x:box.min.x,iy?box.max.y:box.min.y,iz?box.max.z:box.min.z).sub(center);
    let a=corner.dot(u),b=corner.dot(v);minU=Math.min(minU,a);maxU=Math.max(maxU,a);minV=Math.min(minV,b);maxV=Math.max(maxV,b);
  }
  const margin=.025,minA=minU-margin,minB=minV-margin,width=maxU-minU+margin*2,height=maxV-minV+margin*2;
  count.head=count.torso=count.arms=count.legs=0;
  // Deterministic stratified rays reduce flicker and count only the first body surface hit.
  const N=window.matchMedia('(max-width: 850px)').matches?18:22;
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){
    origin.copy(center).addScaledVector(u,minA+(i+.5)*width/N).addScaledVector(v,minB+(j+.5)*height/N).addScaledVector(direction,-3);
    raycaster.set(origin,direction);hits.length=0;raycaster.intersectObjects(targets,false,hits);
    if(hits.length)count[hits[0].object.userData.part]++;
  }
  const density=(params.rain/1000/3600)/dropVolume/7;
  let factor=density*magnitude*width*height/(N*N);
  return {head:count.head*factor,torso:count.torso*factor,arms:count.arms*factor,legs:count.legs*factor,total:(count.head+count.torso+count.arms+count.legs)*factor};
}
function updateLabels(){
  el.heightOut.textContent=el.height.value+' ซม.';el.speedOut.textContent=el.speed.value+' กม./ชม.';el.intensityOut.textContent=el.intensity.value+' มม./ชม.';
  const tilt=Math.round(params.tilt*180/Math.PI),depth=+el.depth.value;
  const side=joystick.x<-.18?'ซ้าย':joystick.x>.18?'ขวา':'';
  const along=depth< -15?'หน้า':depth>15?'หลัง':'';
  const from=[along,side].filter(Boolean).join('–');
  el.depthOut.textContent=depth< -15?'จากหน้า':depth>15?'จากหลัง':'กึ่งกลาง';
  el.directionOut.textContent=(from?'จาก'+from:'แนวดิ่ง')+' · '+tilt+'°';
  el.rainVector.textContent='↘ ฝน'+(from?'จาก'+from:'แนวดิ่ง')+' · '+tilt+'°';
  el.joyThumb.style.left=(50+joystick.x*36)+'%';el.joyThumb.style.top=(50+joystick.y*36)+'%';
  el.rainJoystick.setAttribute('aria-valuenow',String(tilt));el.rainJoystick.setAttribute('aria-valuetext',(from?'จาก'+from:'แนวดิ่ง')+' เอียง '+tilt+' องศา');
  el.sceneCaption.textContent=params.speed?'เดิน / วิ่ง '+el.speed.value+' กม./ชม. · หมุนภาพได้':'ยืนนิ่ง · หมุนภาพได้';
}
function updateInputs(){params=getParams();updateLabels();pose(posePhase);current=sampleRate();updateResult()}
for(const id of ['height','speed','intensity','depth'])el[id].addEventListener('input',updateInputs);
function setJoystick(e){const rect=el.rainJoystick.getBoundingClientRect(),radius=rect.width*.36;let x=(e.clientX-rect.left-rect.width/2)/radius,y=(e.clientY-rect.top-rect.height/2)/radius;const length=Math.hypot(x,y);if(length>1){x/=length;y/=length}joystick.x=x;joystick.y=y;updateInputs()}
let joyPointer=null;
el.rainJoystick.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;el.rainJoystick.setPointerCapture(e.pointerId);setJoystick(e)});
el.rainJoystick.addEventListener('pointermove',e=>{if(joyPointer===e.pointerId)setJoystick(e)});
for(const type of ['pointerup','pointercancel'])el.rainJoystick.addEventListener(type,e=>{if(joyPointer===e.pointerId)joyPointer=null});
el.rainJoystick.addEventListener('keydown',e=>{const keys={ArrowLeft:[-.1,0],ArrowRight:[.1,0],ArrowUp:[0,-.1],ArrowDown:[0,.1]};if(!keys[e.key])return;e.preventDefault();joystick.x=Math.max(-1,Math.min(1,joystick.x+keys[e.key][0]));joystick.y=Math.max(-1,Math.min(1,joystick.y+keys[e.key][1]));updateInputs()});
function setControlsOpen(open){el.controlsPanel.classList.toggle('open',open);document.body.classList.toggle('controls-open',open);el.toggleControls.setAttribute('aria-expanded',String(open));if(open)el.closeControls.focus();else el.toggleControls.focus()}
el.toggleControls.onclick=()=>setControlsOpen(!el.controlsPanel.classList.contains('open'));
el.closeControls.onclick=()=>setControlsOpen(false);el.controlsBackdrop.onclick=()=>setControlsOpen(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&el.controlsPanel.classList.contains('open'))setControlsOpen(false)});
function timeString(t){let m=Math.floor(t/60),s=Math.floor(t%60);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function updateResult(){el.total.textContent=fmtRate(equivalentMmH(current.total));for(const [key,id,small] of [['head','headHits','headDrops'],['torso','torsoHits','torsoDrops'],['arms','armHits','armDrops'],['legs','legHits','legDrops']]){el[id].textContent=fmtRate(equivalentMmH(current[key]));el[small].textContent='≈ '+fmt(current[key])+' หยด/วินาที'}el.water.textContent='มม./ชม. · ≈ '+fmt(current.total)+' หยด/วินาที';el.timeText.textContent=timeString(elapsed);el.accumulated.textContent='สะสมประมาณ '+fmt(cumulative)+' หยด'}
function resetRun(){elapsed=0;cumulative=0;posePhase=0;nextSample=0;secondBucket=0;bucketTime=0;nextGraph=1;series=[{t:0,r:0,rain:params.rain}];pose(0);current=sampleRate();updateResult();drawChart()}
el.pause.onclick=()=>{running=!running;el.pause.textContent=running?'หยุดภาพ':'เล่นต่อ';el.pause.setAttribute('aria-label',running?'หยุดภาพเคลื่อนไหว':'เล่นภาพเคลื่อนไหว')};
el.reset.onclick=resetRun;el.resetView.onclick=()=>{orbit=-.76;elev=.38;moveCamera()};
let drag=null;el.scene.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};el.scene.setPointerCapture(e.pointerId)});
el.scene.addEventListener('pointermove',e=>{if(!drag)return;orbit-=(e.clientX-drag.x)*.007;elev=Math.max(.1,Math.min(.78,elev+(e.clientY-drag.y)*.004));drag={x:e.clientX,y:e.clientY};moveCamera()});
for(const event of ['pointerup','pointercancel'])el.scene.addEventListener(event,()=>drag=null);
// Rain is a small visual sample. The per-second estimator above uses many more rays.
const dropCount=window.matchMedia('(max-width: 850px)').matches?100:155,positions=new Float32Array(dropCount*6),drops=[];
const dropGeometry=new THREE.BufferGeometry();dropGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
const rainLines=new THREE.LineSegments(dropGeometry,new THREE.LineBasicMaterial({color:0x9deaff,transparent:true,opacity:.64}));scene.add(rainLines);
const maxSplashes=256,splashGeometry=new THREE.BufferGeometry(),splashPositions=new Float32Array(maxSplashes*3);splashGeometry.setAttribute('position',new THREE.BufferAttribute(splashPositions,3));splashGeometry.setDrawRange(0,0);
const splashPoints=new THREE.Points(splashGeometry,new THREE.PointsMaterial({color:0xcaf8ff,size:.075,transparent:true,opacity:.95,depthWrite:false}));scene.add(splashPoints);
const splashes=[];
function emitSplash(hit){const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld),point=hit.point.clone().addScaledVector(normal,.025);
  for(let j=0;j<7;j++){const speed=.4+Math.random()*.75;splashes.push({x:point.x,y:point.y,z:point.z,vx:normal.x*speed+(Math.random()-.5)*.95,vy:normal.y*speed+Math.random()*.75,vz:normal.z*speed+(Math.random()-.5)*.95,age:0,life:.26+Math.random()*.24})}
  if(splashes.length>maxSplashes)splashes.splice(0,splashes.length-maxSplashes);
}
function spawn(){return {x:(Math.random()-.5)*3.8,y:1.9+Math.random()*2.5,z:(Math.random()-.5)*3.8}}
for(let i=0;i<dropCount;i++){let d=spawn();d.y=Math.random()*4;drops.push(d)}
const previous=new THREE.Vector3(),end=new THREE.Vector3(),segment=new THREE.Vector3();
function animateRain(dt){rainLines.visible=splashPoints.visible=params.rain>0;
  if(params.rain===0)return;
  let vel=rainVelocity().multiplyScalar(.55),fraction=Math.min(1,params.rain/13);
  for(let i=0;i<dropCount;i++){
    let p=drops[i];if(running){previous.set(p.x,p.y,p.z);end.copy(previous).addScaledVector(vel,dt);segment.subVectors(end,previous);let len=segment.length();
      if(len){raycaster.set(previous,segment.normalize());raycaster.far=len;hits.length=0;raycaster.intersectObjects(targets,false,hits);if(hits.length){emitSplash(hits[0]);p=spawn();drops[i]=p}else{p.x=end.x;p.y=end.y;p.z=end.z}}
      if(p.y<0||Math.abs(p.x)>2.8||Math.abs(p.z)>2.8){p=spawn();drops[i]=p}
    }
    let o=i*6,shown=(i/dropCount)<fraction;positions[o]=p.x;positions[o+1]=shown?p.y:-10;positions[o+2]=p.z;positions[o+3]=p.x-vel.x*.018;positions[o+4]=shown?p.y-vel.y*.018:-10;positions[o+5]=p.z-vel.z*.018;
  }
  dropGeometry.attributes.position.needsUpdate=true;
  for(let i=0;i<splashes.length;i++){const s=splashes[i];if(running){s.age+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;s.vy-=3*dt}if(s.age>s.life){splashes.splice(i--,1);continue}}
  for(let i=0;i<splashes.length;i++){const s=splashes[i],o=i*3;splashPositions[o]=s.x;splashPositions[o+1]=s.y;splashPositions[o+2]=s.z}
  splashGeometry.setDrawRange(0,splashes.length);
  splashGeometry.attributes.position.needsUpdate=true;
}
const chartCtx=el.chart.getContext('2d');
function drawChart(){let rect=el.chart.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=rect.width,h=rect.height;if(!w||!h)return;
  if(el.chart.width!==Math.round(w*dpr)||el.chart.height!==Math.round(h*dpr)){el.chart.width=Math.round(w*dpr);el.chart.height=Math.round(h*dpr)}chartCtx.setTransform(dpr,0,0,dpr,0,0);chartCtx.clearRect(0,0,w,h);
  let left=42,right=w-12,top=13,bottom=h-20,tStart=Math.max(0,elapsed-60),span=Math.max(10,Math.min(60,elapsed+1-tStart));
  let visible=series.filter(p=>p.t>=tStart-1),max=Math.max(1,equivalentMmH(current.total),params.rain,...visible.flatMap(p=>[p.r,p.rain]))*1.18;
  chartCtx.font='12px system-ui';chartCtx.lineWidth=1;for(let i=0;i<=3;i++){let y=top+(bottom-top)*i/3;chartCtx.strokeStyle='#6ba3b83d';chartCtx.beginPath();chartCtx.moveTo(left,y);chartCtx.lineTo(right,y);chartCtx.stroke();chartCtx.fillStyle='#afc9d5';chartCtx.fillText(fmt(max*(1-i/3)),3,y+4)}
  const x=t=>left+Math.max(0,Math.min(1,(t-tStart)/span))*(right-left),y=r=>bottom-r/max*(bottom-top);
  for(const [key,color,dashed] of [['rain','#f8b970',true],['r','#69d9ff',false]]){
    chartCtx.beginPath();visible.forEach((p,i)=>i?chartCtx.lineTo(x(p.t),y(p[key])):chartCtx.moveTo(x(p.t),y(p[key])));
    if(visible.length===1)chartCtx.lineTo(x(Math.max(elapsed,.1)),y(visible[0][key]));
    chartCtx.strokeStyle=color;chartCtx.lineWidth=dashed?1.8:2.6;chartCtx.setLineDash(dashed?[5,5]:[]);chartCtx.lineJoin='round';chartCtx.stroke();chartCtx.setLineDash([]);
  }
  el.chartStart.textContent=fmt(tStart)+' วินาที';el.chartEnd.textContent=fmt(elapsed)+' วินาที';
}
const resize=()=>{let r=el.scene.getBoundingClientRect();if(r.width&&r.height){renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}drawChart()};new ResizeObserver(resize).observe(el.scene);new ResizeObserver(drawChart).observe(el.chart);resize();
updateInputs();drawChart();
function frame(now){let dt=Math.min(.07,(now-lastFrame)/1000||0);lastFrame=now;
  if(running&&document.visibilityState!=='hidden'){
    elapsed+=dt;let cadence=params.speed>0?1.1+Math.min(1,params.speed/4)*1.25:0;posePhase+=dt*cadence*Math.PI*2;
    pose(posePhase);
    if(elapsed>=nextSample){current=sampleRate();nextSample=elapsed+.24}
    cumulative+=current.total*dt;secondBucket+=current.total*dt;bucketTime+=dt;
    if(elapsed>=nextGraph){let value=secondBucket/Math.max(.001,bucketTime);series.push({t:Math.floor(elapsed),r:equivalentMmH(value),rain:params.rain});if(series.length>124)series.shift();nextGraph=Math.floor(elapsed)+1;secondBucket=0;bucketTime=0;drawChart()}
    updateResult();
  }
  animateRain(dt);renderer.render(scene,camera);requestAnimationFrame(frame)
}
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}), { once: true });
}
if(document.modelContext?.registerTool){
  try{void Promise.resolve(document.modelContext.registerTool({
    name:'configure_rain_simulation',title:'ปรับแบบจำลองฝน',
    description:'Set height, speed, rainfall, tilt, and 3D rain direction for the ongoing simulation.',
    inputSchema:{type:'object',properties:{heightCm:{type:'number',minimum:130,maximum:205},speedKmh:{type:'number',minimum:0,maximum:20},rainMmH:{type:'number',minimum:0,maximum:40},tiltDeg:{type:'number',minimum:0,maximum:65},directionDeg:{type:'integer',enum:[0,45,90,135,180,225,270,315]}},additionalProperties:false},
    annotations:{readOnlyHint:false},
    execute(input){
      const bounds={heightCm:[130,205],speedKmh:[0,20],rainMmH:[0,40],tiltDeg:[0,65],directionDeg:[0,315]};
      if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid configuration');
      for(const [key,value] of Object.entries(input))if(!(key in bounds)||typeof value!=='number'||!Number.isFinite(value)||value<bounds[key][0]||value>bounds[key][1]||(key==='directionDeg'&&value%45!==0))throw Error('Invalid '+key);
      for(const [key,id] of [['heightCm','height'],['speedKmh','speed'],['rainMmH','intensity']])if(input[key]!==undefined)el[id].value=input[key];
      if(input.tiltDeg!==undefined)joystick.y=input.tiltDeg/65*2-1;
      if(input.directionDeg!==undefined){const angle=input.directionDeg*Math.PI/180;joystick.x=-Math.sin(angle);el.depth.value=Math.round(-Math.cos(angle)*100)}
      const length=Math.hypot(joystick.x,joystick.y);if(length>1){joystick.x/=length;joystick.y/=length}
      updateInputs();return {dropsPerSecond:Math.round(current.total),elapsedSeconds:Math.round(elapsed)};
    }
  })).catch(()=>{})}catch(_error){}
}
