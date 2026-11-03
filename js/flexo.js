// Presse flexo à tambour central : 8 groupes, une encre par branche de l'étoile.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PETAL_INKS } from './art.js?v=11';

const R = 3, W = 3.4, WEB_W = 2.9;
const N = 8, SPAN = 34 * Math.PI/180;
const THETA = Array.from({length:N}, (_,i) => Math.PI + (i-3.5)*SPAN);
const WEB_START = 28*Math.PI/180, WEB_LEN = 304*Math.PI/180;

const WEB_VS = `
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vUv = uv; vN = normalize(normalMatrix*normal);
  vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz;
  gl_Position = projectionMatrix*viewMatrix*w; }`;
const WEB_FS = `
uniform float uPhi; uniform float uThetas[8]; uniform vec3 uInk[8];
uniform float uMode; uniform float uStart; uniform float uLen; uniform float uOff;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
#define PI 3.14159265
void main(){
  float th; float s;
  if(uMode < .5){ th = uStart + vUv.x*uLen; s = (th - uPhi)*${R.toFixed(1)}; }
  else { th = 99.; s = vUv.x*uLen - uPhi*${R.toFixed(1)} + uOff; }
  if(uMode > 1.5) th = -99.;
  float v = vUv.y * 2.9;
  vec2 cell = vec2(s, v) / 0.96;
  vec2 id = floor(cell); vec2 c = (fract(cell)-.5)*2.;
  // légère rotation alternée des étiquettes
  float r = length(c), a = atan(c.x, c.y);
  vec3 col = vec3(.96,.955,.94);
  // fond étiquette (découpe arrondie)
  vec2 q = abs(c) - vec2(.78);
  float lab = length(max(q,0.)) + min(max(q.x,q.y),0.) - .14;
  float labM = smoothstep(.02,0.,lab);
  col = mix(col, vec3(1.), labM);
  // cadre de découpe
  col = mix(col, vec3(.75), smoothstep(.015,0.,abs(lab))*.6);
  // étoile-ruban du logo : pointe k = groupe k
  float sec = PI/4.;
  float aa = mod(a + PI/4. + sec*.5, 2.*PI);
  float k = floor(aa/sec);
  float lt = aa - k*sec - sec*.5;           // -sec/2..sec/2, 0 = axe de la pointe
  float dp = abs(lt)/(sec*.5);
  float rOut = mix(.74, .42, dp), rIn = mix(.30, .19, dp);
  float band = smoothstep(.012,0., r - rOut) * smoothstep(0.,.012, r - rIn);
  for(int i=0;i<8;i++){
    float on = 1. - step(.5, abs(k - float(i)));
    float printed = smoothstep(uThetas[i]-.03, uThetas[i]+.03, th);
    vec3 ink = uInk[i] * (lt < 0. ? 1.15 : .85);
    col = mix(col, ink, band*on*printed*labM);
  }
  // repères & texte (barre)
  float bar = step(.86, fract(v/2.9*1.)) ;
  vec3 N = normalize(vN);
  vec3 L = normalize(vec3(.4,.8,.6));
  float dif = .55 + .45*max(dot(N,L),0.);
  vec3 V = normalize(cameraPosition - vW);
  float sp = pow(max(dot(reflect(-L,N),V),0.), 30.)*.35;
  float rim = pow(1.-max(dot(N,V),0.), 3.)*.25;
  gl_FragColor = vec4(col*dif + sp + rim*vec3(.6,.75,1.), 1.);
  #include <colorspace_fragment>
}`;

function ringTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#b9b6ae'; x.fillRect(0,0,256,256);
  for(let r=128; r>20; r-=2){ x.strokeStyle = `rgba(0,0,0,${.05+Math.random()*.08})`; x.beginPath(); x.arc(128,128,r,0,7); x.stroke(); }
  x.fillStyle = '#5a5248'; x.beginPath(); x.arc(128,128,22,0,7); x.fill();
  x.fillStyle = '#222'; x.beginPath(); x.arc(128,128,10,0,7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function aniloxTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); x.fillStyle = '#888'; x.fillRect(0,0,128,128);
  for(let j=0;j<16;j++) for(let i=0;i<16;i++){ x.fillStyle='#333'; x.beginPath();
    x.arc(i*8+(j%2?4:0)+4, j*8+4, 2.6, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10,30); return t;
}

