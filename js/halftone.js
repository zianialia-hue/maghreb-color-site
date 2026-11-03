// Moteur de trame CMJN (WebGL2).
// Passe 1 (optionnelle) : encre fluide procédurale rendue en basse résolution.
// Passe 2 : séparation CMJN + trame à points (C 15°, M 75°, Y 0°, K 45°) + compte-fils.

const VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos*.5+.5; gl_Position = vec4(aPos,0.,1.); }`;

const INK_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uPush;
float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }
vec3 pal(float t){
  vec3 g=vec3(.36,.57,.28), or=vec3(.80,.45,.16), pu=vec3(.45,.13,.47), bl=vec3(.35,.62,.86);
  t=fract(t)*4.;
  if(t<1.) return mix(g,or,smoothstep(0.,1.,t));
  if(t<2.) return mix(or,pu,smoothstep(1.,2.,t));
  if(t<3.) return mix(pu,bl,smoothstep(2.,3.,t));
  return mix(bl,g,smoothstep(3.,4.,t));
}
void main(){
  float asp = uRes.x/uRes.y;
  vec2 q = vec2(vUv.x*asp, vUv.y)*1.7;
  vec2 mq = vec2(uMouse.x*asp, uMouse.y)*1.7;
  vec2 d = q-mq; float infl = exp(-dot(d,d)*3.)*uPush;
  q += vec2(-d.y,d.x)*infl*.9;
  float t = uTime*.05;
  vec2 w = vec2(fbm(q+vec2(0.,t)), fbm(q+vec2(5.2,1.3)-t));
  vec2 w2 = vec2(fbm(q+3.*w+vec2(1.7,9.2)+t*.7), fbm(q+3.*w+vec2(8.3,2.8)-t*.4));
  float f = fbm(q+3.2*w2);
  float a = smoothstep(.42,.68,f);
  a *= .5 + .5*smoothstep(.05,.75,vUv.y + vUv.x*.25);
  vec3 ink = pal(w2.x*1.4 + w.y*.8 + t*.3);
  vec3 paper = vec3(.949,.933,.898);
  vec3 col = mix(paper, ink, a);
  col = mix(col, ink*.28, smoothstep(.74,.9,f)*a);
  o = vec4(col,1.);
}`;

