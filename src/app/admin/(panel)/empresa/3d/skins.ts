// «Skins»: cada persona del equipo se ve distinta aunque partan de dos modelos (hombre y mujer).
// Tono de piel, barba, gorra, color de ropa y zapatos en los hombres; y accesorios para todos:
// anteojos, pañuelo, vincha, aros, credencial. Se arma al cargar la escena; nada se descarga.
import * as THREE from "three";

export type Skin = {
  /** Multiplica la textura de piel (hombres): 1 = como viene; <1 más oscuro; tinte cálido/frío. */
  piel?: [number, number, number];
  barba?: boolean;
  gorra?: boolean;
  /** Colores de pantalón y zapatos (hombres). */
  pantalon?: number;
  zapatos?: number;
  /** Tinte muy leve de todo el modelo (mujeres, que son una sola pieza): apenas cambia el vestido. */
  tinte?: [number, number, number];
  anteojos?: number; // color del marco
  panuelo?: number; // pañuelo o bufanda al cuello
  vincha?: number;
  aros?: number;
  credencial?: boolean;
  sombrero?: number;
};

export const SKINS: Record<string, Skin> = {
  // Dirección
  gerente: { credencial: true, aros: 0xd4af37, tinte: [1, 0.98, 0.97] },
  corporativo: { panuelo: 0x1e3a8a, aros: 0xc0c0c0, tinte: [0.97, 0.97, 1] },
  sociedades: { piel: [0.78, 0.6, 0.48], barba: true, pantalon: 0x2b2b2b, zapatos: 0x5a3a1e },
  estratega: { piel: [1, 0.95, 0.9], barba: false, anteojos: 0x222222, pantalon: 0x1f2a44, zapatos: 0xffffff },
  // Comercial
  web: { piel: [0.95, 0.9, 0.86], barba: false, anteojos: 0x3b5bdb, pantalon: 0x3a3a3a, zapatos: 0x222222 },
  ventas: { piel: [0.85, 0.7, 0.58], barba: true, gorra: true, pantalon: 0x2f4f8f, zapatos: 0xffffff },
  hunter: { vincha: 0xe11d48, tinte: [1, 0.97, 0.95] },
  fidelizacion: { aros: 0xf472b6, panuelo: 0xf9a8d4, tinte: [1, 0.98, 1] },
  mercadolibre: { piel: [0.92, 0.84, 0.78], barba: false, pantalon: 0x4b5563, zapatos: 0x111111, anteojos: 0x555555 },
  anuncios: { anteojos: 0x111111, tinte: [0.98, 0.98, 1] },
  // Marketing
  seo: { piel: [0.7, 0.52, 0.4], barba: true, pantalon: 0x374151, zapatos: 0x7c2d12 },
  alianzas: { sombrero: 0xd6b26a, aros: 0xfbbf24, tinte: [1, 0.98, 0.96] },
  marketing: { vincha: 0x7c3aed, tinte: [0.99, 0.97, 1] },
  disenador: { piel: [1, 0.93, 0.88], barba: true, anteojos: 0xd97706, pantalon: 0x1c1917, zapatos: 0xfacc15 },
  community: { piel: [0.88, 0.76, 0.66], barba: false, gorra: true, pantalon: 0x0f172a, zapatos: 0xef4444 },
  reels: { piel: [0.96, 0.9, 0.84], barba: true, gorra: true, pantalon: 0x44403c, zapatos: 0x1f2937 },
  // Operaciones y administración
  compras: { piel: [0.74, 0.56, 0.44], barba: false, pantalon: 0x57534e, zapatos: 0x3f2a14 },
  logistica: { piel: [0.9, 0.78, 0.68], barba: true, pantalon: 0x1e3a8a, zapatos: 0x111827 },
  finanzas: { anteojos: 0x6b21a8, credencial: true, tinte: [0.98, 1, 0.98] },
  financiamiento: { piel: [0.93, 0.86, 0.8], barba: false, anteojos: 0x7c2d12, pantalon: 0x3b2f2f, zapatos: 0x5a3a1e, credencial: true },
  mayorista: { piel: [0.8, 0.64, 0.52], barba: true, gorra: true, pantalon: 0x1e3a8a, zapatos: 0x374151 },
  marketplaces: { vincha: 0xf97316, aros: 0xfb7185, tinte: [1, 0.98, 0.96] },
  seguridad: { piel: [0.82, 0.7, 0.6], barba: true, anteojos: 0x111827, pantalon: 0x111827, zapatos: 0x111827, credencial: true },
};

