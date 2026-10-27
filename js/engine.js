/* Studio Của Khang – WebGL engine (WebGL2 with WebGL1 fallback). Không có máy chủ: mọi xử lý chạy trên GPU của máy. */
(function () {
  'use strict';
  const S = (window.S = window.S || {});
  S.luts = S.luts || {}; // id -> {size, data:Float32Array(size^3*3), name}

  const VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }`;

  const COMMON = `
precision highp float;
varying vec2 vUv;
vec3 tanh3(vec3 x){ x=clamp(x,-10.0,10.0); vec3 e=exp(2.0*x); return (e-1.0)/(e+1.0); }
float luma(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
vec3 s2l(vec3 c){ c=max(c,0.0); return mix(c/12.92, pow((c+0.055)/1.055, vec3(2.4)), step(0.04045,c)); }
vec3 l2s(vec3 c){ c=max(c,0.0); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4))-0.055, step(0.0031308,c)); }
`;

  const FS_GEO = COMMON + `
uniform sampler2D uSrc;
uniform vec4 uCrop; uniform vec2 uDim; uniform float uAngle; uniform float uScale; uniform float uRot; uniform vec2 uFlip;
void main(){
  vec2 p = uCrop.xy + vUv*uCrop.zw;
  vec2 px = (p-0.5)*uDim;
  float ca=cos(uAngle), sa=sin(uAngle);
  px = vec2(ca*px.x + sa*px.y, -sa*px.x + ca*px.y)/uScale;
  p = px/uDim + 0.5;
  if(uFlip.x>0.5) p.x = 1.0-p.x;
  if(uFlip.y>0.5) p.y = 1.0-p.y;
  vec2 q = p;
  if(uRot>0.5 && uRot<1.5) q = vec2(p.y, 1.0-p.x);
  else if(uRot>1.5 && uRot<2.5) q = vec2(1.0-p.x, 1.0-p.y);
  else if(uRot>2.5) q = vec2(1.0-p.y, p.x);
  vec4 c = texture2D(uSrc, clamp(q,0.0,1.0));
  if(q.x<-0.002||q.y<-0.002||q.x>1.002||q.y>1.002) c = vec4(0.0,0.0,0.0,1.0);
  gl_FragColor = vec4(c.rgb,1.0);
}`;

  const FS_COPY = COMMON + `
uniform sampler2D uSrc; uniform vec2 uTexel;
void main(){ // 4 bilinear taps -> 4x4 box average for downsampling
  vec2 o = uTexel*0.5;
  vec3 c = texture2D(uSrc, vUv+vec2(-o.x,-o.y)).rgb + texture2D(uSrc, vUv+vec2(o.x,-o.y)).rgb
         + texture2D(uSrc, vUv+vec2(-o.x,o.y)).rgb + texture2D(uSrc, vUv+vec2(o.x,o.y)).rgb;
  gl_FragColor = vec4(c*0.25,1.0);
}`;

  const FS_BLUR = COMMON + `
uniform sampler2D uSrc; uniform vec2 uDir;
void main(){
  vec3 c = texture2D(uSrc, vUv).rgb*0.2270270;
  c += texture2D(uSrc, vUv+uDir*1.3846153).rgb*0.3162162;
  c += texture2D(uSrc, vUv-uDir*1.3846153).rgb*0.3162162;
  c += texture2D(uSrc, vUv+uDir*3.2307692).rgb*0.0702702;
  c += texture2D(uSrc, vUv-uDir*3.2307692).rgb*0.0702702;
  gl_FragColor = vec4(c,1.0);
}`;

  const FS_NR = COMMON + `
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uSigma; uniform float uAmt;
void main(){
  vec3 c0 = texture2D(uSrc, vUv).rgb;
  vec3 acc = vec3(0.0); float wsum = 0.0;
  for(int j=-3;j<=3;j++){ for(int i=-3;i<=3;i++){
    vec2 o = vec2(float(i),float(j));
    vec3 c = texture2D(uSrc, vUv + o*uTexel*1.5).rgb;
    vec3 d = c-c0;
    float w = exp(-dot(o,o)/18.0 - dot(d,d)/(2.0*uSigma*uSigma));
    acc += c*w; wsum += w;
  }}
  gl_FragColor = vec4(mix(c0, acc/wsum, uAmt),1.0);
}`;

  function mainFS(webgl2) {
    const lut = webgl2
      ? `uniform highp sampler3D uLut;