const HT_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uRes; uniform vec2 uMouse; uniform float uCell;
uniform float uZoom; uniform float uLoupeR; uniform float uLoupeOn; uniform float uMis; uniform vec4 uSep;
vec3 src(vec2 p){ return texture(uSrc, clamp(p/uRes, 0.001, .999)).rgb; }
vec4 cmyk(vec3 c){ float k=1.-max(max(c.r,c.g),c.b); vec3 cmy=(1.-c-k)/max(1.-k,1e-3); return vec4(cmy,k); }
float scr(vec2 p, float ang, vec4 mask, float cell, float px, vec2 off){
  p += off;
  float cs=cos(ang), sn=sin(ang);
  vec2 rp = vec2(cs*p.x - sn*p.y, sn*p.x + cs*p.y);
  vec2 c = (floor(rp/cell)+.5)*cell;
  vec2 cp = vec2(cs*c.x + sn*c.y, -sn*c.x + cs*c.y);
  float v = dot(cmyk(src(cp-off)), mask);
  float d = length(rp-c)/cell;
  float r = sqrt(clamp(v,0.,1.))*.74;
  float aa = 1./px;
  return smoothstep(r+aa, r-aa, d);
}
void main(){
  vec2 p = gl_FragCoord.xy;
  vec2 m = uMouse;
  float dm = length(p-m);
  float inL = (1.-smoothstep(uLoupeR-1.5, uLoupeR, dm))*uLoupeOn;
  float z = mix(1., uZoom, inL);
  vec2 sp = mix(p, m + (p-m)/uZoom, inL);
  // légère distorsion de lentille
  sp += (p-m)/uZoom * inL * .08 * pow(dm/uLoupeR, 2.);
  float px = uCell*z;
  float mis = uMis;
  float C = scr(sp, radians(15.), vec4(1,0,0,0), uCell, px, vec2(-mis, mis*.4))*uSep.x;
  float M = scr(sp, radians(75.), vec4(0,1,0,0), uCell, px, vec2(mis, -mis*.3))*uSep.y;
  float Y = scr(sp, radians(0.),  vec4(0,0,1,0), uCell, px, vec2(mis*.3, mis))*uSep.z;
  float K = scr(sp, radians(45.), vec4(0,0,0,1), uCell, px, vec2(0.))*uSep.w;
  vec3 paper = vec3(.955,.94,.905);
  vec3 col = paper;
  col *= mix(vec3(1.), vec3(0.,.68,.94), C);
  col *= mix(vec3(1.), vec3(.93,0.,.55), M);
  col *= mix(vec3(1.), vec3(1.,.92,0.), Y);
  col *= mix(vec3(1.), vec3(.08,.08,.1), K);
  // fibres du papier
  float fib = fract(sin(dot(floor(sp*.9),vec2(12.9898,78.233)))*43758.5453);
  col *= 1. - fib*.025;
  // anneau du compte-fils
  float ring = smoothstep(3.,0.,abs(dm-uLoupeR)) * uLoupeOn;
  float shadow = smoothstep(uLoupeR+40., uLoupeR, dm)*(1.-inL)*uLoupeOn;
  col *= 1. - shadow*.18;
  col = mix(col, vec3(.06), ring);
  // graduations
  float ang = atan(p.y-m.y, p.x-m.x);
  float tick = step(.92, fract(ang/6.2831853*48.)) * step(uLoupeR-12., dm) * step(dm, uLoupeR-2.) * uLoupeOn;
  col = mix(col, vec3(.1), tick*.8);
  col += inL * .04 * (1.-dm/uLoupeR);
  o = vec4(col,1.);
}`;

function compile(gl, vs, fs){
  const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh);
    if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for(let i=0;i<n;i++){ const nm = gl.getActiveUniform(p,i).name; u[nm] = gl.getUniformLocation(p,nm); }
  return { p, u };
}

/**
 * opts: { mode:'ink'|'texture', drawSource?(ctx,w,h), cell, zoom, loupeR, dpr }
 */
export function createHalftone(canvas, opts){
  const gl = canvas.getContext('webgl2', { antialias:false, alpha:false });
  if(!gl) return null;
  const st = { cell:opts.cell||5, zoom:opts.zoom||6, loupeR:opts.loupeR||140, mis:0, sep:[1,1,1,1],
    mouse:[-999,-999], tm:[-999,-999], loupeOn:0, loupeT:0, push:0, visible:true, time:0 };
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  const ht = compile(gl, VS, HT_FS);
  const ink = opts.mode === 'ink' ? compile(gl, VS, INK_FS) : null;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  let fbo = null, fw = 0, fh = 0;
  const dpr = Math.min(window.devicePixelRatio||1, opts.dpr||1.5);
  const srcCanvas = opts.mode === 'texture' ? document.createElement('canvas') : null;

  function resize(){
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(2, Math.round(r.width*dpr)); canvas.height = Math.max(2, Math.round(r.height*dpr));
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if(ink){
      fw = Math.max(2, Math.round(canvas.width/4)); fh = Math.max(2, Math.round(canvas.height/4));
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,fw,fh,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      if(!fbo) fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      srcCanvas.width = Math.round(canvas.width/2); srcCanvas.height = Math.round(canvas.height/2);
      opts.drawSource(srcCanvas.getContext('2d'), srcCanvas.width, srcCanvas.height);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,srcCanvas);
    }
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  const setMouse = (e) => {
    const r = canvas.getBoundingClientRect();
    st.tm = [(e.clientX-r.left)*dpr, (r.bottom-e.clientY)*dpr];
    if(st.mouse[0] < -900) st.mouse = st.tm.slice();
    st.loupeT = 1;
  };
  const host = opts.host || canvas;
  host.addEventListener('pointermove', setMouse);
  host.addEventListener('pointerdown', setMouse);
  host.addEventListener('pointerleave', () => { st.loupeT = 0; });

  function frame(dt){
    if(!st.visible) return;
    st.time += dt;
    st.mouse[0] += (st.tm[0]-st.mouse[0])*.18; st.mouse[1] += (st.tm[1]-st.mouse[1])*.18;
    st.loupeOn += (st.loupeT-st.loupeOn)*.12;
    st.push += ((st.loupeT?1:0)-st.push)*.03;
    if(ink){
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0,0,fw,fh);
      gl.useProgram(ink.p);
      gl.uniform2f(ink.u.uRes, fw, fh); gl.uniform1f(ink.u.uTime, st.time);
      gl.uniform2f(ink.u.uMouse, st.mouse[0]/canvas.width, st.mouse[1]/canvas.height);
      gl.uniform1f(ink.u.uPush, st.push);
      gl.drawArrays(gl.TRIANGLES,0,3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.useProgram(ht.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(ht.u.uSrc, 0);
    gl.uniform2f(ht.u.uRes, canvas.width, canvas.height);
    gl.uniform2f(ht.u.uMouse, st.mouse[0], st.mouse[1]);
    gl.uniform1f(ht.u.uCell, st.cell*dpr);
    gl.uniform1f(ht.u.uZoom, st.zoom);
    gl.uniform1f(ht.u.uLoupeR, st.loupeR*dpr);
    gl.uniform1f(ht.u.uLoupeOn, st.loupeOn);
    gl.uniform1f(ht.u.uMis, st.mis*dpr);
    gl.uniform4fv(ht.u.uSep, st.sep);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }
  return { st, frame, resize };
}
