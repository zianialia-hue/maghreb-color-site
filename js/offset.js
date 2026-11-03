// Presse offset feuille à feuille, 4 groupes CMJN. Chaque feuille se construit couche par couche.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { drawPoster } from './art.js?v=8';

const UNITS = [-4.5, -1.5, 1.5, 4.5];
const INKS = ['#00aeef','#ec008c','#ffe600','#1a1a1a'];
const SW = 2.1, SD = 1.5; // feuille (x, z)
const R = .6;

const SHEET_VS = `varying vec2 vUv; varying vec3 vW;
void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const SHEET_FS = `uniform sampler2D uMap; uniform float uX[4]; uniform float uDone;
varying vec2 vUv; varying vec3 vW;
void main(){
  vec3 c = texture2D(uMap, vUv).rgb;
  float k = 1.-max(max(c.r,c.g),c.b); vec3 cmy = (1.-c-k)/max(1.-k,1e-3);
  float pc = max(step(uX[0], vW.x), uDone), pm = max(step(uX[1], vW.x), uDone);
  float py = max(step(uX[2], vW.x), uDone), pk = max(step(uX[3], vW.x), uDone);
  vec3 col = vec3(.97,.96,.94);
  col *= mix(vec3(1.), vec3(0.,.68,.94), cmy.x*pc);
  col *= mix(vec3(1.), vec3(.93,0.,.55), cmy.y*pm);
  col *= mix(vec3(1.), vec3(1.,.92,0.), cmy.z*py);
  col *= mix(vec3(1.), vec3(.08,.08,.1), k*pk);
  gl_FragColor = vec4(col,1.);
  #include <colorspace_fragment>
}`;

export function createOffset(canvas){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x08080a, 16, 40);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 200);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222018, .5));
  const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(4,12,10); scene.add(key);
  const back = new THREE.DirectionalLight(0xff8a4a, 1.2); back.position.set(-8,5,-10); scene.add(back);

  const chrome = new THREE.MeshStandardMaterial({ color:0xd5d8de, metalness:1, roughness:.2 });
  const blanketM = new THREE.MeshStandardMaterial({ color:0x2a2d36, roughness:.85 });
  const body = new THREE.MeshStandardMaterial({ color:0x2c3038, metalness:.55, roughness:.4 });
  const darkM = new THREE.MeshStandardMaterial({ color:0x18191d, metalness:.5, roughness:.5 });
  const cyl = (r, w, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,w,48), mat); m.rotation.x = Math.PI/2; return m; };

  const rotors = [];
  UNITS.forEach((x, i) => {
    const ink = new THREE.Color(INKS[i]);
    const g = new THREE.Group(); g.position.x = x; scene.add(g);
    const imp = cyl(R, 2.2, chrome); imp.position.set(0,-R-.02,0); g.add(imp);
    const bl = cyl(R, 2, blanketM); bl.position.set(0,R+.02,0); g.add(bl);
    const pl = cyl(R, 2, new THREE.MeshStandardMaterial({ color:0xb9c2cc, metalness:.9, roughness:.25, emissive:ink, emissiveIntensity:.12 }));
    pl.position.set(-.55, R*3+.02-.14, 0); g.add(pl);
    rotors.push({ m:imp, s:1 }, { m:bl, s:-1 }, { m:pl, s:1 });
    // rouleaux encreurs (pyramide)
    const inkM = new THREE.MeshStandardMaterial({ color:ink, roughness:.3, metalness:.1 });
    [[-.95,2.75],[-.15,2.75],[-.55,3.25],[-1.15,3.3],[.05,3.3],[-.55,3.8]].forEach(([ix,iy],j) => {
      const r = cyl(.2, 1.9, inkM); r.position.set(ix,iy,0); g.add(r); rotors.push({ m:r, s:j%2?1:-1, k:R/.2 });
    });
    const fount = new THREE.Mesh(new THREE.BoxGeometry(1.1,.35,2), new THREE.MeshStandardMaterial({ color:ink, emissive:ink, emissiveIntensity:i===3?.3:1.1 }));
    fount.position.set(-.55,4.25,0); g.add(fount);
    // bâti
    const side = new THREE.Mesh(new THREE.BoxGeometry(2.7,6.2,.3), body); side.position.set(-.3,1.2,-1.35); g.add(side);
    const sideF = new THREE.Mesh(new THREE.BoxGeometry(2.7,1.6,.3), body); sideF.position.set(-.3,-1.5,1.35); g.add(sideF);
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.72,.18,.32), new THREE.MeshStandardMaterial({ color:ink, emissive:ink, emissiveIntensity:i===3?.2:.9 }));
    band.position.set(-.3,-.95,1.36); g.add(band);
    const bandB = band.clone(); bandB.position.z = -1.36; bandB.position.y = 3.9; g.add(bandB);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.9,.7,3.1), darkM); base.position.set(-.3,-2.6,0); g.add(base);
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80,80), new THREE.MeshStandardMaterial({ color:0x0c0c0e, metalness:.5, roughness:.35 }));
  floor.rotation.x = -Math.PI/2; floor.position.y = -2.95; scene.add(floor);

  // Margeur & réception
  const paperM = new THREE.MeshStandardMaterial({ color:0xf4f2ee, roughness:.8 });
  const feed = new THREE.Mesh(new THREE.BoxGeometry(SW, 1.6, SD), paperM); feed.position.set(-8.4,-1.2,0); scene.add(feed);
  const feedTable = new THREE.Mesh(new THREE.BoxGeometry(2.6,.12,2), darkM); feedTable.position.set(-8.4,-2.05,0); scene.add(feedTable);
  const pileH = { v:.05 };
  const pile = new THREE.Mesh(new THREE.BoxGeometry(SW, 1, SD), paperM); pile.position.set(8.6,-2.4,0); scene.add(pile);
  const delTable = feedTable.clone(); delTable.position.x = 8.6; delTable.position.y = -2.5; scene.add(delTable);

  // Affiche
  const pc = document.createElement('canvas'); pc.width = 1024; pc.height = Math.round(1024*SD/SW);
  drawPoster(pc.getContext('2d'), pc.width, pc.height);
  const map = new THREE.CanvasTexture(pc); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  document.fonts?.ready.then(() => { drawPoster(pc.getContext('2d'), pc.width, pc.height); map.needsUpdate = true; });

  const sheetGeo = new THREE.PlaneGeometry(SW, SD, 24, 1); sheetGeo.rotateX(-Math.PI/2);
  const mkMat = (done) => new THREE.ShaderMaterial({ vertexShader:SHEET_VS, fragmentShader:SHEET_FS, side:THREE.DoubleSide,
    uniforms:{ uMap:{value:map}, uX:{value:UNITS}, uDone:{value:done} } });
  const sheets = Array.from({length:9}, () => { const m = new THREE.Mesh(sheetGeo, mkMat(0)); m.visible = false; scene.add(m); return { m, t:-1 }; });
  const top = new THREE.Mesh(sheetGeo, mkMat(1)); scene.add(top);

  const st = { progress:0, sp:0, visible:false, clock:0, spawn:0, layers:0, mouse:[0,0] };
  addEventListener('pointermove', (e) => { st.mouse = [e.clientX/innerWidth-.5, e.clientY/innerHeight-.5]; });

  const camPts = [[0,4,21],[-7,3.2,8],[-3.2,1.8,5.2],[2.5,2.2,6],[9,6,7],[8.6,7.5,2.2]].map(a => new THREE.Vector3(...a));
  const lookPts = [[0,.5,0],[-4.5,.2,0],[-1.5,0,0],[3,.2,0],[7.5,-1,0],[8.6,-1.8,0]].map(a => new THREE.Vector3(...a));
  const cc = new THREE.CatmullRomCurve3(camPts), lc = new THREE.CatmullRomCurve3(lookPts), look = new THREE.Vector3();

  function resize(){
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width/r.height;
    camera.fov = r.width < r.height ? 52 : 34; camera.updateProjectionMatrix();
  }
  resize(); new ResizeObserver(resize).observe(canvas);

  const SPEED = 2.2, X0 = -8.4, X1 = 7.0;
  function frame(dt){
    if(!st.visible) return;
    st.sp += (st.progress - st.sp)*.08;
    st.clock += dt;
    rotors.forEach(r => r.m.rotation.y += dt*SPEED/R*r.s*(r.k?.25:1));
    st.spawn -= dt;
    if(st.spawn <= 0){ const s = sheets.find(s => s.t < 0); if(s){ s.t = 0; s.m.visible = true; s.rot = (Math.random()-.5)*.06; } st.spawn = 1.25; }
    let maxX = -99;
    sheets.forEach(s => {
      if(s.t < 0) return;
      s.t += dt;
      let x = X0 + s.t*SPEED, y = -.4+.0, z = 0, rx = 0, rz = 0;
      if(x < UNITS[0]-1.4){ // levée depuis le margeur
        const k = (x - X0)/(UNITS[0]-1.4-X0); y = -.4 + k*.4; rz = .0;
        y = THREE.MathUtils.lerp(-.38, 0, Math.min(1,k*1.4));
      } else y = 0;
      if(x > X1){ // vol vers la pile
        const k = Math.min(1, (x - X1)/1.8);
        const py = -2.4 + .5 + pileH.v + .01;
        x = X1 + k*(8.6-X1); y = THREE.MathUtils.lerp(0, py, k*k) + Math.sin(k*Math.PI)*.9;
        rz = Math.sin(k*Math.PI)*-.25; s.m.rotation.y = s.rot*k;
        if(k >= 1){ s.t = -1; s.m.visible = false; pileH.v = Math.min(1.35, pileH.v + .012); }
      }
      s.m.position.set(x, y+.01, z); s.m.rotation.z = rz;
      maxX = Math.max(maxX, x);
    });
    pile.scale.y = .5 + pileH.v; pile.position.y = -2.45 + (pile.scale.y)/2;
    top.position.set(8.6, pile.position.y + pile.scale.y/2 + .006, 0);
    feed.scale.y = 1 - (st.clock % 40)/80; feed.position.y = -2 + feed.scale.y*.8;
    st.layers = UNITS.filter(u => maxX > u).length;
    const t = Math.min(.999, Math.max(0, st.sp));
    cc.getPointAt(t, camera.position); lc.getPointAt(t, look);
    camera.position.x += st.mouse[0]*1; camera.position.y -= st.mouse[1]*.6;
    camera.lookAt(look);
    renderer.render(scene, camera);
  }
  return { st, frame };
}
