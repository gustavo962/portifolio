import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

export default function LightPillar({
  topColor = "#7c5cff",
  bottomColor = "#ff9ffc",
  intensity = 1.05,
  rotationSpeed = 0.55,
  interactive = true,
  className = "",
  glowAmount = 0.0065,
  pillarWidth = 2.35,
  pillarHeight = 0.52,
  noiseIntensity = 0.22,
  mixBlendMode = "screen",
  pillarRotation = 8,
  quality = "high",
  enabled = true,

  // NOVO: se true, nunca desliga o efeito automaticamente
  force = true,
}) {
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const rendererRef = useRef(null);
  const materialRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const geometryRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const timeRef = useRef(0);

  const [webGLSupported, setWebGLSupported] = useState(true);
  const [shouldRun, setShouldRun] = useState(true);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) setWebGLSupported(false);
  }, []);

  useEffect(() => {
    const onVis = () => setShouldRun(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!containerRef.current || !webGLSupported) return;

    const container = containerRef.current;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // se você NÃO quiser respeitar reduced motion, deixa force=true
    if (!force && reducedMotion) return;

    // limpa qualquer canvas anterior (evita duplicar)
    while (container.firstChild) container.removeChild(container.firstChild);

    let effectiveQuality = quality;

    const clampDPR = (dpr) => Math.min(dpr, 1.5);

    const qualitySettings = {
      low: {
        iterations: 20,
        waveIterations: 1,
        pixelRatio: 0.7,
        precision: "mediump",
        stepMultiplier: 1.65,
        fps: 30,
      },
      medium: {
        iterations: 36,
        waveIterations: 2,
        pixelRatio: 0.9,
        precision: "mediump",
        stepMultiplier: 1.3,
        fps: 45,
      },
      high: {
        iterations: 64,
        waveIterations: 3,
        pixelRatio: clampDPR(Math.min(window.devicePixelRatio || 1, 2)),
        precision: "highp",
        stepMultiplier: 1.08,
        fps: 60,
      },
    };

    const settings = qualitySettings[effectiveQuality] || qualitySettings.medium;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    cameraRef.current = camera;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference:
          effectiveQuality === "high" ? "high-performance" : "low-power",
        precision: settings.precision,
        stencil: false,
        depth: false,
      });
    } catch (e) {
      setWebGLSupported(false);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(settings.pixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const parseColor = (hex) => {
      const c = new THREE.Color(hex);
      return new THREE.Vector3(c.r, c.g, c.b);
    };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision ${settings.precision} float;

      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      uniform float uIntensity;
      uniform bool uInteractive;
      uniform float uGlowAmount;
      uniform float uPillarWidth;
      uniform float uPillarHeight;
      uniform float uNoiseIntensity;
      uniform float uRotCos;
      uniform float uRotSin;
      uniform float uPillarRotCos;
      uniform float uPillarRotSin;
      uniform float uWaveSin;
      uniform float uWaveCos;
      varying vec2 vUv;

      const float STEP_MULT = ${settings.stepMultiplier.toFixed(2)};
      const int MAX_ITER = ${settings.iterations};
      const int WAVE_ITER = ${settings.waveIterations};

      float hash(vec2 p){
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.x / uResolution.y, 1.0);

        uv.y *= 0.98;
        uv.x += 0.10 * uv.y;

        uv = vec2(
          uPillarRotCos * uv.x - uPillarRotSin * uv.y,
          uPillarRotSin * uv.x + uPillarRotCos * uv.y
        );

        vec3 ro = vec3(0.0, 0.0, -10.0);
        vec3 rd = normalize(vec3(uv, 1.0));

        float rotC = uRotCos;
        float rotS = uRotSin;

        if(uInteractive && (uMouse.x != 0.0 || uMouse.y != 0.0)) {
          float a = uMouse.x * 6.283185;
          rotC = cos(a);
          rotS = sin(a);
        }

        vec3 col = vec3(0.0);
        float t = 0.12;

        for(int i = 0; i < MAX_ITER; i++) {
          vec3 p = ro + rd * t;
          p.xz = vec2(rotC * p.x - rotS * p.z, rotS * p.x + rotC * p.z);

          vec3 q = p;
          q.y = p.y * uPillarHeight + uTime;

          float freq = 1.0;
          float amp = 1.0;

          for(int j = 0; j < WAVE_ITER; j++) {
            q.xz = vec2(uWaveCos * q.x - uWaveSin * q.z, uWaveSin * q.x + uWaveCos * q.z);
            q += cos(q.zxy * freq - uTime * float(j) * 2.0) * amp;
            freq *= 2.0;
            amp *= 0.5;
          }

          float d = length(cos(q.xz)) - 0.2;
          float bound = length(p.xz) - uPillarWidth;

          float k = 4.0;
          float h = max(k - abs(d - bound), 0.0);
          d = max(d, bound) + h * h * 0.0625 / k;

          d = abs(d) * 0.15 + 0.01;

          float grad = clamp((15.0 - p.y) / 30.0, 0.0, 1.0);
          col += mix(uBottomColor, uTopColor, grad) / d;

          t += d * STEP_MULT;
          if(t > 50.0) break;
        }

        float widthNorm = uPillarWidth / 3.0;
        col = tanh(col * uGlowAmount / widthNorm);

        float n = hash(gl_FragCoord.xy + uTime) - 0.5;
        col -= n * 0.08 * uNoiseIntensity;

        gl_FragColor = vec4(col * uIntensity, 1.0);
      }
    `;

    const pillarRotRad = (pillarRotation * Math.PI) / 180;
    const waveSin = Math.sin(0.4);
    const waveCos = Math.cos(0.4);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uMouse: { value: mouseRef.current },
        uTopColor: { value: parseColor(topColor) },
        uBottomColor: { value: parseColor(bottomColor) },
        uIntensity: { value: intensity },
        uInteractive: { value: interactive },
        uGlowAmount: { value: glowAmount },
        uPillarWidth: { value: pillarWidth },
        uPillarHeight: { value: pillarHeight },
        uNoiseIntensity: { value: noiseIntensity },
        uRotCos: { value: 1.0 },
        uRotSin: { value: 0.0 },
        uPillarRotCos: { value: Math.cos(pillarRotRad) },
        uPillarRotSin: { value: Math.sin(pillarRotRad) },
        uWaveSin: { value: waveSin },
        uWaveCos: { value: waveCos },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    materialRef.current = material;

    const geometry = new THREE.PlaneGeometry(2, 2);
    geometryRef.current = geometry;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let mouseMoveTimeout = null;
    const handleMouseMove = (event) => {
      if (!interactive) return;
      if (mouseMoveTimeout) return;

      mouseMoveTimeout = window.setTimeout(() => (mouseMoveTimeout = null), 16);

      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.set(x, y);
    };

    if (interactive) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
    }

    let lastTime = performance.now();
    const targetFPS = settings.fps;
    const frameTime = 1000 / targetFPS;

    const animate = (currentTime) => {
      if (
        !shouldRun ||
        !materialRef.current ||
        !rendererRef.current ||
        !sceneRef.current ||
        !cameraRef.current
      ) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = currentTime - lastTime;
      if (deltaTime >= frameTime) {
        timeRef.current += 0.016 * rotationSpeed;
        const tt = timeRef.current;

        materialRef.current.uniforms.uTime.value = tt;
        materialRef.current.uniforms.uRotCos.value = Math.cos(tt * 0.35);
        materialRef.current.uniforms.uRotSin.value = Math.sin(tt * 0.35);

        rendererRef.current.render(sceneRef.current, cameraRef.current);
        lastTime = currentTime - (deltaTime % frameTime);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    let resizeTimeout = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);

      resizeTimeout = window.setTimeout(() => {
        if (!rendererRef.current || !materialRef.current) return;
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

        rendererRef.current.setPixelRatio(settings.pixelRatio);
        rendererRef.current.setSize(newWidth, newHeight);
        materialRef.current.uniforms.uResolution.value.set(newWidth, newHeight);
      }, 120);
    };

    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      if (interactive) window.removeEventListener("mousemove", handleMouseMove);

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
      }
      if (materialRef.current) materialRef.current.dispose();
      if (geometryRef.current) geometryRef.current.dispose();

      rendererRef.current = null;
      materialRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      geometryRef.current = null;
      rafRef.current = null;
    };
  }, [
    enabled,
    topColor,
    bottomColor,
    intensity,
    rotationSpeed,
    interactive,
    glowAmount,
    pillarWidth,
    pillarHeight,
    noiseIntensity,
    pillarRotation,
    webGLSupported,
    quality,
    shouldRun,
    force,
  ]);

  if (!enabled) return null;

  // fallback VISÍVEL se WebGL falhar
  if (!webGLSupported) {
    return (
      <div
        className={className}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 0,
          mixBlendMode,
          background:
            "radial-gradient(circle at 25% 25%, rgba(82,39,255,0.35), transparent 55%), radial-gradient(circle at 75% 70%, rgba(255,159,252,0.28), transparent 60%)",
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
        mixBlendMode,
      }}
    />
  );
}