vec3 lutLookup(vec3 c){ c=clamp(c,0.0,1.0); vec3 t=(c*(uLutSize-1.0)+0.5)/uLutSize; return texture(uLut,t).rgb; }`
      : `uniform sampler2D uLut;
vec3 lutLookup(vec3 c){ c=clamp(c,0.0,1.0); float n=uLutSize; float b=c.b*(n-1.0); float b0=floor(b); float b1=min(b0+1.0,n-1.0); float f=b-b0;
  vec2 xy = vec2(c.r*(n-1.0)+0.5, c.g*(n-1.0)+0.5);
  vec3 a = texture2D(uLut, vec2((xy.x+b0*n)/(n*n), xy.y/n)).rgb;
  vec3 d = texture2D(uLut, vec2((xy.x+b1*n)/(n*n), xy.y/n)).rgb; return mix(a,d,f); }`;
    const head = webgl2
      ? '#version 300 es\n#define varying in\n#define texture2D texture\nout highp vec4 fragOut;\n#define gl_FragColor fragOut\n'
      : '';
    // HSL band weights: centers 0,30,60,120,180,240,270,300 degrees
    return head + COMMON + `
uniform sampler2D uTex; uniform sampler2D uBS; uniform sampler2D uBM; uniform sampler2D uBL; uniform sampler2D uCurve;
uniform float uLutSize; uniform float uLutAmt;
${lut}
uniform float uExp, uCon, uHi, uSh, uWh, uBl, uVib, uSat;
uniform vec3 uWB;
uniform vec3 uHsl[8];
uniform vec3 uGS, uGM, uGH; uniform vec3 uGL; uniform float uGBlend, uGBal;
uniform float uTexAmt, uClar, uDehaze, uVig, uVigMid, uGrain, uGrainSize, uSharp, uSeed;
uniform float uSplit, uOrig, uFlipY, uCurveOn, uUseBlur;
uniform vec2 uRes;
vec3 rgb2hsv(vec3 c){ vec4 K=vec4(0.0,-1.0/3.0,2.0/3.0,-1.0); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));
 vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); float e=1.0e-10;
 return vec3(abs(q.z+(q.w-q.y)/(6.0*d+e)), d/(q.x+e), q.x); }
