// Pose sentada para los personajes 3D (Mixamo y Ready Player Me): en vez de rotaciones mágicas por
// esqueleto, cada hueso se orienta para que apunte en una dirección del mundo. Así sirve para los dos.
import * as THREE from "three";

const q = new THREE.Quaternion();
const qp = new THREE.Quaternion();

/** Rota «hueso» para que el segmento hueso → hijo apunte hacia «dir» (en el mundo). */
export function apuntar(hueso: THREE.Object3D | undefined, hijo: THREE.Object3D | undefined, dir: THREE.Vector3) {
  if (!hueso || !hijo || !hueso.parent) return;
  hueso.updateWorldMatrix(true, true);
  const a = hueso.getWorldPosition(new THREE.Vector3());
  const b = hijo.getWorldPosition(new THREE.Vector3());
  const actual = b.sub(a).normalize();
  q.setFromUnitVectors(actual, dir.clone().normalize());
  hueso.getWorldQuaternion(qp);
  const nueva = q.multiply(qp);
  const padre = hueso.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  hueso.quaternion.copy(padre.multiply(nueva));
  hueso.updateWorldMatrix(false, true);
}

export type Huesos = Record<string, THREE.Bone>;

export function huesos(m: THREE.Object3D): Huesos {
  const h: Huesos = {};
  m.traverse((z) => {
    if ((z as THREE.Bone).isBone) h[z.name.replace(/^mixamorig:?/, "")] = z as THREE.Bone;
  });
  return h;
}

/** Sienta al personaje (que ya mira hacia donde tiene que mirar) con las manos sobre el teclado. */
export function sentar(m: THREE.Object3D): Huesos {
  m.updateMatrixWorld(true);
  const h = huesos(m);
  const r = m.getWorldQuaternion(new THREE.Quaternion());
  const W = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyQuaternion(r);
  for (const s of ["Left", "Right"] as const) {
    const sx = s === "Left" ? 1 : -1;
    apuntar(h[`${s}UpLeg`], h[`${s}Leg`], W(0.08 * sx, -0.08, 1));
    apuntar(h[`${s}Leg`], h[`${s}Foot`], W(0, -1, 0.12));
    apuntar(h[`${s}Arm`], h[`${s}ForeArm`], W(0.18 * sx, -0.75, 0.45));
    apuntar(h[`${s}ForeArm`], h[`${s}Hand`], W(-0.12 * sx, -0.05, 1));
  }
  return h;
}