const GORRAS = new Set(Object.entries(SKINS).filter(([, s]) => s.gorra).map(([id]) => id));

/** Aplica tonos y partes visibles del modelo (antes de agregar accesorios). */
export function pintar(raiz: THREE.Object3D, id: string, esMujer: boolean) {
  const s = SKINS[id] ?? {};
  raiz.traverse((z) => {
    const m = z as THREE.Mesh;
    if (z.name === "Wolf3D_Headwear" || z.name === "Mesh") z.visible = GORRAS.has(id) && !esMujer;
    if (!m.isMesh) return;
    const propio = () => {
      if (!(m.material as THREE.Material & { __propio?: boolean }).__propio) {
        m.material = (m.material as THREE.MeshStandardMaterial).clone();
        (m.material as THREE.Material & { __propio?: boolean }).__propio = true;
      }
      return m.material as THREE.MeshStandardMaterial;
    };
    if (/Beard/.test(m.name)) m.visible = Boolean(s.barba);
    if (!esMujer) {
      if ((/Wolf3D_Head$|Wolf3D_Body/.test(m.name) || /Skin|Body/.test((m.material as THREE.Material).name)) && s.piel) propio().color.setRGB(...s.piel);
      if (/Outfit_Bottom/.test(m.name) && s.pantalon !== undefined) propio().color.set(s.pantalon);
      if (/Footwear/.test(m.name) && s.zapatos !== undefined) propio().color.set(s.zapatos);
    } else if (s.tinte) propio().color.setRGB(...s.tinte);
  });
}

/**
 * Accesorios en el cuerpo (van colgados de los huesos, así siguen la cabeza cuando mira).
 * `escala` es la escala mundial del modelo: las medidas de abajo están en metros.
 */