export function createFlexo(canvas){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x07080a, 18, 46);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 200);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;

  scene.add(new THREE.HemisphereLight(0x9fb8ff, 0x201810, .6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(6,10,12); scene.add(key);
  const rim = new THREE.DirectionalLight(0x6aa8ff, 1.6); rim.position.set(-10,4,-8); scene.add(rim);

  const press = new THREE.Group(); press.rotation.x = Math.PI/2; scene.add(press);
  const chrome = new THREE.MeshStandardMaterial({ color:0xd8dbe0, metalness:1, roughness:.18 });
  const steel = new THREE.MeshStandardMaterial({ color:0x6c7078, metalness:.9, roughness:.35 });
  const dark = new THREE.MeshStandardMaterial({ color:0x0d0e11, metalness:.4, roughness:.6 });

  // Tambour central
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(R, R, W, 160, 1), chrome);
  press.add(drum);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,W+1.6,32), steel); press.add(hub);
  // Couronne dentée arrière
  const gear = new THREE.Group(); press.add(gear);
  const ringG = new THREE.Mesh(new THREE.TorusGeometry(R*.82,.12,12,120), steel);
  ringG.rotation.x = Math.PI/2; ringG.position.y = -W/2-.2; gear.add(ringG);
  const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(.16,.18,.28), steel, 96);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for(let i=0;i<96;i++){ const a = i/96*Math.PI*2;
    e.set(0,a,0); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(Math.sin(a)*R*.95, -W/2-.2, Math.cos(a)*R*.95), q, new THREE.Vector3(1,1,1));
    teeth.setMatrixAt(i, m4); }
  gear.add(teeth);
  // Bâti arrière
  const frameShape = new THREE.Shape();
  frameShape.moveTo(-7,-7); frameShape.lineTo(7,-7); frameShape.lineTo(7,4); frameShape.quadraticCurveTo(7,7.4,0,7.6);
  frameShape.quadraticCurveTo(-7,7.4,-7,4); frameShape.closePath();
  const bati = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape,{depth:.4,bevelEnabled:true,bevelSize:.08,bevelThickness:.08,bevelSegments:2}), dark);
  bati.position.set(0,0,-W/2-.9); scene.add(bati);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(14.2,.12,.5), new THREE.MeshStandardMaterial({color:0xc1742e, emissive:0xc1742e, emissiveIntensity:.6}));
  stripe.position.set(0,-5.6,-W/2-.6); scene.add(stripe);
  // Sol
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80,80), new THREE.MeshStandardMaterial({color:0x0b0c0f, metalness:.6, roughness:.4}));
  floor.rotation.x = -Math.PI/2; floor.position.y = -7.6; scene.add(floor);

  // Bande (support)
  const inkVecs = PETAL_INKS.map(h => new THREE.Color(h));
  const mkWebMat = (mode, len, off=0) => new THREE.ShaderMaterial({
    vertexShader:WEB_VS, fragmentShader:WEB_FS, side:THREE.DoubleSide,
    uniforms:{ uPhi:{value:0}, uThetas:{value:THETA}, uInk:{value:inkVecs}, uMode:{value:mode},
      uStart:{value:WEB_START}, uLen:{value:len}, uOff:{value:off} } });
  const webMat = mkWebMat(0, WEB_LEN);
  const web = new THREE.Mesh(new THREE.CylinderGeometry(R+.025, R+.025, WEB_W, 220, 1, true, WEB_START, WEB_LEN), webMat);
  press.add(web);

  // Rouleaux de renvoi, brins droits, dérouleur / enrouleur (repère monde)
  const idlerMat = steel;
  const pIn = new THREE.Vector3(Math.sin(WEB_START)*(R+.38), -Math.cos(WEB_START)*(R+.38), 0);
  const pOut = new THREE.Vector3(Math.sin(WEB_START+WEB_LEN)*(R+.38), -Math.cos(WEB_START+WEB_LEN)*(R+.38), 0);
  [pIn,pOut].forEach(p => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,W,32), idlerMat);
    m.rotation.x = Math.PI/2; m.position.copy(p); scene.add(m); });
  const unwindP = new THREE.Vector3(5.6,-5.4,0), rewindP = new THREE.Vector3(-5.6,-5.6,0);
  const caps = ringTexture();
  const rollMat = [new THREE.MeshStandardMaterial({color:0xbfbcb4, roughness:.95}), new THREE.MeshStandardMaterial({map:caps}), new THREE.MeshStandardMaterial({map:caps})];
  const unwind = new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,WEB_W,64), rollMat);
  unwind.rotation.x = Math.PI/2; unwind.position.copy(unwindP); scene.add(unwind);
  const rewindMat = [new THREE.MeshStandardMaterial({color:0xc9b6d8, roughness:.5}), rollMat[1], rollMat[2]];
  const rewind = new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,WEB_W,64), rewindMat);
  rewind.rotation.x = Math.PI/2; rewind.position.copy(rewindP); scene.add(rewind);
  function strip(a, b, mat){
    const d = new THREE.Vector3().subVectors(b,a), len = d.length();
    const g = new THREE.PlaneGeometry(len, WEB_W);
    const m = new THREE.Mesh(g, mat);
    m.position.copy(a).add(b).multiplyScalar(.5);
    m.rotation.z = Math.atan2(d.y, d.x); m.rotation.x = Math.PI/2;
    // le plan doit contenir l'axe z (largeur) : on oriente via lookAt-like
    m.rotation.set(0,0,0);
    const xAxis = d.clone().normalize(), zAxis = new THREE.Vector3(0,0,1), yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, zAxis.clone().negate(), yAxis));
    scene.add(m); return { m, len };
  }
  const inTan = unwindP.clone().add(new THREE.Vector3(-1.5,0,0).applyAxisAngle(new THREE.Vector3(0,0,1), .9));
  const inS = strip(new THREE.Vector3(unwindP.x-1.3, unwindP.y+.75, 0), pIn.clone().add(new THREE.Vector3(.3,-.15,0)), mkWebMat(2, 1));
  const outMat = mkWebMat(1, 1);
  const outS = strip(pOut.clone().add(new THREE.Vector3(-.3,-.15,0)), new THREE.Vector3(rewindP.x+.95, rewindP.y+.55, 0), outMat);
  outMat.uniforms.uLen.value = outS.len;
  inS.m.material.uniforms.uLen.value = inS.len;

  // Groupes d'impression
  const stations = [];
  const anTex = aniloxTexture();
  THETA.forEach((th, i) => {
    const ink = new THREE.Color(PETAL_INKS[i]);
    const pos = (d) => new THREE.Vector3(Math.sin(th)*d, 0, Math.cos(th)*d);
    const g = new THREE.Group(); press.add(g);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,WEB_W+.1,48),
      new THREE.MeshStandardMaterial({ color:ink, roughness:.32, metalness:.15, emissive:ink, emissiveIntensity:.08 }));
    plate.position.copy(pos(R+.55)); g.add(plate);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,W+1.2,16), steel); shaft.position.copy(plate.position); g.add(shaft);
    const an = new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,WEB_W,48),
      new THREE.MeshStandardMaterial({ color:0xcfd3da, metalness:1, roughness:.25, bumpMap:anTex, bumpScale:.6 }));
    an.position.copy(pos(R+1.43)); g.add(an);
    const chamber = new THREE.Mesh(new THREE.BoxGeometry(.34, WEB_W+.2, .55),
      new THREE.MeshStandardMaterial({ color:ink, emissive:ink, emissiveIntensity:1.6, roughness:.4 }));
    chamber.position.copy(pos(R+2.05)); chamber.rotation.y = th; g.add(chamber);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(.9, W+.2, .25), dark);
    hood.position.copy(pos(R+2.45)); hood.rotation.y = th; g.add(hood);
    // tête de séchage entre groupes
    if(i < N-1){
      const th2 = th + SPAN/2;
      const dry = new THREE.Mesh(new THREE.BoxGeometry(.7, WEB_W, .18),
        new THREE.MeshStandardMaterial({ color:0x222, emissive:0xff6a2a, emissiveIntensity:.12 }));
      dry.position.set(Math.sin(th2)*(R+.42), 0, Math.cos(th2)*(R+.42)); dry.rotation.y = th2; g.add(dry);
    }
    stations.push({ plate, an, chamber, ink });
  });

  // Brume d'encre
  const PC = 900, pg = new THREE.BufferGeometry();
  const pp = new Float32Array(PC*3), pc = new Float32Array(PC*3), ps = [];
  for(let i=0;i<PC;i++){
    const k = i%N, th = THETA[k] + (Math.random()-.5)*.3, d = R+2.2+Math.random()*1.8;
    pp[i*3] = Math.sin(th)*d; pp[i*3+1] = -Math.cos(th)*d; pp[i*3+2] = (Math.random()-.5)*WEB_W;
    const c = new THREE.Color(PETAL_INKS[k]); pc[i*3]=c.r; pc[i*3+1]=c.g; pc[i*3+2]=c.b;
    ps.push({ v:new THREE.Vector3((Math.random()-.5)*.2, Math.random()*.25+.05, (Math.random()-.5)*.2), k });
  }
  pg.setAttribute('position', new THREE.BufferAttribute(pp,3)); pg.setAttribute('color', new THREE.BufferAttribute(pc,3));
  const mist = new THREE.Points(pg, new THREE.PointsMaterial({ size:.05, vertexColors:true, transparent:true, opacity:.8, blending:THREE.AdditiveBlending, depthWrite:false }));
  scene.add(mist);

  // Post-traitement
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512,512), .5, .55, .96);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  // Trajectoire caméra
  const camPts = [
    [15, 4, 19], [-13, 9, 11], [7, 7, 9.5], [-3, 8, 8], [-10, 0, 8], [-5, -2.5, 11]
  ].map(a => new THREE.Vector3(...a));
  const lookPts = [
    [0, -.5, 0], [0, 1.2, 0], [1.5, 2.6, 0], [-1, 2.8, 0], [-3.5, -2.2, 0], [-5, -4.5, 0]
  ].map(a => new THREE.Vector3(...a));
  const camCurve = new THREE.CatmullRomCurve3(camPts), lookCurve = new THREE.CatmullRomCurve3(lookPts);

  function resize(){
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false); composer.setSize(r.width, r.height);
    camera.aspect = r.width/r.height;
    camera.fov = r.width < r.height ? 50 : 34;
    camera.updateProjectionMatrix();
  }
  resize(); new ResizeObserver(resize).observe(canvas);

  const st = { progress:0, sp:0, phi:0, visible:false, boost:0, mouse:[0,0] };
  addEventListener('pointermove', (e) => { st.mouse = [e.clientX/innerWidth-.5, e.clientY/innerHeight-.5]; });
  const look = new THREE.Vector3(), tmp = new THREE.Vector3();

  function frame(dt){
    if(!st.visible) return;
    st.sp += (st.progress - st.sp)*.08;
    const speed = .32 + st.boost;
    st.phi += dt*speed;
    drum.rotation.y = st.phi; gear.rotation.y = st.phi; hub.rotation.y = st.phi;
    webMat.uniforms.uPhi.value = st.phi; outMat.uniforms.uPhi.value = st.phi; inS.m.material.uniforms.uPhi.value = st.phi;
    stations.forEach((s,i) => {
      s.plate.rotation.y = -st.phi*R/.5; s.an.rotation.y = st.phi*R/.36;
      s.chamber.material.emissiveIntensity = 1.2 + Math.sin(st.phi*3 + i)*.4;
    });
    unwind.rotation.y = -st.phi*R/1.5; rewind.rotation.y = -st.phi*R/1.1;
    // brume
    const a = pg.attributes.position.array;
    for(let i=0;i<PC;i++){
      a[i*3]+=ps[i].v.x*dt; a[i*3+1]+=ps[i].v.y*dt; a[i*3+2]+=ps[i].v.z*dt;
      if(a[i*3+1] > 7.5 || Math.random() < .002){
        const th = THETA[ps[i].k] + (Math.random()-.5)*.3, d = R+2.1+Math.random()*.4;
        a[i*3] = Math.sin(th)*d; a[i*3+1] = -Math.cos(th)*d; a[i*3+2] = (Math.random()-.5)*WEB_W;
      }
    }
    pg.attributes.position.needsUpdate = true;
    const t = Math.min(.999, Math.max(0, st.sp));
    camCurve.getPointAt(t, camera.position);
    lookCurve.getPointAt(t, look);
    if(camera.aspect < 1){ const k = 1 + (1-camera.aspect)*1.5; camera.position.sub(look).multiplyScalar(k).add(look); }
    camera.position.x += st.mouse[0]*1.2; camera.position.y -= st.mouse[1]*.8;
    camera.lookAt(look);
    composer.render(dt);
  }
  return { st, frame, unitsLit: () => Math.min(8, Math.round(st.sp*10)) };
}
