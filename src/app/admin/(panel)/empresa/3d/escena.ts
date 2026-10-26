// La oficina de Acopio en 3D (three.js), separada de React para poder probarla sola.
// Edificio con hall de entrada (recepción + pantalla con los números) y un pasillo con una oficina por
// agente. Cada agente es una persona 3D sentada en su escritorio: respira, tipea, gira la cabeza hacia
// quien entra y mueve la boca cuando habla (evento «acopio-boca»).

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { clone as clonarEsqueleto } from "three/examples/jsm/utils/SkeletonUtils.js";
import { huesos, sentar, type Huesos } from "./pose";
import { decorarOficina, decorarPasillo } from "./decor";
import { sonar } from "./sonidos";

export type AgenteEscena = {
  id: string;
  persona: string;
  nombre: string;
  area: string;
  emoji: string;
  estado: "ok" | "falla" | "pendiente" | "atrasado" | "descanso";
  estadoTexto: string;
  ultimo: string;
};
export type DatosEscena = { agentes: AgenteEscena[]; areas: string[]; kpis: { titulo: string; valor: string }[]; hoy: string; hora: string; temporada: string };
export type Eventos = { cerca: (id: string | null) => void; tocar: (id: string) => void; listo: () => void; progreso?: (p: number) => void };
export type Control = { destruir: () => void; irA: (id: string, mirar?: boolean, saltar?: boolean, callado?: boolean) => void; enfocar: (id: string | null) => void; teclas: Set<string> };

const MUJERES = new Set(["gerente", "hunter", "fidelizacion", "anuncios", "marketing", "finanzas", "alianzas", "corporativo"]);
const COLOR_AREA: Record<string, number> = { direccion: 0xd9a441, comercial: 0x2f9e6a, marketing: 0x8a6bd1, operaciones: 0x3b8fd1, administracion: 0x9c8b74 };
const COLOR_ESTADO: Record<AgenteEscena["estado"], number> = { ok: 0x22c55e, falla: 0xef4444, atrasado: 0xf59e0b, pendiente: 0x38bdf8, descanso: 0x9ca3af };
const A = 3.2; // medio ancho del pasillo
const PROF = 9; // profundidad de cada oficina (x)
const LARGO = 8; // ancho de cada oficina (z)

