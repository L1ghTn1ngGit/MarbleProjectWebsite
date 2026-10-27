const VERTEX = `attribute vec2 position;varying vec2 uvPosition;
void main(){uvPosition=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;

const FRAGMENT = `
precision highp float;
varying vec2 uvPosition;uniform float time;uniform float progress;uniform float aspect;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(1.6,-1.2,1.2,1.6)*p;a*=.5;}return v;}
vec2 flow(vec2 p){float t=time*.045;vec2 q=vec2(fbm(p+vec2(t,-t*.4)),fbm(p+vec2(4.7,-1.3)+t*.6));return p+q*2.3+vec2(progress*.9,progress*-.5);}
float surface(vec2 p){vec2 w=flow(p);return sin(w.x*2.3+w.y*1.4+fbm(w*1.3)*3.)*.20+fbm(w*1.8)*.35;}
void main(){vec2 p=(uvPosition-.5)*vec2(aspect,1.)*3.4;vec2 w=flow(p);float river=w.x*2.2+w.y*1.5+fbm(w*1.1)*3.5;
float v=abs(sin(river*2.7));float vein=1.-smoothstep(.015,.11,v);float halo=1.-smoothstep(.08,.35,v);
float fine=1.-smoothstep(.007,.025,abs(sin(river*8.1+fbm(w*5.)*.45)));
vec3 ivory=vec3(.972,.944,.902);vec3 color=mix(ivory,vec3(.66,.59,.50),vein*.36+halo*.12);color=mix(color,vec3(.69,.60,.44),fine*.09);
float e=.008;float h=surface(p);vec2 slope=vec2(surface(p+vec2(e,0.))-h,surface(p+vec2(0.,e))-h)/e;
vec3 normal=normalize(vec3(-slope*.7,1.));vec3 light=normalize(vec3(-.4,.6,1.));float diffuse=max(0.,dot(normal,light));float spec=pow(max(0.,dot(reflect(-light,normal),vec3(0.,0.,1.))),26.);
color*=.83+diffuse*.19;color+=spec*.12;color+=fbm(w*.6)*.025;gl_FragColor=vec4(color,1.);
}`;

export function mountFluidMarble(host, { reducedMotion = false, maxRatio = 1.25 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", {
    antialias: false,
    alpha: false,
    powerPreference: "low-power",
  });
  if (!gl) throw new Error("WebGL unavailable");

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uTime = gl.getUniformLocation(program, "time");
  const uProgress = gl.getUniformLocation(program, "progress");
  const uAspect = gl.getUniformLocation(program, "aspect");
  host.append(canvas);

  let frame = 0,
    paused = false,
    disposed = false,
    last = 0,
    clock = 0,
    target = 0,
    current = 0;
  const animate = () => !paused && !reducedMotion;

  function render(t) {
    frame = 0;
    if (disposed || document.hidden) return;
    // the stone moves slowly, 30fps looks the same and halves the gpu work
    if (animate() && last && t - last < 31) {
      frame = requestAnimationFrame(render);
      return;
    }
    if (animate()) {
      const dt = last ? Math.min(0.08, (t - last) / 1000) : 0;
      clock += dt;
      current += (target - current) * Math.min(1, dt * 6);
    }
    last = t;
    draw();
    if (animate()) frame = requestAnimationFrame(render);
  }
  function draw() {
    if (gl.isContextLost()) return;
    gl.uniform1f(uTime, clock);
    gl.uniform1f(uProgress, reducedMotion ? 0 : current);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  const request = () => {
    if (!frame && !disposed && !document.hidden)
      frame = requestAnimationFrame(render);
  };
  const resize = () => {
    const rect = host.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, maxRatio);
    const w = Math.max(1, Math.round(rect.width * ratio));
    const h = Math.max(1, Math.round(rect.height * ratio));
    // setting the size wipes the canvas, so skip no-op resizes and repaint straight away
    if (w === canvas.width && h === canvas.height) return;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform1f(uAspect, rect.width / Math.max(1, rect.height));
    draw();
    request();
  };
  // phones drop webgl under memory pressure; let the still marble behind it show instead of a blank
  canvas.addEventListener("webglcontextlost", () => {
    disposed = true;
    cancelAnimationFrame(frame);
    canvas.style.visibility = "hidden";
  });
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const visibility = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    if (!document.hidden) request();
  };
  document.addEventListener("visibilitychange", visibility);
  resize();

  return {
    setProgress(value) {
      target = Math.max(0, Math.min(1, value));

      if (animate()) request();
    },
    setPaused(value) {
      paused = value;
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      request();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    },
  };
}