export function accesorios(raiz: THREE.Object3D, id: string, h: { Head?: THREE.Object3D; HeadTop_End?: THREE.Object3D; Neck?: THREE.Object3D; Spine2?: THREE.Object3D; Spine1?: THREE.Object3D }, escala: number) {
  const s = SKINS[id] ?? {};
  const cabeza = h.Head;
  if (!cabeza) return;
  raiz.updateMatrixWorld(true);
  const hw = cabeza.getWorldPosition(new THREE.Vector3());
  const tw = (h.HeadTop_End ?? cabeza).getWorldPosition(new THREE.Vector3());
  const arriba = tw.clone().sub(hw);
  if (arriba.length() < 1e-6) arriba.set(0, 0.2, 0);
  const altoCabeza = Math.max(0.16, arriba.length());
  arriba.normalize();
  const adelante = raiz.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
  const lado = new THREE.Vector3().crossVectors(arriba, adelante).normalize();
  void escala;
  const enHueso = (hueso: THREE.Object3D, mundo: THREE.Vector3, obj: THREE.Object3D) => {
    hueso.add(obj);
    obj.position.copy(hueso.worldToLocal(mundo.clone()));
    // Orientación: que el «adelante» del objeto apunte hacia adelante de la persona.
    const q = hueso.getWorldQuaternion(new THREE.Quaternion()).invert();
    obj.quaternion.copy(q.multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), adelante)));
    // Metros → unidades locales del hueso (en Mixamo los huesos vienen en centímetros).
    const ws = hueso.getWorldScale(new THREE.Vector3());
    obj.scale.setScalar(1 / Math.max(1e-6, (ws.x + ws.y + ws.z) / 3));
  };
  const mat = (color: number, metal = 0.6, rough = 0.35) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });

  if (s.anteojos !== undefined) {
    const g = new THREE.Group();
    const m = mat(s.anteojos, 0.7, 0.3);
    const lente = new THREE.MeshStandardMaterial({ color: 0x9fb3c8, transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.2, depthWrite: false });
    for (const sx of [-1, 1]) {
      const aro = new THREE.Mesh(new THREE.TorusGeometry(0.0165, 0.0017, 10, 32), m);
      aro.position.set(sx * 0.0255, 0, 0);
      g.add(aro);
      const vidrio = new THREE.Mesh(new THREE.CircleGeometry(0.0158, 24), lente);
      vidrio.position.set(sx * 0.0255, 0, -0.0005);
      g.add(vidrio);
      const patilla = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.003, 0.1), m);
      patilla.position.set(sx * 0.044, 0.003, -0.048);
      g.add(patilla);
    }
    const puente = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.0025, 0.0025), m);
    g.add(puente);
    // Ojos: a ~45% de la cabeza hacia arriba y ~9,5 cm hacia adelante.
    const pos = hw.clone().addScaledVector(arriba, altoCabeza * 0.52).addScaledVector(adelante, 0.085);
    enHueso(cabeza, pos, g);
  }
  if (s.vincha !== undefined) {
    const v = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.009, 12, 48, Math.PI * 1.25), mat(s.vincha, 0.1, 0.7));
    v.rotation.x = Math.PI / 2;
    v.rotation.z = Math.PI * 0.875;
    const pos = hw.clone().addScaledVector(arriba, altoCabeza * 0.8).addScaledVector(adelante, 0.01);
    enHueso(cabeza, pos, v);
  }
  if (s.sombrero !== undefined) {
    const g = new THREE.Group();
    const m = mat(s.sombrero, 0.05, 0.9);
    const ala = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.008, 40), m);
    const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.105, 0.1, 40), m);
    copa.position.y = 0.05;
    const cinta = new THREE.Mesh(new THREE.CylinderGeometry(0.107, 0.107, 0.025, 40), mat(0x3b2a1a, 0.1, 0.8));
    cinta.position.y = 0.02;
    g.add(ala, copa, cinta);
    g.rotation.x = -0.08;
    const pos = hw.clone().addScaledVector(arriba, altoCabeza * 0.98);
    enHueso(cabeza, pos, g);
  }
  if (s.aros !== undefined) {
    for (const sx of [-1, 1]) {
      const aro = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0018, 8, 24), mat(s.aros, 0.9, 0.25));
      const pos = hw.clone().addScaledVector(arriba, altoCabeza * 0.3).addScaledVector(lado, sx * 0.078).addScaledVector(adelante, 0.01);
      enHueso(cabeza, pos, aro);
      aro.rotation.y = Math.PI / 2;
    }
  }
  const cuello = h.Neck ?? cabeza;
  if (s.panuelo !== undefined) {
    const p = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.03, 12, 40), mat(s.panuelo, 0.05, 0.85));
    p.rotation.x = Math.PI / 2;
    p.scale.set(1, 1, 0.55);
    // Un poco por debajo de la base de la cabeza: a la altura del cuello, no de las orejas.
    const nw = hw.clone().addScaledVector(arriba, -0.15).addScaledVector(adelante, 0.02);
    enHueso(cuello, nw, p);
  }
  const pecho = h.Spine2 ?? h.Spine1;
  if (s.credencial && pecho) {
    const g = new THREE.Group();
    const cinta = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.002), mat(0x0f6b4f, 0.05, 0.9));
    cinta.position.y = 0.09;
    const tarjeta = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.085, 0.003), mat(0xffffff, 0.05, 0.6));
    const foto = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.001), mat(0x0f6b4f, 0.05, 0.9));
    foto.position.set(0, 0.015, 0.002);
    g.add(cinta, tarjeta, foto);
    const pw = pecho.getWorldPosition(new THREE.Vector3()).addScaledVector(adelante, 0.13).addScaledVector(arriba, -0.02);
    enHueso(pecho, pw, g);
  }
}