function lienzo(ancho: number, alto: number, dibujar: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = ancho;
  c.height = alto;
  dibujar(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function texto(g: CanvasRenderingContext2D, t: string, x: number, y: number, tam: number, color: string, peso = 600, alin: CanvasTextAlign = "left", max?: number) {
  g.font = `${peso} ${tam}px Inter, system-ui, -apple-system, Segoe UI, sans-serif`;
  g.fillStyle = color;
  g.textAlign = alin;
  g.textBaseline = "alphabetic";
  g.fillText(t, x, y, max);
}

function lineas(t: string, max: number): string[] {
  const out: string[] = [];
  let l = "";
  for (const p of t.split(/\s+/)) {
    if ((l + " " + p).trim().length > max) {
      out.push(l.trim());
      l = p;
    } else l += " " + p;
  }
  if (l.trim()) out.push(l.trim());
  return out;
}

/** Piso de madera clara (tablas) hecho en canvas. */
function texturaMadera() {
  const t = lienzo(1024, 1024, (g) => {
    g.fillStyle = "#d8c3a2";
    g.fillRect(0, 0, 1024, 1024);
    for (let y = 0; y < 1024; y += 64) {
      const desf = ((y / 64) % 3) * 170;
      for (let x = -desf; x < 1024; x += 512) {
        const tono = 190 + Math.floor(Math.random() * 30);
        g.fillStyle = `rgb(${tono + 22},${tono},${tono - 34})`;
        g.fillRect(x + 2, y + 2, 508, 60);
        g.strokeStyle = "rgba(120,90,60,0.08)";
        for (let k = 0; k < 6; k++) {
          g.beginPath();
          const yy = y + 8 + Math.random() * 48;
          g.moveTo(x, yy);
          g.bezierCurveTo(x + 150, yy + 4, x + 350, yy - 4, x + 510, yy + 2);
          g.stroke();
        }
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export async function crearEscena(cont: HTMLElement, datos: DatosEscena, ev: Eventos, opciones: { tv: boolean; liviano?: boolean }): Promise<Control> {
  // Modo liviano para el navegador de un Smart TV (su placa de video no aguanta el reflejo del ambiente
  // ni las sombras suaves: se veía todo blanco). También si el equipo no tiene WebGL2.
  const prueba = document.createElement("canvas").getContext("webgl2");
  const liviano = opciones.liviano || !prueba;
  const render = new THREE.WebGLRenderer({ antialias: !liviano, powerPreference: "high-performance" });
  render.setPixelRatio(liviano ? 1 : Math.min(window.devicePixelRatio, opciones.tv ? 1 : 1.75));
  render.setSize(cont.clientWidth, cont.clientHeight);
  render.outputColorSpace = THREE.SRGBColorSpace;
  render.toneMapping = liviano ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  render.toneMappingExposure = 1.05;
  render.shadowMap.enabled = !liviano;
  render.shadowMap.type = THREE.PCFSoftShadowMap;
  cont.appendChild(render.domElement);

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0xeef1ec);
  escena.fog = new THREE.Fog(0xeef1ec, 35, 110);
  const pmrem = new THREE.PMREMGenerator(render);
  if (!liviano) {
    escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    escena.environmentIntensity = 0.55;
  }

  const camara = new THREE.PerspectiveCamera(62, cont.clientWidth / cont.clientHeight, 0.05, 220);
  escena.add(new THREE.HemisphereLight(0xffffff, 0xd6c7ae, liviano ? 1.6 : 0.9));
  const sol = new THREE.DirectionalLight(0xfff4e0, liviano ? 1.1 : 1.5);
  sol.position.set(18, 30, 12);
  sol.castShadow = !liviano;
  sol.shadow.mapSize.set(opciones.tv ? 2048 : 4096, opciones.tv ? 2048 : 4096);
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.02;
  escena.add(sol, sol.target);

  // ---------- materiales ----------
  const madera = texturaMadera();
  madera.repeat.set(6, 30);
  const matPiso = new THREE.MeshStandardMaterial({ map: madera, roughness: 0.55, metalness: 0 });
  const matPared = new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.92 });
  const matVidrio = new THREE.MeshPhysicalMaterial({ color: 0xdff1ff, transmission: 0.0, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0, clearcoat: 1 });
  const matMarco = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.4, metalness: 0.7 });
  const matRoble = new THREE.MeshStandardMaterial({ color: 0xb98a5a, roughness: 0.45 });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.35, metalness: 0.8 });
  const matNegro = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.5, metalness: 0.2 });
  const matTela = new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.85 });
  const matHoja = new THREE.MeshStandardMaterial({ color: 0x3d7d4a, roughness: 0.8 });
  const matMaceta = new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.6 });

  const caja = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, sombra = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = sombra;
    m.receiveShadow = true;
    escena.add(m);
    return m;
  };

  // Choques: cajas en el piso.
  const choques: { x1: number; x2: number; z1: number; z2: number }[] = [];
  const bloquea = (x1: number, x2: number, z1: number, z2: number) => choques.push({ x1: Math.min(x1, x2), x2: Math.max(x1, x2), z1: Math.min(z1, z2), z2: Math.max(z1, z2) });
  const pared = (x1: number, z1: number, x2: number, z2: number, mat: THREE.Material = matPared, alto = 3.4) => {
    const w = Math.max(Math.abs(x2 - x1), 0.12);
    const d = Math.max(Math.abs(z2 - z1), 0.12);
    caja(w, alto, d, mat, (x1 + x2) / 2, alto / 2, (z1 + z2) / 2, mat !== matVidrio);
    bloquea(x1 - 0.06, x2 + 0.06, z1 - 0.06, z2 + 0.06);
  };

  const orden = [...datos.agentes].sort((x, y) => datos.areas.indexOf(x.area) - datos.areas.indexOf(y.area));
  const filas = Math.ceil(orden.length / 2);
  const fondo = -filas * LARGO;

  // Piso general y pasillo.
  const piso = new THREE.Mesh(new THREE.PlaneGeometry((A + PROF) * 2 + 2, -fondo + 26), matPiso);
  piso.rotation.x = -Math.PI / 2;
  piso.position.set(0, 0, fondo / 2 + 9);
  piso.receiveShadow = true;
  escena.add(piso);
  const alfombra = new THREE.Mesh(new THREE.PlaneGeometry(2.4, -fondo), new THREE.MeshStandardMaterial({ color: 0x1d4d3c, roughness: 1 }));
  alfombra.rotation.x = -Math.PI / 2;
  alfombra.position.set(0, 0.005, fondo / 2);
  alfombra.receiveShadow = true;
  escena.add(alfombra);
  // Techo con paneles de luz a lo largo del pasillo.
  const techo = new THREE.Mesh(new THREE.PlaneGeometry((A + PROF) * 2 + 2, -fondo + 26), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.BackSide }));
  techo.rotation.x = -Math.PI / 2;
  techo.position.set(0, 3.4, fondo / 2 + 9);
  escena.add(techo);
  const matLuz = new THREE.MeshBasicMaterial({ color: 0xfffaf0 });
  for (let z = 10; z > fondo; z -= 4) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.4), matLuz);
    l.rotation.x = Math.PI / 2;
    l.position.set(0, 3.39, z);
    escena.add(l);
  }

  // ---------- personas ----------
  const loader = new GLTFLoader();
  let cargados = 0;
  const cargar = (url: string) =>
    loader.loadAsync(url, (e) => {
      if (e.total) ev.progreso?.(Math.min(0.95, (cargados + e.loaded / e.total) / 2));
    }).then((g) => {
      cargados++;
      return g;
    });
  const [gMujer, gHombre] = await Promise.all([cargar("/modelos/mujer.glb"), cargar("/modelos/hombre.glb")]);
  ev.progreso?.(1);

  type Persona = { id: string; raiz: THREE.Object3D; h: Huesos; cuello?: THREE.Bone; cabeza?: THREE.Bone; columna?: THREE.Bone; manos: THREE.Bone[]; bocas: { m: THREE.Mesh; i: number }[]; mira: THREE.Vector3; base: Map<THREE.Bone, THREE.Quaternion>; giro: number; habla: number; fase: number; estado: AgenteEscena["estado"] };
  const personas: Persona[] = [];
  const clicables: { obj: THREE.Object3D; id: string }[] = [];
  const lugares: { id: string; lado: -1 | 1; zc: number; frente: THREE.Vector3; mira: THREE.Vector3 }[] = [];

  orden.forEach((a, i) => {
    const lado = (i % 2 === 0 ? -1 : 1) as -1 | 1;
    const zc = -(Math.floor(i / 2) * LARGO + LARGO / 2);
    const xIn = lado * A;
    const xOut = lado * (A + PROF);
    const z1 = zc - LARGO / 2;
    const z2 = zc + LARGO / 2;
    const color = new THREE.Color(COLOR_AREA[a.area] ?? 0x888888);

    // Paredes: fondo con ventanal, divisiones y frente de vidrio con marco y puerta.
    pared(xIn, z1, xOut, z1);
    pared(xIn, z2, xOut, z2);
    pared(xOut, z1, xOut, z2, new THREE.MeshStandardMaterial({ color: color.clone().lerp(new THREE.Color(0xffffff), 0.82), roughness: 0.9 }));
    const cielo = lienzo(512, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, "#9cc7ec");
      gr.addColorStop(0.65, "#e7f1f7");
      gr.addColorStop(0.66, "#7c9a6b");
      gr.addColorStop(1, "#5d7d52");
      g.fillStyle = gr;
      g.fillRect(0, 0, 512, 256);
      g.fillStyle = "rgba(90,120,80,0.8)";
      g.beginPath();
      g.moveTo(0, 170);
      for (let x = 0; x <= 512; x += 32) g.lineTo(x, 150 + Math.sin(x / 60 + i) * 18);
      g.lineTo(512, 256);
      g.lineTo(0, 256);
      g.fill();
    });
    const ventana = new THREE.Mesh(new THREE.PlaneGeometry(LARGO - 2.2, 1.6), new THREE.MeshBasicMaterial({ map: cielo }));
    ventana.position.set(xOut - lado * 0.07, 1.9, zc);
    ventana.rotation.y = lado === -1 ? Math.PI / 2 : -Math.PI / 2;
    escena.add(ventana);
    // frente de vidrio
    pared(xIn, z1, xIn, zc - 1.1, matVidrio);
    pared(xIn, zc + 1.1, xIn, z2, matVidrio);
    for (const zz of [z1 + 0.03, zc - 1.1, zc + 1.1, z2 - 0.03]) caja(0.08, 3.4, 0.08, matMarco, xIn, 1.7, zz);
    caja(0.08, 0.08, LARGO, matMarco, xIn, 3.36, zc, false);

    // Cartel de la puerta (vidrio esmerilado con el nombre).
    const cartel = lienzo(1024, 220, (g) => {
      g.fillStyle = "rgba(255,255,255,0.96)";
      g.fillRect(0, 0, 1024, 220);
      g.fillStyle = `#${color.getHexString()}`;
      g.fillRect(0, 0, 14, 220);
      texto(g, `${a.persona}`, 48, 105, 88, "#1c1917", 800);
      texto(g, a.nombre, 48, 175, 46, "#57534e", 500);
      g.fillStyle = `#${new THREE.Color(COLOR_ESTADO[a.estado]).getHexString()}`;
      g.beginPath();
      g.arc(960, 70, 22, 0, Math.PI * 2);
      g.fill();
    });
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.56), new THREE.MeshBasicMaterial({ map: cartel }));
    placa.position.set(xIn - lado * 0.06, 2.85, zc - 1.75);
    placa.rotation.y = lado === -1 ? Math.PI / 2 : -Math.PI / 2;
    escena.add(placa);

    // Alfombra del área + luz de techo.
    const alf = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.4), new THREE.MeshStandardMaterial({ color: color.clone().lerp(new THREE.Color(0xffffff), 0.45), roughness: 1 }));
    alf.rotation.x = -Math.PI / 2;
    alf.position.set(lado * (A + PROF * 0.55), 0.006, zc);
    alf.receiveShadow = true;
    escena.add(alf);
    const luz = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), matLuz);
    luz.rotation.x = Math.PI / 2;
    luz.position.set(lado * (A + PROF * 0.55), 3.39, zc);
    escena.add(luz);

    // Escritorio de roble con patas de metal, de frente a la puerta.
    const xPer = lado * (A + PROF * 0.62); // donde está sentada la persona
    const xEsc = xPer - lado * 0.72; // escritorio, entre la persona y la puerta
    caja(0.85, 0.05, 1.9, matRoble, xEsc, 0.76, zc);
    for (const [dx, dz] of [[-0.36, -0.88], [0.36, -0.88], [-0.36, 0.88], [0.36, 0.88]]) caja(0.04, 0.74, 0.04, matMetal, xEsc + dx, 0.37, zc + dz, false);
    caja(0.03, 0.45, 1.8, matRoble, xEsc - lado * 0.4, 0.5, zc); // panel frontal
    bloquea(xEsc - 0.5, xEsc + 0.5, zc - 1.05, zc + 1.05);
    // Monitor de lado (para que se vea la cara) con pantalla encendida.
    const pantalla = lienzo(640, 360, (g) => {
      g.fillStyle = "#0f172a";
      g.fillRect(0, 0, 640, 360);
      g.fillStyle = `#${color.getHexString()}`;
      g.fillRect(0, 0, 640, 44);
      texto(g, `${a.persona} · ${a.nombre}`, 20, 30, 24, "#fff", 700);
      for (let k = 0; k < 9; k++) {
        const hgt = 40 + Math.random() * 180;
        g.fillStyle = k % 3 === 0 ? "#fbbf24" : "#60a5fa";
        g.fillRect(40 + k * 62, 330 - hgt, 38, hgt);
      }
    });
    const mon = new THREE.Group();
    const marco = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.7), matNegro);
    const vidrio = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.38), new THREE.MeshBasicMaterial({ map: pantalla }));
    vidrio.position.x = -0.017;
    vidrio.rotation.y = -Math.PI / 2;
    const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2), matMetal);
    pata.position.set(0.04, -0.3, 0);
    const pieMon = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.015, 24), matMetal);
    pieMon.position.set(0.04, -0.4, 0);
    mon.add(marco, vidrio, pata, pieMon);
    // El monitor mira a la persona: el vidrio apunta hacia -x local; lo giramos para que mire a xPer.
    mon.position.set(xEsc + lado * 0.12, 1.19, zc + 0.62);
    mon.lookAt(new THREE.Vector3(xPer + lado * 0.6, 1.19, zc - 0.2));
    mon.rotateY(Math.PI / 2);
    marco.castShadow = true;
    escena.add(mon);
    caja(0.16, 0.015, 0.45, new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.5 }), xEsc + lado * 0.2, 0.79, zc, false); // teclado
    const taza = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
    taza.position.set(xEsc - lado * 0.1, 0.835, zc - 0.62);
    escena.add(taza);
    // Placa con nombre sobre el escritorio, mirando a la puerta.
    const nombre = lienzo(512, 128, (g) => {
      g.fillStyle = "#111827";
      g.fillRect(0, 0, 512, 128);
      texto(g, a.persona, 256, 62, 48, "#ffffff", 800, "center");
      texto(g, a.nombre, 256, 104, 26, "#d6d3d1", 500, "center");
    });
    const cartelito = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.125), new THREE.MeshBasicMaterial({ map: nombre }));
    cartelito.position.set(xEsc - lado * 0.43, 0.84, zc - 0.45);
    cartelito.rotation.y = lado === -1 ? Math.PI / 2 : -Math.PI / 2;
    escena.add(cartelito);
    // Luz de estado (tira LED bajo el escritorio).
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1.7), new THREE.MeshBasicMaterial({ color: COLOR_ESTADO[a.estado] }));
    led.position.set(xEsc - lado * 0.43, 0.74, zc);
    escena.add(led);

    // Silla de oficina.
    caja(0.5, 0.08, 0.5, matTela, xPer, 0.47, zc, true);
    caja(0.07, 0.6, 0.48, matTela, xPer + lado * 0.27, 0.86, zc, true);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4), matMetal);
    col.position.set(xPer, 0.23, zc);
    escena.add(col);
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2;
      const pie = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.04), matMetal);
      pie.position.set(xPer + Math.cos(ang) * 0.14, 0.04, zc + Math.sin(ang) * 0.14);
      pie.rotation.y = -ang;
      escena.add(pie);
    }
    bloquea(xPer - 0.4, xPer + 0.4, zc - 0.4, zc + 0.4);

    // Planta alta y estante con frascos de frutos secos.
    const maceta = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.45, 24), matMaceta);
    maceta.position.set(xOut - lado * 0.6, 0.225, z1 + 0.7);
    escena.add(maceta);
    for (let k = 0; k < 7; k++) {
      const hoja = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 6), matHoja);
      hoja.position.set(xOut - lado * 0.6 + Math.cos(k) * 0.08, 0.85, z1 + 0.7 + Math.sin(k) * 0.08);
      hoja.rotation.set(Math.cos(k * 2) * 0.35, 0, Math.sin(k * 2) * 0.35);
      hoja.castShadow = true;
      escena.add(hoja);
    }
    bloquea(xOut - lado * 0.9, xOut - lado * 0.3, z1 + 0.4, z1 + 1);
    const xEst = xOut - lado * 0.25;
    for (const y of [1.1, 1.55]) caja(0.35, 0.03, 1.8, matRoble, xEst, y, z2 - 1.3, false);
    const coloresFrutos = [0xc89b63, 0x7a4b2a, 0xe0c27a, 0x5b3a1e, 0xa86b3c, 0x8a5a2b];
    for (const y of [1.12, 1.57])
      for (let k = 0; k < 5; k++) {
        const fr = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 16), new THREE.MeshStandardMaterial({ color: coloresFrutos[(k + i) % 6], roughness: 0.7 }));
        fr.position.set(xEst, y + 0.12, z2 - 2.0 + k * 0.33);
        escena.add(fr);
      }
    // Pizarra con lo último que hizo.
    const piz = lienzo(1200, 520, (g) => {
      g.fillStyle = "#fffdf8";
      g.fillRect(0, 0, 1200, 520);
      g.fillStyle = `#${color.getHexString()}`;
      g.fillRect(0, 0, 1200, 12);
      texto(g, `${a.emoji}  ${a.estadoTexto}`, 50, 90, 50, "#0b5540", 700);
      lineas(a.ultimo, 46)
        .slice(0, 5)
        .forEach((l, k) => texto(g, l, 50, 170 + k * 64, 40, "#292524", 500));
    });
    const pizarra = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.13), new THREE.MeshBasicMaterial({ map: piz }));
    pizarra.position.set(lado * (A + PROF * 0.55), 1.75, z2 - 0.07);
    pizarra.rotation.y = Math.PI;
    escena.add(pizarra);

    decorarOficina({ escena, id: a.id, emoji: a.emoji, persona: a.persona, lado, zc, z1, z2, xIn, xOut, xEsc, xPer, color, bloquea, lienzo });

    // La persona.
    const g = MUJERES.has(a.id) ? gMujer : gHombre;
    const raiz = clonarEsqueleto(g.scene);
    // Altura medida por el esqueleto (la caja de una malla con piel no es confiable en Mixamo).
    raiz.updateMatrixWorld(true);
    const hb = huesos(raiz);
    const yDe = (b?: THREE.Object3D) => (b ? b.getWorldPosition(new THREE.Vector3()).y : NaN);
    const arriba = hb.HeadTop_End ?? hb.Head;
    const abajo = Math.min(yDe(hb.LeftToeBase ?? hb.LeftFoot), yDe(hb.RightToeBase ?? hb.RightFoot));
    let alto = yDe(arriba) - abajo + (hb.HeadTop_End ? 0.04 : 0.2) * (yDe(arriba) - abajo) / 1.6;
    if (!(alto > 0)) {
      const caja3 = new THREE.Box3().setFromObject(raiz);
      alto = caja3.max.y - caja3.min.y;
    }
    raiz.scale.multiplyScalar((MUJERES.has(a.id) ? 1.66 : 1.76) / alto);
    raiz.rotation.y = lado === -1 ? Math.PI / 2 : -Math.PI / 2; // mira a la puerta
    raiz.position.set(xPer + lado * 0.05, 0, zc);
    escena.add(raiz);
    const bocas: { m: THREE.Mesh; i: number }[] = [];
    raiz.traverse((z) => {
      const m = z as THREE.Mesh;
      if (z.name === "Wolf3D_Headwear") z.visible = false;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false;
        if (/Outfit_Top/.test(m.name)) {
          m.material = (m.material as THREE.MeshStandardMaterial).clone();
          (m.material as THREE.MeshStandardMaterial).color = color.clone().lerp(new THREE.Color(0xffffff), 0.15);
        }
        if (/Beard/.test(m.name) && i % 3 === 0) m.visible = false;
        const idx = m.morphTargetDictionary?.mouthOpen;
        if (idx !== undefined) bocas.push({ m, i: idx });
      }
    });
    const h = sentar(raiz);
    raiz.updateMatrixWorld(true);
    const cad = h.Hips.getWorldPosition(new THREE.Vector3());
    raiz.position.y += 0.6 - cad.y;
    const base = new Map<THREE.Bone, THREE.Quaternion>();
    for (const b of Object.values(h)) base.set(b, b.quaternion.clone());
    const mira = new THREE.Vector3(xPer - lado * 2, 1.4, zc);
    personas.push({ id: a.id, raiz, h, cuello: h.Neck, cabeza: h.Head, columna: h.Spine1 ?? h.Spine, manos: [h.LeftHand, h.RightHand, h.LeftForeArm, h.RightForeArm].filter(Boolean), bocas, mira, base, giro: 0, habla: 0, fase: Math.random() * 10, estado: a.estado });
    raiz.traverse((z) => {
      if ((z as THREE.Mesh).isMesh) clicables.push({ obj: z, id: a.id });
    });
    lugares.push({ id: a.id, lado, zc, frente: new THREE.Vector3(xEsc - lado * 1.55, 0, zc), mira: new THREE.Vector3(xPer, 1.35, zc) });
  });

  decorarPasillo(escena, A, fondo, LARGO, bloquea);

  // Paredes del fondo y del hall.
  pared(-(A + PROF), fondo, A + PROF, fondo);
  pared(-(A + PROF), 0, -A, 0);
  pared(A, 0, A + PROF, 0);
  pared(-(A + PROF), 0, -(A + PROF), 16);
  pared(A + PROF, 0, A + PROF, 16);
  pared(-(A + PROF), 16, A + PROF, 16);

  // Hall: pantalla LED con los números, recepción con logo, sillones y plantas.
  const led = lienzo(2048, 860, (g) => {
    const gr = g.createLinearGradient(0, 0, 2048, 860);
    gr.addColorStop(0, "#0b2a20");
    gr.addColorStop(1, "#10251c");
    g.fillStyle = gr;
    g.fillRect(0, 0, 2048, 860);
    texto(g, "ACOPIO SALUDABLE", 80, 120, 84, "#fbbf24", 900);
    texto(g, `${datos.hoy} · ${datos.hora}   ·   ${datos.temporada}`, 80, 190, 40, "#a7f3d0", 500);
    datos.kpis.slice(0, 6).forEach((k, n) => {
      const x = 80 + (n % 3) * 640;
      const y = 300 + Math.floor(n / 3) * 270;
      g.fillStyle = "rgba(255,255,255,0.06)";
      g.fillRect(x, y, 600, 230);
      texto(g, k.valor, x + 30, y + 130, 96, "#ffffff", 800, "left", 540);
      texto(g, k.titulo, x + 30, y + 195, 38, "#d6d3d1", 500, "left", 540);
    });
  });
  // Pantalla LED en la pared izquierda del hall (de cara a quien entra) y logo grande a la derecha.
  const xPanel = (A + PROF + A) / 2;
  const pantallaHall = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.02), new THREE.MeshBasicMaterial({ map: led, toneMapped: false }));
  pantallaHall.position.set(-xPanel, 1.75, 0.2);
  escena.add(pantallaHall);
  caja(7.5, 3.25, 0.12, matNegro, -xPanel, 1.75, 0.1, false);
  const marca = lienzo(1600, 700, (g) => {
    g.fillStyle = "#f3efe6";
    g.fillRect(0, 0, 1600, 700);
    for (let x = 0; x < 1600; x += 46) {
      g.fillStyle = x % 92 ? "#b98a5a" : "#a87a4c";
      g.fillRect(x, 0, 40, 700);
    }
    g.fillStyle = "rgba(11,85,64,0.96)";
    g.fillRect(180, 170, 1240, 360);
    texto(g, "Acopio.", 800, 380, 190, "#ffffff", 900, "center");
    texto(g, `${datos.agentes.length} personas trabajando para vos`, 800, 480, 52, "#fbbf24", 600, "center");
  });
  const panelMarca = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 3.3), new THREE.MeshStandardMaterial({ map: marca, roughness: 0.7 }));
  panelMarca.position.set(xPanel, 1.7, 0.08);
  escena.add(panelMarca);
  const logo = lienzo(1024, 256, (g) => {
    g.fillStyle = "#0b5540";
    g.fillRect(0, 0, 1024, 256);
    texto(g, "Acopio.", 512, 150, 120, "#ffffff", 900, "center");
    texto(g, "frutos secos · Villa Carlos Paz", 512, 220, 40, "#fbbf24", 600, "center");
  });
  caja(4.2, 1.05, 0.9, matRoble, 0, 0.525, 12.4);
  bloquea(-2.2, 2.2, 11.9, 12.9);
  const frenteRecep = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: logo }));
  frenteRecep.position.set(0, 0.53, 11.94);
  frenteRecep.rotation.y = Math.PI;
  escena.add(frenteRecep);
  for (const sx of [-1, 1]) {
    caja(2.4, 0.42, 0.9, new THREE.MeshStandardMaterial({ color: 0x3f5f4f, roughness: 0.9 }), sx * 8.5, 0.21, 8);
    caja(2.4, 0.5, 0.18, new THREE.MeshStandardMaterial({ color: 0x3f5f4f, roughness: 0.9 }), sx * 8.5, 0.55, 8.45);
    bloquea(sx * 8.5 - 1.3, sx * 8.5 + 1.3, 7.5, 8.6);
    const mac = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.6, 24), matMaceta);
    mac.position.set(sx * 11.5, 0.3, 14.8);
    escena.add(mac);
    for (let k = 0; k < 9; k++) {
      const hoja = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.3, 6), matHoja);
      hoja.position.set(sx * 11.5 + Math.cos(k) * 0.1, 1.1, 14.8 + Math.sin(k) * 0.1);
      hoja.rotation.set(Math.cos(k * 2) * 0.4, 0, Math.sin(k * 2) * 0.4);
      escena.add(hoja);
    }
  }

  // ---------- visitante (cámara) ----------
  const yo = { x: 0, z: 9.5, giro: 0, cabeceo: -0.04, vx: 0, vz: 0 };
  let destino: { x: number; z: number; giro: number; cabeceo: number; alLlegar?: () => void } | null = null;
  // Camino por puntos: pasillo → puerta → frente del escritorio (sin atravesar paredes).
  let camino: { x: number; z: number }[] = [];
  const teclas = new Set<string>();
  let enfocado: string | null = null;

  // Salto («tum»): aparece en la puerta de esa oficina, mirando adentro, y entra caminando hasta el
  // escritorio. Así ir a Gonza (la última oficina) es instantáneo, sin cruzar todo el pasillo.
  const fov = { base: 62, kick: 0 };
  const saltarA = (id: string, mirar: boolean, callado = false) => {
    const l = lugares.find((x) => x.id === id);
    if (!l) return;
    const d = new THREE.Vector3().subVectors(l.mira, l.frente);
    const giro = Math.atan2(-d.x, -d.z);
    yo.x = l.lado * (A - 0.4);
    yo.z = l.zc;
    yo.vx = 0;
    yo.vz = 0;
    yo.giro = l.lado > 0 ? -Math.PI / 2 : Math.PI / 2;
    yo.cabeceo = -0.05;
    camino = [];
    destino = { x: l.frente.x, z: l.frente.z, giro, cabeceo: -0.08, alLlegar: mirar ? () => ev.tocar(id) : undefined };
    fov.kick = callado ? 6 : 14;
    if (!callado) sonar("tum");
    window.dispatchEvent(new CustomEvent("acopio-destello", { detail: { suave: callado } }));
  };

  const irA = (id: string, mirar = false, saltar = false, callado = false) => {
    if (saltar) return saltarA(id, mirar, callado);
    const l = lugares.find((x) => x.id === id);
    if (!l) return;
    const d = new THREE.Vector3().subVectors(l.mira, l.frente);
    const giro = Math.atan2(-d.x, -d.z);
    const xIn = l.lado * A;
    const dentro = (x: number) => Math.abs(x) > A; // ¿estoy dentro de alguna oficina?
    camino = [];
    const zAca = -(Math.floor(-yo.z / LARGO) * LARGO + LARGO / 2);
    const mismaOficina = dentro(yo.x) && Math.sign(yo.x) === l.lado && Math.abs(zAca - l.zc) < 0.1;
    const enLaPuerta = !dentro(yo.x) && Math.abs(yo.z - l.zc) < 1.2 && Math.sign(yo.x || l.lado) === l.lado && Math.abs(yo.x) > A - 1.6;
    if (mismaOficina) {
      // ya estoy en su oficina: voy directo al escritorio
    } else if (enLaPuerta) {
      camino.push({ x: xIn + l.lado * 0.9, z: l.zc });
    } else if (dentro(yo.x)) {
      // salir por la puerta de la oficina en la que estoy
      const zPuerta = zAca;
      camino.push({ x: Math.sign(yo.x) * (A + 0.9), z: zPuerta }, { x: Math.sign(yo.x) * (A - 1), z: zPuerta });
    } else if (yo.z > 0.5) {
      camino.push({ x: 0, z: 0.5 });
    }
    if (!mismaOficina && !enLaPuerta) camino.push({ x: l.lado * (A - 1), z: l.zc }, { x: xIn + l.lado * 0.9, z: l.zc });
    camino.push({ x: l.frente.x, z: l.frente.z });
    const fin = camino.pop()!;
    destino = { x: fin.x, z: fin.z, giro, cabeceo: -0.08, alLlegar: mirar ? () => ev.tocar(id) : undefined };
  };

  const libre = (x: number, z: number) => !choques.some((c) => x > c.x1 - 0.3 && x < c.x2 + 0.3 && z > c.z1 - 0.3 && z < c.z2 + 0.3);

  // Doble clic / doble toque en el piso: caminás hasta ahí (como en Google Maps), pasando por las puertas.
  const anillo = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.4, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  anillo.rotation.x = -Math.PI / 2;
  anillo.position.y = 0.02;
  escena.add(anillo);
  let marcaT = -1;
  const oficinaDe = (x: number, z: number) => (Math.abs(x) > A && z < 0 && z > fondo ? { lado: Math.sign(x), zc: -(Math.floor(-z / LARGO) * LARGO + LARGO / 2) } : null);
  const caminarA = (x: number, z: number) => {
    // Dentro de los límites del piso y no metido en un mueble: si cae en uno, se queda un poco antes.
    x = Math.max(-(A + PROF) + 0.5, Math.min(A + PROF - 0.5, x));
    z = Math.max(fondo + 0.5, Math.min(15.5, z));
    for (let i = 0; i < 12 && !libre(x, z); i++) {
      x += (yo.x - x) * 0.15;
      z += (yo.z - z) * 0.15;
    }
    if (!libre(x, z)) return;
    const desde = oficinaDe(yo.x, yo.z);
    const hacia = oficinaDe(x, z);
    camino = [];
    const misma = desde && hacia && desde.lado === hacia.lado && desde.zc === hacia.zc;
    if (!misma) {
      if (desde) camino.push({ x: desde.lado * (A + 0.9), z: desde.zc }, { x: desde.lado * (A - 1), z: desde.zc });
      if (hacia) {
        if (yo.z > 0.5 && !desde) camino.push({ x: 0, z: 0.5 });
        camino.push({ x: hacia.lado * (A - 1), z: hacia.zc }, { x: hacia.lado * (A + 0.9), z: hacia.zc });
      } else if (z > 0.5 && desde) camino.push({ x: 0, z: 0.5 });
    }
    const dx = x - (camino[camino.length - 1]?.x ?? yo.x);
    const dz = z - (camino[camino.length - 1]?.z ?? yo.z);
    destino = { x, z, giro: Math.hypot(dx, dz) > 0.2 ? Math.atan2(-dx, -dz) : yo.giro, cabeceo: -0.04 };
    anillo.position.x = x;
    anillo.position.z = z;
    marcaT = 0;
  };
  const sueloPlano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const puntoSuelo = new THREE.Vector3();
  let ultimoToque = { t: 0, x: 0, y: 0 };

  // Mouse/toque: arrastrar para mirar; tocar a alguien para ir a hablarle.
  const ray = new THREE.Raycaster();
  let arrastre: { x: number; y: number; giro: number; cab: number; movio: boolean } | null = null;
  const abajo = (e: PointerEvent) => {
    arrastre = { x: e.clientX, y: e.clientY, giro: yo.giro, cab: yo.cabeceo, movio: false };
  };
  const mueve = (e: PointerEvent) => {
    if (!arrastre) return;
    const dx = e.clientX - arrastre.x;
    const dy = e.clientY - arrastre.y;
    if (Math.hypot(dx, dy) > 5) arrastre.movio = true;
    if (arrastre.movio) {
      destino = null;
      camino = [];
      yo.giro = arrastre.giro - dx * 0.0045;
      yo.cabeceo = Math.max(-0.6, Math.min(0.4, arrastre.cab - dy * 0.003));
    }
  };
  const arriba = (e: PointerEvent) => {
    const fue = arrastre;
    arrastre = null;
    if (fue?.movio) return;
    const r = render.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camara);
    const hit = ray.intersectObjects(clicables.map((c) => c.obj), false)[0];
    const id = hit && clicables.find((c) => c.obj === hit.object)?.id;
    if (id) return irA(id, true, true);
    const ahora = performance.now();
    const doble = ahora - ultimoToque.t < 380 && Math.hypot(e.clientX - ultimoToque.x, e.clientY - ultimoToque.y) < 40;
    ultimoToque = doble ? { t: 0, x: 0, y: 0 } : { t: ahora, x: e.clientX, y: e.clientY };
    if (doble && ray.ray.direction.y < -0.02 && ray.ray.intersectPlane(sueloPlano, puntoSuelo) && puntoSuelo.distanceTo(camara.position) < 45) {
      caminarA(puntoSuelo.x, puntoSuelo.z);
      sonar("destino");
    }
  };
  render.domElement.addEventListener("pointerdown", abajo);
  window.addEventListener("pointermove", mueve);
  window.addEventListener("pointerup", arriba);

  const alBoca = (e: Event) => {
    const d = (e as CustomEvent<{ agente: string; nivel: number }>).detail;
    const p = personas.find((x) => x.id === d.agente);
    if (p) p.habla = d.nivel;
  };
  window.addEventListener("acopio-boca", alBoca);

  const alCambiarTam = () => {
    render.setSize(cont.clientWidth, cont.clientHeight);
    camara.aspect = cont.clientWidth / cont.clientHeight;
    camara.updateProjectionMatrix();
  };
  window.addEventListener("resize", alCambiarTam);

  // ---------- cada cuadro ----------
  const reloj = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const qGiro = new THREE.Quaternion();
  const eje = new THREE.Vector3();
  let cercaAntes: string | null = null;
  let recorrido = 0;
  let cuadro = 0;
  render.setAnimationLoop(() => {
    // Con una charla abierta la escena va a 30 cuadros por segundo: le deja aire al audio en vivo.
    if (enfocado && ++cuadro % 2) return;
    const dt = Math.min(reloj.getDelta(), 0.05);
    const t = reloj.elapsedTime;

    // Movimiento: con inercia, o yendo solo a una oficina.
    const k = teclas;
    const correr = k.has("Shift");
    const vel = correr ? 8 : 4.2;
    let av = 0;
    let lat = 0;
    if (k.has("ArrowUp") || k.has("w")) av += 1;
    if (k.has("ArrowDown") || k.has("s")) av -= 1;
    if (k.has("q")) lat -= 1;
    if (k.has("e")) lat += 1;
    if (k.has("ArrowLeft") || k.has("a")) yo.giro += 1.9 * dt;
    if (k.has("ArrowRight") || k.has("d")) yo.giro -= 1.9 * dt;
    if (av || lat) {
      destino = null;
      camino = [];
    }
    let objX = (-Math.sin(yo.giro) * av + Math.cos(yo.giro) * lat) * vel;
    let objZ = (-Math.cos(yo.giro) * av - Math.sin(yo.giro) * lat) * vel;
    if (destino) {
      const meta = camino[0] ?? destino;
      if (camino.length && Math.hypot(meta.x - yo.x, meta.z - yo.z) < 0.6) camino.shift();
      const dx = (camino[0] ?? destino).x - yo.x;
      const dz = (camino[0] ?? destino).z - yo.z;
      const dist = Math.hypot(dx, dz);
      // Gira suave hacia donde va y, al llegar, hacia la persona.
      const rumbo = dist > 1 || camino.length ? Math.atan2(-dx, -dz) : destino.giro;
      let dg = rumbo - yo.giro;
      dg = Math.atan2(Math.sin(dg), Math.cos(dg));
      yo.giro += dg * Math.min(1, dt * 4);
      yo.cabeceo += (destino.cabeceo - yo.cabeceo) * Math.min(1, dt * 3);
      if (dist > 0.08 || camino.length) {
        const v = camino.length ? vel * 1.4 : Math.min(vel * 1.6, dist * 2.2);
        objX = (dx / dist) * v;
        objZ = (dz / dist) * v;
      } else if (Math.abs(dg) < 0.05) {
        const cb = destino.alLlegar;
        destino = null;
        cb?.();
      }
    }
    // La anillo del destino aparece y se desvanece.
    if (marcaT >= 0) {
      marcaT += dt;
      const m = anillo.material as THREE.MeshBasicMaterial;
      m.opacity = Math.max(0, 0.85 - marcaT * 0.6);
      anillo.scale.setScalar(1 + marcaT * 0.6);
      if (marcaT > 1.5) marcaT = -1;
    }
    yo.vx += (objX - yo.vx) * Math.min(1, dt * 8);
    yo.vz += (objZ - yo.vz) * Math.min(1, dt * 8);
    const nx = yo.x + yo.vx * dt;
    const nz = yo.z + yo.vz * dt;
    if (libre(nx, yo.z) || destino) yo.x = nx;
    if (libre(yo.x, nz) || destino) yo.z = nz;
    const paso = Math.hypot(yo.vx, yo.vz);
    // Pasos: uno cada ~0,9 m recorridos (más seguido si corre).
    recorrido += paso * dt;
    if (recorrido > (paso > 6 ? 1.15 : 0.9)) {
      recorrido = 0;
      if (paso > 1.2) sonar("paso");
    }
    if (fov.kick > 0.05 || Math.abs(camara.fov - fov.base) > 0.05) {
      fov.kick *= Math.pow(0.02, dt);
      camara.fov = fov.base + fov.kick;
      camara.updateProjectionMatrix();
    }
    camara.position.set(yo.x, 1.65 + Math.sin(t * 9) * 0.012 * Math.min(1, paso / 4), yo.z);
    camara.rotation.set(yo.cabeceo, yo.giro, 0, "YXZ");

    // Personas: respiran, tipean, miran a quien se acerca y hablan.
    for (const p of personas) {
      for (const [b, q0] of p.base) b.quaternion.copy(q0);
      const resp = Math.sin(t * 1.4 + p.fase);
      if (p.columna) p.columna.rotateX(resp * 0.012);
      const enfocadoAca = enfocado === p.id;
      const habla = p.habla > 0.02;
      if (!enfocadoAca && !habla && p.estado !== "descanso") {
        for (const [n, b] of p.manos.entries()) b.rotateX(Math.sin(t * 14 + n * 1.7 + p.fase) * 0.06 * (Math.sin(t * 0.7 + p.fase) > -0.3 ? 1 : 0));
      }
      // Mirar al visitante si está cerca y adelante.
      p.raiz.getWorldPosition(tmp);
      const dx = camara.position.x - tmp.x;
      const dz = camara.position.z - tmp.z;
      const dist = Math.hypot(dx, dz);
      const frente = p.raiz.getWorldDirection(new THREE.Vector3());
      let ang = Math.atan2(dx, dz) - Math.atan2(frente.x, frente.z);
      ang = Math.atan2(Math.sin(ang), Math.cos(ang));
      const quiere = dist < 7.5 && Math.abs(ang) < 1.6 ? Math.max(-0.9, Math.min(0.9, ang)) : Math.sin(t * 0.3 + p.fase) * 0.15;
      p.giro += (quiere - p.giro) * Math.min(1, dt * 3);
      if (p.cuello) {
        eje.set(0, 1, 0);
        const qp = p.cuello.parent!.getWorldQuaternion(new THREE.Quaternion()).invert();
        eje.applyQuaternion(qp);
        qGiro.setFromAxisAngle(eje, p.giro * 0.6);
        p.cuello.quaternion.premultiply(qGiro);
      }
      if (p.cabeza) {
        eje.set(0, 1, 0);
        const qp = p.cabeza.parent!.getWorldQuaternion(new THREE.Quaternion()).invert();
        eje.applyQuaternion(qp);
        qGiro.setFromAxisAngle(eje, p.giro * 0.4);
        p.cabeza.quaternion.premultiply(qGiro);
        if (habla) p.cabeza.rotateX(Math.sin(t * 7) * 0.03 * p.habla);
      }
      for (const b of p.bocas) b.m.morphTargetInfluences![b.i] = Math.min(1, p.habla * 1.4);
    }

    // ¿Quién está cerca?
    let mejor: { id: string; d: number } | null = null;
    for (const l of lugares) {
      const d = Math.hypot(l.mira.x - yo.x, l.mira.z - yo.z);
      if (d < 4.2 && (!mejor || d < mejor.d)) mejor = { id: l.id, d };
    }
    const id = mejor?.id ?? null;
    if (id !== cercaAntes) {
      if (id) sonar("cerca");
      cercaAntes = id;
      ev.cerca(id);
    }
    render.render(escena, camara);
  });
  ev.listo();

  return {
    teclas,
    irA,
    enfocar: (id) => {
      enfocado = id;
    },
    destruir: () => {
      render.setAnimationLoop(null);
      render.domElement.removeEventListener("pointerdown", abajo);
      window.removeEventListener("pointermove", mueve);
      window.removeEventListener("pointerup", arriba);
      window.removeEventListener("resize", alCambiarTam);
      window.removeEventListener("acopio-boca", alBoca);
      escena.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
      });
      pmrem.dispose();
      render.dispose();
      render.domElement.remove();
    },
  };
}