vec3 hsv2rgb(vec3 c){ vec3 p=abs(fract(c.xxx+vec3(1.0,2.0/3.0,1.0/3.0))*6.0-3.0); return c.z*mix(vec3(1.0),clamp(p-1.0,0.0,1.0),c.y); }
float band(float h, float a, float c, float b){ // a=prev center, c=center, b=next center (degrees, unwrapped)
  float d = h - c; if(d>180.0) d-=360.0; if(d<-180.0) d+=360.0;
  float w = d<0.0 ? 1.0 + d/(c-a) : 1.0 - d/(b-c);
  w = clamp(w,0.0,1.0); return w*w*(3.0-2.0*w);
}
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32+uSeed); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec2 uv = vec2(vUv.x, uFlipY>0.5 ? 1.0-vUv.y : vUv.y);
  vec3 c0 = texture2D(uTex, uv).rgb;
  if(uOrig>0.5 || uv.x < uSplit){ gl_FragColor = vec4(c0,1.0); return; }
  vec3 c = c0;
  // ---- detail (gamma space) ----
  if(uSharp>0.0){ vec3 bs = texture2D(uBS, uv).rgb; vec3 d=c0-bs; float m = smoothstep(0.004,0.03,abs(luma(d))); c += d*uSharp*m; }
  if(uUseBlur>0.5){
    vec3 bm = texture2D(uBM, uv).rgb; vec3 bl = texture2D(uBL, uv).rgb;
    float l = luma(c);
    c += (l - luma(bm))*uTexAmt*0.9;
    float mid = 1.0 - pow(abs(2.0*l-1.0), 2.0);
    c += (l - luma(bl))*uClar*0.7*mid;
    // dehaze in linear light (dark-channel style veil estimate)
    if(uDehaze!=0.0){
      vec3 lin = s2l(c); vec3 bll = s2l(bl);
      float veil = min(bll.r,min(bll.g,bll.b));
      if(uDehaze>0.0){ float k = uDehaze*0.85*veil; lin = (lin - k)/(1.0-k); lin = mix(vec3(luma(lin)), lin, 1.0+uDehaze*0.25); }
      else { float k=-uDehaze; lin = mix(lin, vec3(0.75*luma(bll)+0.2), k*0.45); }
      c = l2s(max(lin,0.0));
    }
  }
  // ---- white balance + exposure in linear light ----
  vec3 lin = s2l(c) * uWB * exp2(uExp);
  c = l2s(lin);
  // ---- tone ----
  float L = luma(c);
  float ws = pow(1.0 - smoothstep(0.0, 0.72, L), 1.6);
  float wh = smoothstep(0.32, 1.0, L);
  c *= exp2(uSh*1.1*ws + uHi*1.0*wh*(uHi<0.0?1.0+0.5*smoothstep(0.9,1.3,L):1.0));
  L = luma(c);
  c *= 1.0 + uWh*0.32*smoothstep(0.45,1.0,L);
  c += uBl*0.10*(1.0 - smoothstep(0.0,0.42,L));
  // soft shoulder for values above white
  c = mix(c, 0.95 + 0.05*tanh3((c-0.95)/0.05), step(0.95,c));
  c = clamp(c,0.0,1.0);
  if(uCon!=0.0){
    float e = uCon>0.0 ? 1.0+uCon*1.3 : 1.0/(1.0-uCon*0.75);
    vec3 lo = 0.5*pow(2.0*c, vec3(e)); vec3 hi = 1.0-0.5*pow(2.0*(1.0-c), vec3(e));
    c = mix(lo, hi, step(0.5,c));
  }
  // ---- curves ----
  if(uCurveOn>0.5){
    vec3 t = c*(255.0/256.0)+0.5/256.0;
    c = vec3(texture2D(uCurve, vec2(t.r,0.5)).r, texture2D(uCurve, vec2(t.g,0.5)).g, texture2D(uCurve, vec2(t.b,0.5)).b);
  }
  // ---- HSL mixer ----
  vec3 hsv = rgb2hsv(c);
  float hd = hsv.x*360.0;
  float w0=band(hd,-60.0,0.0,30.0), w1=band(hd,0.0,30.0,60.0), w2=band(hd,30.0,60.0,120.0), w3=band(hd,60.0,120.0,180.0);
  float w4=band(hd,120.0,180.0,240.0), w5=band(hd,180.0,240.0,270.0), w6=band(hd,240.0,270.0,300.0), w7=band(hd,270.0,300.0,360.0);
  vec3 adj = uHsl[0]*w0+uHsl[1]*w1+uHsl[2]*w2+uHsl[3]*w3+uHsl[4]*w4+uHsl[5]*w5+uHsl[6]*w6+uHsl[7]*w7;
  if(dot(abs(adj),vec3(1.0))>0.0){
    float sat0 = hsv.y;
    hsv.x = fract(hsv.x + adj.x*30.0/360.0 + 1.0);
    hsv.y = clamp(hsv.y*(1.0+adj.y), 0.0, 1.0);
    c = hsv2rgb(hsv);
    c *= 1.0 + adj.z*0.55*smoothstep(0.0,0.4,sat0);
  }
  // ---- vibrance / saturation ----
  L = luma(c);
  float mx = max(c.r,max(c.g,c.b)), mn = min(c.r,min(c.g,c.b)); float sat = mx-mn;
  float hue = rgb2hsv(clamp(c,0.0,1.0)).x*360.0;
  float skin = uVib>0.0 ? 1.0 - 0.5*smoothstep(0.0,15.0,hue)*(1.0-smoothstep(40.0,60.0,hue)) : 1.0;
  c = mix(vec3(L), c, 1.0 + uVib*(1.0-sat)*skin);
  c = mix(vec3(luma(c)), c, 1.0 + uSat);
  c = clamp(c,0.0,1.0);
  // ---- color grading ----
  L = luma(c);
  float p = 0.5 - uGBal*0.25;
  float bw = mix(0.12, 0.45, uGBlend);
  float gs = 1.0 - smoothstep(p-bw, p, L);
  float gh = smoothstep(p, p+bw, L);
  float gm = 1.0 - smoothstep(0.0, bw+0.12, abs(L-p));
  c += uGS*gs*(0.35+0.65*smoothstep(0.0,0.2,L)) + uGM*gm + uGH*gh;
  c += (uGL.x*gs + uGL.y*gm + uGL.z*gh)*0.25;
  c = clamp(c,0.0,1.0);
  // ---- 3D LUT ----
  if(uLutAmt>0.0) c = mix(c, lutLookup(c), uLutAmt);
  // ---- vignette (linear light) ----
  if(uVig!=0.0){
    vec2 d = (uv-0.5)*vec2(uRes.x/max(uRes.x,uRes.y), uRes.y/max(uRes.x,uRes.y))*2.0;
    float r = length(d)/1.2;
    float m = smoothstep(uVigMid*0.9, uVigMid*0.9+0.75, r);
    vec3 lv = s2l(c);
    lv = uVig<0.0 ? lv*(1.0+uVig*0.85*m) : mix(lv, vec3(1.0), uVig*0.7*m);
    c = l2s(lv);
  }
  // ---- grain ----
  if(uGrain>0.0){
    vec2 gp = uv*uRes/(max(uRes.x,uRes.y)/1400.0)/ (0.6+uGrainSize*2.2);
    float n = vnoise(gp)+vnoise(gp*2.03+17.0)*0.5 - 0.75;
    L = luma(c);
    c += n*uGrain*0.16*(0.35+ (1.0-abs(2.0*L-1.0)));
  }
  gl_FragColor = vec4(clamp(c,0.0,1.0),1.0);
}`;
  }

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      throw new Error('Shader: ' + log);
    }
    return s;
  }
  function program(gl, vs, fs, webgl2main) {
    const p = gl.createProgram();
    let v = vs;
    if (webgl2main) v = '#version 300 es\n' + vs.replace(/attribute/g, 'in').replace(/varying/g, 'out');
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, v));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link: ' + gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      const name = info.name.replace(/\[0\]$/, '');
      u[name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  }

  // ---------- spline for curves (monotone cubic) ----------
  function curveTable(pts) {
    const P = pts.slice().sort((a, b) => a[0] - b[0]);
    const out = new Float32Array(256);
    if (P.length < 2) { for (let i = 0; i < 256; i++) out[i] = i / 255; return out; }
    const n = P.length, xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    const d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    for (let i = 0; i < 256; i++) {
      let x = i, y;
      if (x <= xs[0]) y = ys[0];
      else if (x >= xs[n - 1]) y = ys[n - 1];
      else {
        let k = 0; while (k < n - 2 && x > xs[k + 1]) k++;
        const h = xs[k + 1] - xs[k], t = (x - xs[k]) / h, t2 = t * t, t3 = t2 * t;
        y = (2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h * m[k + 1];
      }
      out[i] = Math.min(1, Math.max(0, y / 255));
    }
    return out;
  }
  S.curveTable = curveTable;
  const isIdentityCurve = c => !c || (c.length === 2 && c[0][0] === 0 && c[0][1] === 0 && c[1][0] === 255 && c[1][1] === 255);
  S.isIdentityCurve = isIdentityCurve;

  function hueVec(h, s, k) { // chroma-only offset vector from hue (deg) & sat (0..100)
    const hh = ((h % 360) + 360) % 360 / 60;
    const x = 1 - Math.abs((hh % 2) - 1);
    let r, g, b;
    if (hh < 1) [r, g, b] = [1, x, 0]; else if (hh < 2) [r, g, b] = [x, 1, 0]; else if (hh < 3) [r, g, b] = [0, 1, x];
    else if (hh < 4) [r, g, b] = [0, x, 1]; else if (hh < 5) [r, g, b] = [x, 0, 1]; else [r, g, b] = [1, 0, x];
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const a = (s / 100) * k;
    return [(r - l) * a, (g - l) * a, (b - l) * a];
  }
  S.hueVec = hueVec;

  function wbGains(temp, tint) {
    const t = temp / 100, ti = tint / 100;
    let r = Math.pow(2, t * 0.42), g = Math.pow(2, -ti * 0.32), b = Math.pow(2, -t * 0.42);
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return [r / l, g / l, b / l];
  }
  S.wbGains = wbGains;

  class Renderer {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      const attrs = { premultipliedAlpha: false, preserveDrawingBuffer: !!opts.preserve, antialias: false, alpha: false };
      let gl = opts.forceWebGL1 ? null : canvas.getContext('webgl2', attrs);
      this.webgl2 = !!gl;
      if (!gl) gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
      if (!gl) throw new Error('NO_WEBGL');
      this.gl = gl;
      this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      this.pGeo = program(gl, VS, FS_GEO);
      this.pCopy = program(gl, VS, FS_COPY);
      this.pBlur = program(gl, VS, FS_BLUR);
      this.pNR = program(gl, VS, FS_NR);
      this.pMain = program(gl, VS, mainFS(this.webgl2), this.webgl2);
      this.pool = {};
      this.srcTex = this.tex();
      this.curveTex = this.tex();
      this.dummy = this.tex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      this.lutTex = {};
      this.dummyLut = this.makeLut({ size: 2, data: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1]) });
      this.lastCurveKey = '';
      this.srcW = 0; this.srcH = 0;
    }
    tex() {
      const gl = this.gl, t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    target(name, w, h) {
      const key = name;
      let t = this.pool[key];
      if (t && t.w === w && t.h === h) return t;
      const gl = this.gl;
      if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); }
      const tex = this.tex();
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      t = this.pool[key] = { tex, fb, w, h };
      return t;
    }
    freePool() {
      const gl = this.gl;
      for (const k in this.pool) { gl.deleteTexture(this.pool[k].tex); gl.deleteFramebuffer(this.pool[k].fb); }
      this.pool = {};
    }
    setSource(src, w, h) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      if (gl.UNPACK_COLORSPACE_CONVERSION_WEBGL) gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      this.mip = false;
      if (this.webgl2) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        this.mip = true;
      }
      this.srcW = w; this.srcH = h;
    }
    makeLut(lut) {
      const gl = this.gl, n = lut.size, d = lut.data;
      const bytes = new Uint8Array(n * n * n * 4);
      for (let i = 0, j = 0; i < n * n * n; i++, j += 3) {
        bytes[i * 4] = Math.round(Math.min(1, Math.max(0, d[j])) * 255);
        bytes[i * 4 + 1] = Math.round(Math.min(1, Math.max(0, d[j + 1])) * 255);
        bytes[i * 4 + 2] = Math.round(Math.min(1, Math.max(0, d[j + 2])) * 255);
        bytes[i * 4 + 3] = 255;
      }
      let t;
      if (this.webgl2) {
        t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_3D, t);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, n, n, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      } else {
        // atlas: width n*n (b slices), height n (g); r fastest within slice
        const atlas = new Uint8Array(n * n * n * 4);
        for (let b = 0; b < n; b++) for (let g = 0; g < n; g++) for (let r = 0; r < n; r++) {
          const si = ((b * n + g) * n + r) * 4, di = (g * n * n + b * n + r) * 4;
          atlas[di] = bytes[si]; atlas[di + 1] = bytes[si + 1]; atlas[di + 2] = bytes[si + 2]; atlas[di + 3] = 255;
        }
        t = this.tex();
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, n * n, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
      }
      return { t, size: n };
    }
    getLut(id) {
      if (!id || !S.luts[id]) return null;
      if (!this.lutTex[id]) this.lutTex[id] = this.makeLut(S.luts[id]);
      return this.lutTex[id];
    }
    // geometry helpers
    static rotDims(p, w, h) { return (p.rot90 % 2) ? [h, w] : [w, h]; }
    static coverScale(angleDeg, W, H) {
      const a = Math.abs(angleDeg) * Math.PI / 180;
      return Math.cos(a) + Math.max(W / H, H / W) * Math.sin(a);
    }
    outSize(p, maxLong, ignoreCrop) {
      const [W, H] = Renderer.rotDims(p, this.srcW, this.srcH);
      const cr = ignoreCrop ? { w: 1, h: 1 } : p.crop;
      let w = cr.w * W, h = cr.h * H;
      const lim = Math.min(maxLong || 1e9, this.maxTex);
      const s = Math.min(1, lim / Math.max(w, h));
      return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))];
    }
    draw(prog, target, w, h) {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
      gl.viewport(0, 0, w, h);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    bind(unit, tex, is3d) {
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(is3d ? gl.TEXTURE_3D : gl.TEXTURE_2D, tex);
    }
    blurTo(name, src, w, h, srcW, srcH, sharpenOnly) {
      const gl = this.gl;
      let cur = src, cw = srcW, ch = srcH, lvl = 0;
      if (!sharpenOnly) {
        gl.useProgram(this.pCopy.p);
        while (Math.max(cw, ch) > 2 * Math.max(w, h)) {
          const nw = Math.max(1, Math.round(cw / 2)), nh = Math.max(1, Math.round(ch / 2));
          const t = this.target(name + 'd' + (lvl++ % 2), nw, nh);
          this.bind(0, cur.tex); gl.uniform1i(this.pCopy.u.uSrc, 0); gl.uniform2f(this.pCopy.u.uTexel, 1 / cw, 1 / ch);
          this.draw(this.pCopy, t, nw, nh); cur = t; cw = nw; ch = nh;
        }
        const t = this.target(name + 'f', w, h);
        this.bind(0, cur.tex); gl.uniform1i(this.pCopy.u.uSrc, 0); gl.uniform2f(this.pCopy.u.uTexel, 1 / cw, 1 / ch);
        this.draw(this.pCopy, t, w, h); cur = t;
      }
      gl.useProgram(this.pBlur.p);
      const a = this.target(name + 'a', w, h), b = this.target(name + 'b', w, h);
      this.bind(0, cur.tex); gl.uniform1i(this.pBlur.u.uSrc, 0); gl.uniform2f(this.pBlur.u.uDir, (sharpenOnly ? 0.6 : 1) / w, 0);
      this.draw(this.pBlur, a, w, h);
      this.bind(0, a.tex); gl.uniform2f(this.pBlur.u.uDir, 0, (sharpenOnly ? 0.6 : 1) / h);
      this.draw(this.pBlur, b, w, h);
      return b;
    }
    /* render params at output size (ow,oh). opts: {toTarget:false, split:-1, original:false, ignoreCrop, seed} */
    render(p, ow, oh, opts = {}) {
      const gl = this.gl;
      if (!this.srcW) return;
      if (this.canvas.width !== ow || this.canvas.height !== oh) { if (!opts.offscreen) { this.canvas.width = ow; this.canvas.height = oh; } }
      // 1. geometry
      const [W, H] = Renderer.rotDims(p, this.srcW, this.srcH);
      const crop = opts.ignoreCrop ? { x: 0, y: 0, w: 1, h: 1 } : p.crop;
      const geo = this.target('geo', ow, oh);
      gl.useProgram(this.pGeo.p);
      this.bind(0, this.srcTex); gl.uniform1i(this.pGeo.u.uSrc, 0);
      gl.uniform4f(this.pGeo.u.uCrop, crop.x, crop.y, crop.w, crop.h);
      gl.uniform2f(this.pGeo.u.uDim, W, H);
      gl.uniform1f(this.pGeo.u.uAngle, (p.straighten || 0) * Math.PI / 180);
      gl.uniform1f(this.pGeo.u.uScale, Renderer.coverScale(p.straighten || 0, W, H));
      gl.uniform1f(this.pGeo.u.uRot, p.rot90 % 4);
      gl.uniform2f(this.pGeo.u.uFlip, p.flipH ? 1 : 0, p.flipV ? 1 : 0);
      this.draw(this.pGeo, geo, ow, oh);
      let base = geo;
      const orig = !!opts.original;
      // 2. noise reduction
      if (!orig && p.nr > 0) {
        const nr = this.target('nr', ow, oh);
        gl.useProgram(this.pNR.p);
        this.bind(0, geo.tex); gl.uniform1i(this.pNR.u.uSrc, 0);
        gl.uniform2f(this.pNR.u.uTexel, 1 / ow, 1 / oh);
        gl.uniform1f(this.pNR.u.uSigma, 0.02 + p.nr / 100 * 0.12);
        gl.uniform1f(this.pNR.u.uAmt, Math.min(1, p.nr / 60));
        this.draw(this.pNR, nr, ow, oh);
        base = nr;
      }
      // 3. blurs
      const useBlur = !orig && (p.texture || p.clarity || p.dehaze);
      let bM = null, bL = null, bS = null;
      if (useBlur) {
        const asp = ow / oh;
        const mw = asp >= 1 ? Math.min(ow, 640) : Math.max(1, Math.round(Math.min(oh, 640) * asp));
        const mh = asp >= 1 ? Math.max(1, Math.round(mw / asp)) : Math.min(oh, 640);
        const lw = asp >= 1 ? 160 : Math.max(1, Math.round(160 * asp));
        const lh = asp >= 1 ? Math.max(1, Math.round(160 / asp)) : 160;
        bM = this.blurTo('m', base, mw, mh, ow, oh);
        bL = this.blurTo('l', base, lw, lh, ow, oh);
      }
      if (!orig && p.sharpen > 0) bS = this.blurTo('s', base, ow, oh, ow, oh, true);
      // 4. main
      const m = this.pMain, u = m.u;
      gl.useProgram(m.p);
      this.bind(0, base.tex); gl.uniform1i(u.uTex, 0);
      this.bind(1, bS ? bS.tex : this.dummy); gl.uniform1i(u.uBS, 1);
      this.bind(2, bM ? bM.tex : this.dummy); gl.uniform1i(u.uBM, 2);
      this.bind(3, bL ? bL.tex : this.dummy); gl.uniform1i(u.uBL, 3);
      // curves
      const c = p.curve || {};
      const curveOn = !(isIdentityCurve(c.rgb) && isIdentityCurve(c.r) && isIdentityCurve(c.g) && isIdentityCurve(c.b));
      if (curveOn) {
        const key = JSON.stringify(c);
        if (key !== this.lastCurveKey) {
          const m0 = curveTable(c.rgb || [[0, 0], [255, 255]]);
          const tr = curveTable(c.r || [[0, 0], [255, 255]]), tg = curveTable(c.g || [[0, 0], [255, 255]]), tb = curveTable(c.b || [[0, 0], [255, 255]]);
          const data = new Uint8Array(256 * 4);
          const look = (t, v) => { const x = v * 255, i = Math.floor(x), f = x - i; return i >= 255 ? t[255] : t[i] * (1 - f) + t[i + 1] * f; };
          for (let i = 0; i < 256; i++) {
            const v = m0[i];
            data[i * 4] = Math.round(look(tr, v) * 255);
            data[i * 4 + 1] = Math.round(look(tg, v) * 255);
            data[i * 4 + 2] = Math.round(look(tb, v) * 255);
            data[i * 4 + 3] = 255;
          }
          gl.bindTexture(gl.TEXTURE_2D, this.curveTex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
          this.lastCurveKey = key;
        }
      }
      this.bind(4, this.curveTex); gl.uniform1i(u.uCurve, 4);
      const lut = this.getLut(p.lut);
      const L = lut || this.dummyLut;
      this.bind(5, L.t, this.webgl2); gl.uniform1i(u.uLut, 5);
      gl.uniform1f(u.uLutSize, L.size);
      gl.uniform1f(u.uLutAmt, lut ? (p.lutAmount ?? 100) / 100 : 0);
      gl.uniform1f(u.uExp, p.exposure || 0);
      gl.uniform1f(u.uCon, (p.contrast || 0) / 100);
      gl.uniform1f(u.uHi, (p.highlights || 0) / 100);
      gl.uniform1f(u.uSh, (p.shadows || 0) / 100);
      gl.uniform1f(u.uWh, (p.whites || 0) / 100);
      gl.uniform1f(u.uBl, (p.blacks || 0) / 100);
      gl.uniform1f(u.uVib, (p.vibrance || 0) / 100);
      gl.uniform1f(u.uSat, (p.saturation || 0) / 100);
      gl.uniform3fv(u.uWB, wbGains(p.temp || 0, p.tint || 0));
      const hsl = new Float32Array(24);
      for (let i = 0; i < 8; i++) { hsl[i * 3] = (p.hslH[i] || 0) / 100; hsl[i * 3 + 1] = (p.hslS[i] || 0) / 100; hsl[i * 3 + 2] = (p.hslL[i] || 0) / 100; }
      gl.uniform3fv(u.uHsl, hsl);
      gl.uniform3fv(u.uGS, hueVec(p.gsH, p.gsS, 0.16));
      gl.uniform3fv(u.uGM, hueVec(p.gmH, p.gmS, 0.12));
      gl.uniform3fv(u.uGH, hueVec(p.ghH, p.ghS, 0.14));
      gl.uniform3f(u.uGL, (p.gsL || 0) / 100, (p.gmL || 0) / 100, (p.ghL || 0) / 100);
      gl.uniform1f(u.uGBlend, (p.gBlend ?? 50) / 100);
      gl.uniform1f(u.uGBal, (p.gBalance || 0) / 100);
      gl.uniform1f(u.uTexAmt, (p.texture || 0) / 100);
      gl.uniform1f(u.uClar, (p.clarity || 0) / 100);
      gl.uniform1f(u.uDehaze, (p.dehaze || 0) / 100);
      gl.uniform1f(u.uVig, (p.vignette || 0) / 100);
      gl.uniform1f(u.uVigMid, (p.vigMid ?? 50) / 100);
      gl.uniform1f(u.uGrain, (p.grain || 0) / 100);
      gl.uniform1f(u.uGrainSize, (p.grainSize ?? 25) / 100);
      gl.uniform1f(u.uSharp, (p.sharpen || 0) / 100 * 1.6);
      gl.uniform1f(u.uSeed, opts.seed || 0);
      gl.uniform1f(u.uSplit, opts.split >= 0 ? opts.split : -1);
      gl.uniform1f(u.uOrig, orig ? 1 : 0);
      gl.uniform1f(u.uCurveOn, curveOn ? 1 : 0);
      gl.uniform1f(u.uUseBlur, useBlur ? 1 : 0);
      gl.uniform2f(u.uRes, ow, oh);
      let out = null;
      if (opts.toTarget) { out = this.target('out', ow, oh); gl.uniform1f(u.uFlipY, 0); }
      else gl.uniform1f(u.uFlipY, 1);
      this.draw(m, out, ow, oh);
      return out;
    }
    readPixels(t) {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
      const px = new Uint8Array(t.w * t.h * 4);
      gl.readPixels(0, 0, t.w, t.h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return px;
    }
  }
  S.Renderer = Renderer;
})();
