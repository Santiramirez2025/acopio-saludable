// Ambientación de cada oficina según lo que hace esa persona: un objeto protagonista de su trabajo,
// un cuadro, una lámpara colgante sobre el escritorio, lámpara de pie y detalles (libros, cuadros, alfombra).
// Todo con geometría simple (rápido en TV) y texturas dibujadas en canvas.
import * as THREE from "three";

export type Lugar = {
  escena: THREE.Scene;
  id: string;
  emoji: string;
  persona: string;
  lado: -1 | 1;
  zc: number;
  z1: number;
  z2: number;
  xIn: number;
  xOut: number;
  xEsc: number;
  xPer: number;
  color: THREE.Color;
  bloquea: (x1: number, x2: number, z1: number, z2: number) => void;
  lienzo: (ancho: number, alto: number, dibujar: (g: CanvasRenderingContext2D) => void) => THREE.Texture;
};

const LEMAS: Record<string, string> = {
  gerente: "Que todo funcione",
  estratega: "Crecer cada semana",
  corporativo: "Grandes cuentas",
  sociedades: "Socios que suman",
  ventas: "Ninguna charla sin cerrar",
  hunter: "Clientes nuevos, todos los días",
  fidelizacion: "Que vuelvan y nos recomienden",
  mercadolibre: "Tienda siempre arriba",
  web: "Un sitio que vende solo",
  anuncios: "Cada peso rinde",
  marketing: "Contenido que vende",
  disenador: "Que frene el dedo",
  community: "Que nos conozcan",
  reels: "Luz, cámara, acción",
  seo: "Primeros en Google",
  alianzas: "Juntos llegamos más lejos",
  compras: "Comprar mejor, siempre",
  logistica: "Cada pedido a tiempo",
  finanzas: "Números claros",
};

const mat = (color: number, rough = 0.6, metal = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });

export function decorarOficina(l: Lugar) {
  const g = new THREE.Group();
  l.escena.add(g);
  const S = l.lado;
  const add = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, sombra = true): T => {
    o.position.set(x, y, z);
    o.traverse((m) => {
      if ((m as THREE.Mesh).isMesh) {
        m.castShadow = sombra;
        m.receiveShadow = true;
      }
    });
    g.add(o);
    return o;
  };
  const caja = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, sombra = true) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), x, y, z, sombra);
  const cil = (rt: number, rb: number, h: number, m: THREE.Material, x: number, y: number, z: number, seg = 24) => add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m), x, y, z);
  const hex = `#${l.color.getHexString()}`;
  const suave = l.color.clone().lerp(new THREE.Color(0xffffff), 0.55);

  // ---- Lámpara colgante sobre el escritorio (luz cálida que da vida) ----
  const pantalla = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.28, 32, 1, true), mat(0x1f2937, 0.5, 0.3, { side: THREE.DoubleSide }));
  add(pantalla, l.xEsc, 2.55, l.zc, false);
  const foco = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c9 }));
  add(foco, l.xEsc, 2.45, l.zc, false);
  cil(0.006, 0.006, 0.7, mat(0x111111), l.xEsc, 3.05, l.zc);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.18, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2;
  add(halo, l.xEsc, 0.79, l.zc, false);

  // ---- Pared lateral (z1) con color del área, zócalo y un cuadro ----
  const acento = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 3.3), mat(suave.getHex(), 0.95));
  add(acento, S * (Math.abs(l.xIn) + 4.5), 1.65, l.z1 + 0.07, false);
  caja(8.6, 0.12, 0.03, mat(0xffffff, 0.6), S * (Math.abs(l.xIn) + 4.5), 0.06, l.z1 + 0.085, false);
  const cuadro = l.lienzo(800, 1000, (c) => {
    const gr = c.createLinearGradient(0, 0, 800, 1000);
    gr.addColorStop(0, hex);
    gr.addColorStop(1, "#0b2a20");
    c.fillStyle = gr;
    c.fillRect(0, 0, 800, 1000);
    c.globalAlpha = 0.12;
    c.fillStyle = "#ffffff";
    for (let k = 0; k < 7; k++) {
      c.beginPath();
      c.arc(120 + k * 110, 220 + (k % 3) * 90, 60 + k * 9, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    c.font = `260px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    c.textAlign = "center";
    c.fillText(l.emoji, 400, 560);
    c.font = `800 64px Inter, system-ui, sans-serif`;
    c.fillStyle = "#ffffff";
    const lema = LEMAS[l.id] ?? "";
    const palabras = lema.split(" ");
    const mitad = Math.ceil(palabras.length / 2);
    c.fillText(palabras.slice(0, mitad).join(" "), 400, 760);
    c.fillText(palabras.slice(mitad).join(" "), 400, 840);
    c.font = `600 34px Inter, system-ui, sans-serif`;
    c.fillStyle = "rgba(255,255,255,0.7)";
    c.fillText("ACOPIO SALUDABLE", 400, 940);
  });
  const marco = caja(1.32, 1.62, 0.05, mat(0x111111, 0.4, 0.4), S * (Math.abs(l.xIn) + 3.2), 1.75, l.z1 + 0.11, false);
  void marco;
  const lam = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), new THREE.MeshStandardMaterial({ map: cuadro, roughness: 0.5 }));
  add(lam, S * (Math.abs(l.xIn) + 3.2), 1.75, l.z1 + 0.14, false);
  // dos cuadritos chicos
  for (const [k, dz] of [[0, 0], [1, 0]] as const) {
    caja(0.5, 0.38, 0.03, mat(k ? 0xb98a5a : 0xe7e5e4, 0.5), S * (Math.abs(l.xIn) + 4.6 + k * 0.62), 1.95 - k * 0.12, l.z1 + 0.1 + dz, false);
  }

  // ---- Lámpara de pie en el rincón de la ventana ----
  const xLam = S * (Math.abs(l.xOut) - 0.6);
  const zLam = l.z1 + 1.6;
  cil(0.16, 0.18, 0.04, mat(0x222222, 0.4, 0.6), xLam, 0.02, zLam);
  cil(0.015, 0.015, 1.55, mat(0x222222, 0.4, 0.6), xLam, 0.8, zLam);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.32, 24, 1, true), mat(0xf5efe3, 0.9, 0, { side: THREE.DoubleSide, emissive: 0xffe8b0, emissiveIntensity: 0.45 })), xLam, 1.68, zLam, false);
  l.bloquea(xLam - 0.25, xLam + 0.25, zLam - 0.25, zLam + 0.25);

  // ---- Libros sobre el estante de la pared del fondo ----
  const colores = [0x0b5540, 0xd9a441, 0x8a6bd1, 0x3b8fd1, 0xc0504d, 0x2f9e6a];
  for (let k = 0; k < 6; k++) caja(0.22, 0.26 + (k % 3) * 0.03, 0.05, mat(colores[(k + Math.abs(Math.round(l.zc))) % 6], 0.7), S * (Math.abs(l.xOut) - 0.25), 1.97, l.z2 - 1.95 + k * 0.06, false);

  // ---- El objeto de su trabajo, en el rincón junto a la puerta ----
  const px = S * (Math.abs(l.xIn) + 1.3);
  const pz = l.z1 + 0.95;
  const tema = l.id;
  const madera = mat(0xb98a5a, 0.55);
  const carton = mat(0xc49a6c, 0.9);
  const negro = mat(0x15171a, 0.5, 0.2);
  const pantallaMat = (dibujo: (c: CanvasRenderingContext2D) => void) => new THREE.MeshBasicMaterial({ map: l.lienzo(640, 360, dibujo), toneMapped: false });
  const graficoSubida = (c: CanvasRenderingContext2D) => {
    c.fillStyle = "#0f172a";
    c.fillRect(0, 0, 640, 360);
    c.strokeStyle = "#22c55e";
    c.lineWidth = 8;
    c.beginPath();
    [40, 70, 60, 120, 110, 170, 200, 190, 260, 300].forEach((v, k) => (k ? c.lineTo(40 + k * 62, 330 - v) : c.moveTo(40, 330 - v)));
    c.stroke();
    c.fillStyle = "#fbbf24";
    c.font = "700 34px Inter, sans-serif";
    c.fillText(l.persona, 30, 50);
  };
  const tele = (dibujo: (c: CanvasRenderingContext2D) => void) => {
    // TV/pantalla grande en la pared lateral z2, mirando hacia adentro
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), pantallaMat(dibujo));
    m.rotation.y = Math.PI;
    add(m, S * (Math.abs(l.xIn) + 2.2), 1.75, l.z2 - 0.1, false);
    caja(1.7, 1.0, 0.05, negro, S * (Math.abs(l.xIn) + 2.2), 1.75, l.z2 - 0.06, false);
  };

  if (tema === "logistica" || tema === "compras" || tema === "mercadolibre") {
    // Pila de cajas / bolsas de frutos secos
    const amarillo = mat(0xffe600, 0.6);
    const m = tema === "mercadolibre" ? amarillo : carton;
    caja(0.6, 0.45, 0.5, m, px, 0.225, pz);
    caja(0.5, 0.4, 0.45, m, px + S * 0.05, 0.65, pz + 0.02);
    caja(0.55, 0.35, 0.5, m, px + S * 0.62, 0.175, pz + 0.05);
    if (tema === "compras") {
      for (let k = 0; k < 3; k++) {
        const bolsa = cil(0.2, 0.24, 0.55, mat([0x8b5e34, 0xa87a4c, 0x6b4423][k], 0.95), px + S * (1.25 + k * 0.45), 0.275, pz + 0.1);
        bolsa.scale.z = 0.8;
      }
      // balanza
      caja(0.35, 0.06, 0.3, mat(0xe5e7eb, 0.3, 0.6), px + S * 0.62, 0.38, pz + 0.05);
      cil(0.12, 0.12, 0.02, mat(0xd1d5db, 0.2, 0.8), px + S * 0.62, 0.42, pz + 0.05);
    }
    if (tema === "logistica") {
      // carrito de carga
      caja(0.05, 1.1, 0.05, mat(0xc0504d, 0.4, 0.5), px + S * 1.3, 0.55, pz - 0.15);
      caja(0.05, 1.1, 0.05, mat(0xc0504d, 0.4, 0.5), px + S * 1.3, 0.55, pz + 0.25);
      caja(0.4, 0.04, 0.5, mat(0x374151, 0.4, 0.6), px + S * 1.45, 0.04, pz + 0.05);
      tele((c) => {
        c.fillStyle = "#e5e7eb";
        c.fillRect(0, 0, 640, 360);
        c.strokeStyle = "#2f9e6a";
        c.lineWidth = 10;
        c.beginPath();
        c.moveTo(60, 300);
        c.bezierCurveTo(200, 100, 380, 320, 580, 70);
        c.stroke();
        c.fillStyle = "#c0504d";
        for (const [x, y] of [[60, 300], [300, 210], [580, 70]]) {
          c.beginPath();
          c.arc(x, y, 18, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = "#111";
        c.font = "700 32px Inter, sans-serif";
        c.fillText("Ruta de hoy", 30, 45);
      });
    }
    if (tema === "mercadolibre") tele(graficoSubida);
    l.bloquea(px - 0.4, px + S * 1.6, pz - 0.35, pz + 0.4);
  } else if (tema === "marketing" || tema === "community" || tema === "reels" || tema === "alianzas") {
    // Aro de luz con trípode y cámara
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 12, 48), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9 }));
    aro.rotation.y = S * Math.PI / 2;
    add(aro, px, 1.55, pz, false);
    for (let k = 0; k < 3; k++) {
      const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4), negro);
      pata.rotation.z = Math.cos((k * 2 * Math.PI) / 3) * 0.25;
      pata.rotation.x = Math.sin((k * 2 * Math.PI) / 3) * 0.25;
      add(pata, px, 0.68, pz);
    }
    caja(0.14, 0.09, 0.08, negro, px, 1.55, pz);
    if (tema === "reels") {
      // claqueta
      caja(0.3, 0.22, 0.02, negro, px + S * 0.9, 0.9, pz);
    }
    // Pared de fotos / tablero de inspiración
    tele((c) => {
      c.fillStyle = "#fdf6ec";
      c.fillRect(0, 0, 640, 360);
      const cols = ["#d9a441", "#2f9e6a", "#8a6bd1", "#c0504d", "#3b8fd1", "#0b5540"];
      for (let k = 0; k < 8; k++) {
        c.fillStyle = cols[k % 6];
        c.save();
        c.translate(60 + (k % 4) * 150, 70 + Math.floor(k / 4) * 160);
        c.rotate(((k % 3) - 1) * 0.08);
        c.fillRect(0, 0, 120, 120);
        c.restore();
      }
    });
    l.bloquea(px - 0.4, px + 0.4, pz - 0.4, pz + 0.4);
  } else if (tema === "disenador") {
    // Atril con lienzo y paleta
    const lz = l.lienzo(400, 500, (c) => {
      c.fillStyle = "#fffdf8";
      c.fillRect(0, 0, 400, 500);
      const cols = ["#d9a441", "#2f9e6a", "#c0504d", "#8a6bd1"];
      for (let k = 0; k < 12; k++) {
        c.fillStyle = cols[k % 4];
        c.globalAlpha = 0.7;
        c.beginPath();
        c.arc(60 + Math.random() * 280, 60 + Math.random() * 380, 20 + Math.random() * 60, 0, Math.PI * 2);
        c.fill();
      }
    });
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshStandardMaterial({ map: lz }));
    tela.rotation.y = -S * Math.PI / 2;
    tela.rotation.z = 0;
    add(tela, px, 1.25, pz, false);
    for (const dz of [-0.3, 0.3]) caja(0.04, 1.6, 0.04, madera, px - S * 0.03, 0.8, pz + dz);
    caja(0.04, 0.04, 0.8, madera, px - S * 0.03, 0.78, pz);
    tele(graficoSubida);
    l.bloquea(px - 0.35, px + 0.35, pz - 0.45, pz + 0.45);
  } else if (tema === "finanzas") {
    // Archivero y caja fuerte
    caja(0.5, 1.3, 0.6, mat(0x6b7280, 0.35, 0.6), px, 0.65, pz);
    for (let k = 0; k < 3; k++) caja(0.02, 0.03, 0.18, mat(0xd1d5db, 0.2, 0.8), px + S * 0.26, 0.3 + k * 0.42, pz);
    caja(0.55, 0.55, 0.55, mat(0x1f2937, 0.3, 0.7), px + S * 0.75, 0.275, pz);
    cil(0.08, 0.08, 0.03, mat(0xd9a441, 0.2, 0.9), px + S * 1.03, 0.32, pz);
    tele(graficoSubida);
    l.bloquea(px - 0.35, px + S * 1.1, pz - 0.4, pz + 0.4);
  } else if (tema === "web" || tema === "seo" || tema === "anuncios") {
    // Rack con luces y pantalla de métricas
    caja(0.6, 1.6, 0.6, mat(0x111827, 0.4, 0.5), px, 0.8, pz);
    for (let k = 0; k < 8; k++) {
      const luz = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.4), new THREE.MeshBasicMaterial({ color: k % 3 ? 0x22c55e : 0x38bdf8 }));
      add(luz, px + S * 0.31, 0.2 + k * 0.18, pz, false);
    }
    if (tema === "anuncios") {
      const mega = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 24, 1, true), mat(0xc0504d, 0.5, 0, { side: THREE.DoubleSide }));
      mega.rotation.z = S * Math.PI / 2;
      add(mega, px, 1.75, pz);
    }
    tele(graficoSubida);
    l.bloquea(px - 0.4, px + 0.4, pz - 0.4, pz + 0.4);
  } else if (tema === "ventas" || tema === "hunter" || tema === "fidelizacion") {
    // Mapa de la zona con pines en un pizarrón con ruedas
    const mapa = l.lienzo(800, 560, (c) => {
      c.fillStyle = "#e8efe4";
      c.fillRect(0, 0, 800, 560);
      c.fillStyle = "#9cc7ec";
      c.beginPath();
      c.ellipse(420, 300, 150, 70, 0.3, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#cbd5c0";
      c.lineWidth = 6;
      for (let k = 0; k < 9; k++) {
        c.beginPath();
        c.moveTo(0, 60 * k);
        c.lineTo(800, 60 * k + 40);
        c.stroke();
      }
      c.fillStyle = "#111";
      c.font = "700 36px Inter, sans-serif";
      c.fillText(tema === "fidelizacion" ? "Clientes felices" : "Carlos Paz y Punilla", 30, 50);
      for (let k = 0; k < 18; k++) {
        c.fillStyle = tema === "fidelizacion" ? "#e11d48" : k % 3 ? "#c0504d" : "#2f9e6a";
        c.beginPath();
        c.arc(80 + ((k * 137) % 640), 100 + ((k * 89) % 420), 12, 0, Math.PI * 2);
        c.fill();
      }
    });
    const tab = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.98), new THREE.MeshStandardMaterial({ map: mapa }));
    tab.rotation.y = -S * Math.PI / 2;
    add(tab, px, 1.35, pz + 0.1, false);
    caja(0.05, 1.05, 1.48, mat(0xe5e7eb, 0.4, 0.5), px + S * 0.03, 1.35, pz + 0.1, false);
    for (const dz of [-0.6, 0.8]) caja(0.04, 0.85, 0.04, mat(0x9ca3af, 0.3, 0.6), px - S * 0.03, 0.42, pz + dz);
    // auriculares sobre el escritorio
    const vincha = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 24, Math.PI), negro);
    add(vincha, l.xEsc - S * 0.15, 0.86, l.zc + 0.35, false);
    l.bloquea(px - 0.2, px + 0.2, pz - 0.7, pz + 0.9);
  } else {
    // Dirección: sillón, mesita con café y globo terráqueo
    const cuero = mat(0x5b3a1e, 0.55);
    caja(0.8, 0.42, 0.75, cuero, px + S * 0.2, 0.21, pz + 0.1);
    caja(0.8, 0.5, 0.15, cuero, px + S * 0.2, 0.65, pz - 0.25);
    caja(0.15, 0.25, 0.75, cuero, px + S * 0.55, 0.55, pz + 0.1);
    caja(0.15, 0.25, 0.75, cuero, px - S * 0.15, 0.55, pz + 0.1);
    cil(0.3, 0.3, 0.04, madera, px + S * 1.0, 0.45, pz + 0.2);
    cil(0.03, 0.03, 0.43, mat(0x222222, 0.4, 0.6), px + S * 1.0, 0.22, pz + 0.2);
    cil(0.045, 0.04, 0.09, mat(0xffffff, 0.3), px + S * 1.0, 0.52, pz + 0.2);
    const globo = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), mat(0x3b8fd1, 0.5));
    add(globo, px + S * 1.0, 0.75, pz + 0.05);
    tele(graficoSubida);
    l.bloquea(px - 0.3, px + S * 1.35, pz - 0.4, pz + 0.55);
  }
}

/** Detalles del pasillo: maceteros entre oficinas, bancos y cuadros en el fondo. */
export function decorarPasillo(escena: THREE.Scene, A: number, fondo: number, LARGO: number, bloquea: Lugar["bloquea"]) {
  const maceta = mat(0x3f3f46, 0.6);
  const hoja = mat(0x3d7d4a, 0.8);
  for (let z = -LARGO; z > fondo + 0.5; z -= LARGO) {
    for (const s of [-1, 1]) {
      const x = s * (A - 0.35);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.45), maceta);
      m.position.set(x, 0.25, z);
      m.castShadow = true;
      escena.add(m);
      for (let k = 0; k < 6; k++) {
        const h = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.7, 6), hoja);
        h.position.set(x + Math.cos(k) * 0.08, 0.8, z + Math.sin(k) * 0.08);
        h.rotation.set(Math.cos(k * 2) * 0.35, 0, Math.sin(k * 2) * 0.35);
        escena.add(h);
      }
      bloquea(x - 0.3, x + 0.3, z - 0.3, z + 0.3);
    }
  }
}
