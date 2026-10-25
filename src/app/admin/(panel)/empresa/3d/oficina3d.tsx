"use client";

// Edificio de Acopio en 3D (three.js). Un pasillo central con una oficina por agente a cada lado;
// en la entrada, una pantalla grande con los números del día. Se camina con flechas/WASD (o el
// control remoto de la TV: arriba/abajo avanza, izquierda/derecha gira) y con OK/Enter se entra a
// hablar con quien está cerca, en modo manos libres (micrófono + respuesta en voz alta).

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type * as THREE_T from "three";
import { Ficha, type AgenteVista, type DatosOficina } from "../oficina";

const COLOR_AREA: Record<string, number> = {
  direccion: 0xf4c86a,
  comercial: 0x6fcf97,
  marketing: 0xb69cf2,
  operaciones: 0x7cc3f0,
  administracion: 0xd9cbb8,
};
const COLOR_ESTADO: Record<AgenteVista["estado"], number> = {
  ok: 0x22c55e,
  falla: 0xef4444,
  atrasado: 0xf59e0b,
  pendiente: 0x38bdf8,
  descanso: 0x9ca3af,
};

const ANCHO_PASILLO = 3; // mitad del ancho
const PROF = 10; // ancho (en x) de cada oficina
const LARGO = 9; // largo (en z) de cada oficina

type Puesto = { a: AgenteVista; lado: -1 | 1; zc: number; puerta: { x: number; z: number }; persona: { x: number; z: number } };

function puestos(agentes: AgenteVista[], areas: string[]): Puesto[] {
  const orden = [...agentes].sort((x, y) => areas.indexOf(x.area) - areas.indexOf(y.area));
  return orden.map((a, i) => {
    const lado = (i % 2 === 0 ? -1 : 1) as -1 | 1;
    const fila = Math.floor(i / 2);
    const zc = -(fila * LARGO + LARGO / 2);
    return {
      a,
      lado,
      zc,
      puerta: { x: lado * (ANCHO_PASILLO - 1), z: zc },
      persona: { x: lado * (ANCHO_PASILLO + PROF * 0.62), z: zc },
    };
  });
}

/** Textura con texto, dibujada en un canvas. */
function textura(THREE: typeof THREE_T, lineas: { t: string; tam: number; color?: string; peso?: number }[], ancho = 1024, alto = 256, fondo = "rgba(0,0,0,0)") {
  const c = document.createElement("canvas");
  c.width = ancho;
  c.height = alto;
  const g = c.getContext("2d")!;
  g.fillStyle = fondo;
  g.fillRect(0, 0, ancho, alto);
  const total = lineas.reduce((s, l) => s + l.tam * 1.25, 0);
  let y = (alto - total) / 2;
  for (const l of lineas) {
    g.font = `${l.peso ?? 600} ${l.tam}px system-ui, -apple-system, Segoe UI, sans-serif`;
    g.fillStyle = l.color ?? "#1c1917";
    g.textAlign = "center";
    g.textBaseline = "top";
    g.fillText(l.t, ancho / 2, y, ancho - 40);
    y += l.tam * 1.25;
  }
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 4;
  return tx;
}

/** El avatar (SVG) pasado a una textura redonda. */
function avatar(THREE: typeof THREE_T, id: string): THREE_T.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => {
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0, 256, 256);
    tx.needsUpdate = true;
  };
  img.src = `/avatars/${id}.svg`;
  return tx;
}

export function Oficina3D({ datos }: { datos: DatosOficina }) {
  const router = useRouter();
  const lienzo = useRef<HTMLDivElement>(null);
  const [cerca, setCerca] = useState<AgenteVista | null>(null);
  const [abierto, setAbierto] = useState<AgenteVista | null>(null);
  const [mapa, setMapa] = useState(false);
  const [cargado, setCargado] = useState(false);
  const abiertoRef = useRef<AgenteVista | null>(null);
  const cercaRef = useRef<AgenteVista | null>(null);
  const irA = useRef<(id: string) => void>(() => undefined);
  const teclas = useRef<Set<string>>(new Set());
  abiertoRef.current = abierto;
  cercaRef.current = cerca;

  // Se actualiza sola cada 2 minutos (si no hay una charla abierta).
  useEffect(() => {
    const t = setInterval(() => {
      if (!abiertoRef.current) router.refresh();
    }, 120_000);
    return () => clearInterval(t);
  }, [router]);

  useEffect(() => {
    let vivo = true;
    let limpiar = () => undefined as void;
    (async () => {
      const THREE = await import("three");
      if (!vivo || !lienzo.current) return;
      const cont = lienzo.current;
      const render = new THREE.WebGLRenderer({ antialias: true });
      render.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      render.setSize(cont.clientWidth, cont.clientHeight);
      render.shadowMap.enabled = true;
      render.outputColorSpace = THREE.SRGBColorSpace;
      cont.appendChild(render.domElement);

      const escena = new THREE.Scene();
      escena.background = new THREE.Color(0xdfe9e2);
      escena.fog = new THREE.Fog(0xdfe9e2, 30, 90);
      const camara = new THREE.PerspectiveCamera(65, cont.clientWidth / cont.clientHeight, 0.1, 200);

      escena.add(new THREE.HemisphereLight(0xffffff, 0xb7a58c, 1.4));
      const sol = new THREE.DirectionalLight(0xffffff, 1.6);
      sol.position.set(12, 25, 10);
      sol.castShadow = true;
      sol.shadow.mapSize.set(2048, 2048);
      Object.assign(sol.shadow.camera, { left: -40, right: 40, top: 40, bottom: -90, far: 120 });
      escena.add(sol);

      const lugares = puestos(datos.agentes, datos.areas.map((a) => a.id));
      const filas = Math.ceil(lugares.length / 2);
      const fondoZ = -(filas * LARGO);

      // Piso: pasillo de madera clara y oficinas.
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(80, 140), new THREE.MeshStandardMaterial({ color: 0xece3d4, roughness: 0.9 }));
      piso.rotation.x = -Math.PI / 2;
      piso.position.set(0, 0, fondoZ / 2 + 8);
      piso.receiveShadow = true;
      escena.add(piso);
      const alfombra = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_PASILLO * 2, -fondoZ + 14), new THREE.MeshStandardMaterial({ color: 0x1f5a45, roughness: 1 }));
      alfombra.rotation.x = -Math.PI / 2;
      alfombra.position.set(0, 0.01, fondoZ / 2 + 7);
      alfombra.receiveShadow = true;
      escena.add(alfombra);

      // Paredes (cajas finas) + lista para choques.
      const paredes: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
      const matPared = new THREE.MeshStandardMaterial({ color: 0xfaf7f2, roughness: 0.95 });
      const pared = (x1: number, z1: number, x2: number, z2: number, alto = 3.2, mat: THREE_T.Material = matPared) => {
        const w = Math.max(Math.abs(x2 - x1), 0.15);
        const d = Math.max(Math.abs(z2 - z1), 0.15);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, alto, d), mat);
        m.position.set((x1 + x2) / 2, alto / 2, (z1 + z2) / 2);
        m.castShadow = true;
        m.receiveShadow = true;
        escena.add(m);
        paredes.push({ minX: Math.min(x1, x2) - 0.08, maxX: Math.max(x1, x2) + 0.08, minZ: Math.min(z1, z2) - 0.08, maxZ: Math.max(z1, z2) + 0.08 });
      };

      const clicables: { obj: THREE_T.Object3D; a: AgenteVista }[] = [];
      const lamparas: { m: THREE_T.Mesh; estado: AgenteVista["estado"] }[] = [];
      const cabezas: { s: THREE_T.Sprite; base: number; fase: number }[] = [];

      for (const p of lugares) {
        const { lado, zc, a } = p;
        const xIn = lado * ANCHO_PASILLO;
        const xOut = lado * (ANCHO_PASILLO + PROF);
        const z1 = zc - LARGO / 2;
        const z2 = zc + LARGO / 2;
        const colorArea = COLOR_AREA[a.area] ?? 0xdddddd;
        // Piso de la oficina en el color del área (suave).
        const pisoOf = new THREE.Mesh(new THREE.PlaneGeometry(PROF, LARGO), new THREE.MeshStandardMaterial({ color: new THREE.Color(colorArea).lerp(new THREE.Color(0xffffff), 0.55), roughness: 1 }));
        pisoOf.rotation.x = -Math.PI / 2;
        pisoOf.position.set((xIn + xOut) / 2, 0.012, zc);
        pisoOf.receiveShadow = true;
        escena.add(pisoOf);
        // Paredes: fondo, separaciones y frente de vidrio con puerta.
        pared(xOut, z1, xOut, z2, 3.2, new THREE.MeshStandardMaterial({ color: new THREE.Color(colorArea).lerp(new THREE.Color(0xffffff), 0.25), roughness: 0.9 }));
        pared(xIn, z1, xOut, z1);
        pared(xIn, z2, xOut, z2);
        const vidrio = new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.25, roughness: 0.1 });
        pared(xIn, z1, xIn, zc - 1.3, 3.2, vidrio);
        pared(xIn, zc + 1.3, xIn, z2, 3.2, vidrio);

        // Cartel arriba de la puerta.
        const cartel = new THREE.Mesh(
          new THREE.PlaneGeometry(4.2, 1.05),
          new THREE.MeshBasicMaterial({ map: textura(THREE, [{ t: `${a.emoji} ${a.persona}`, tam: 92, peso: 800 }, { t: a.nombre, tam: 58, color: "#44403c", peso: 500 }], 1024, 256, "#ffffff"), transparent: true }),
        );
        cartel.position.set(xIn - lado * 0.09, 3.6, zc);
        cartel.rotation.y = lado === -1 ? Math.PI / 2 : -Math.PI / 2;
        escena.add(cartel);

        // Puesto de trabajo: escritorio frente a la puerta, la persona sentada detrás, con su compu.
        const madera = new THREE.MeshStandardMaterial({ color: 0x9a6b43, roughness: 0.7 });
        const xEsc = lado * (ANCHO_PASILLO + PROF * 0.48);
        const tapa = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 2.6), madera);
        tapa.position.set(xEsc, 0.85, zc);
        tapa.castShadow = true;
        tapa.receiveShadow = true;
        escena.add(tapa);
        // Frente cerrado (del lado del visitante) y laterales.
        const frente = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 2.6), madera);
        frente.position.set(xEsc - lado * 0.67, 0.42, zc);
        escena.add(frente);
        for (const dz of [-1.27, 1.27]) {
          const pata = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.82, 0.06), madera);
          pata.position.set(xEsc, 0.41, zc + dz);
          escena.add(pata);
        }
        // Monitor mirando a la persona (corrido a un costado para que se le vea la cara) y teclado.
        const xPc = xEsc + lado * 0.05;
        const pie = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.2), new THREE.MeshStandardMaterial({ color: 0x374151 }));
        pie.position.set(xPc, 1.0, zc - 0.75);
        const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 1.05), new THREE.MeshStandardMaterial({ color: 0x111827 }));
        monitor.position.set(xPc, 1.42, zc - 0.75);
        monitor.rotation.y = lado * 0.35;
        const brillo = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.52), new THREE.MeshBasicMaterial({ color: new THREE.Color(colorArea).lerp(new THREE.Color(0xffffff), 0.35) }));
        brillo.position.set(xPc + lado * 0.035, 1.42, zc - 0.75);
        brillo.rotation.y = (lado === 1 ? Math.PI / 2 : -Math.PI / 2) + lado * 0.35;
        const teclado = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.75), new THREE.MeshStandardMaterial({ color: 0xe5e7eb }));
        teclado.position.set(xEsc + lado * 0.32, 0.905, zc - 0.15);
        const taza = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        taza.position.set(xEsc - lado * 0.2, 0.96, zc + 0.85);
        escena.add(pie, monitor, brillo, teclado, taza);
        // Silla.
        const tela = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 });
        const asiento = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.62), tela);
        asiento.position.set(p.persona.x, 0.55, zc);
        const respaldo = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.62), tela);
        respaldo.position.set(p.persona.x + lado * 0.33, 1.0, zc);
        const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x52525b }));
        columna.position.set(p.persona.x, 0.27, zc);
        escena.add(asiento, respaldo, columna);
        // Planta.
        const planta = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), new THREE.MeshStandardMaterial({ color: 0x3f8f5a }));
        planta.position.set(xOut - lado * 0.8, 0.9, z1 + 0.9);
        const maceta = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0xc2410c }));
        maceta.position.set(xOut - lado * 0.8, 0.25, z1 + 0.9);
        escena.add(planta, maceta);
        paredes.push({ minX: Math.min(xEsc - 0.75, xEsc + 0.75), maxX: Math.max(xEsc - 0.75, xEsc + 0.75), minZ: zc - 1.35, maxZ: zc + 1.35 });

        // La persona sentada: torso, brazos hacia el teclado y la cabeza con su cara.
        const ropa = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorArea).multiplyScalar(0.75), roughness: 0.6 });
        const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.45, 6, 16), ropa);
        cuerpo.position.set(p.persona.x, 1.0, zc);
        cuerpo.castShadow = true;
        const piernas = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.45), new THREE.MeshStandardMaterial({ color: 0x334155 }));
        piernas.position.set(p.persona.x - lado * 0.25, 0.68, zc);
        escena.add(cuerpo, piernas);
        for (const dz of [-0.28, 0.28]) {
          const brazo = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 4, 8), ropa);
          brazo.position.set(p.persona.x - lado * 0.28, 1.0, zc + dz);
          brazo.rotation.z = lado * 1.1;
          escena.add(brazo);
        }
        const cabeza = new THREE.Sprite(new THREE.SpriteMaterial({ map: avatar(THREE, a.id) }));
        cabeza.scale.set(1.05, 1.05, 1);
        cabeza.position.set(p.persona.x, 1.72, zc);
        escena.add(cabeza);
        cabezas.push({ s: cabeza, base: 1.72, fase: Math.random() * 6 });
        clicables.push({ obj: cuerpo, a }, { obj: cabeza, a });

        // Luz de estado arriba de la cabeza.
        const lampara = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: COLOR_ESTADO[a.estado] }));
        lampara.position.set(p.persona.x, 2.4, zc);
        escena.add(lampara);
        lamparas.push({ m: lampara, estado: a.estado });

        // Lo último que hizo, en una pizarra en la pared del fondo.
        const ultimo = a.informes[0]?.texto.split("\n").map((l) => l.replace(/^[#*\-•\s]+/, "").trim()).find((l) => l.length > 10) ?? a.mision;
        const pizarra = new THREE.Mesh(
          new THREE.PlaneGeometry(5.6, 1.8),
          new THREE.MeshBasicMaterial({
            map: textura(
              THREE,
              [
                { t: a.estadoTexto, tam: 54, color: "#0b5540", peso: 700 },
                { t: ultimo.slice(0, 60), tam: 40, color: "#292524", peso: 500 },
                { t: ultimo.slice(60, 120), tam: 40, color: "#292524", peso: 500 },
              ],
              1400,
              450,
              "#fffdf7",
            ),
          }),
        );
        pizarra.position.set(xOut - lado * 0.1, 2.15, zc);
        pizarra.rotation.y = lado === -1 ? Math.PI / 2 : -Math.PI / 2;
        escena.add(pizarra);
      }

      // Paredes del pasillo al fondo y laterales del hall.
      pared(-ANCHO_PASILLO - PROF, fondoZ, ANCHO_PASILLO + PROF, fondoZ);
      pared(-ANCHO_PASILLO - PROF, 0, -ANCHO_PASILLO, 0);
      pared(ANCHO_PASILLO, 0, ANCHO_PASILLO + PROF, 0);
      pared(-ANCHO_PASILLO - PROF, 0, -ANCHO_PASILLO - PROF, 14);
      pared(ANCHO_PASILLO + PROF, 0, ANCHO_PASILLO + PROF, 14);
      pared(-ANCHO_PASILLO - PROF, 14, ANCHO_PASILLO + PROF, 14);

      // Hall de entrada: pantalla gigante con los números del día y el parte de Laura.
      const kpis = datos.kpis.map((k) => `${k.titulo}: ${k.valor}`);
      const pantallaHall = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 5.2),
        new THREE.MeshBasicMaterial({
          map: textura(
            THREE,
            [
              { t: "ACOPIO SALUDABLE · LA EMPRESA", tam: 70, color: "#fbbf24", peso: 800 },
              { t: `${datos.hoy} · ${datos.hora}`, tam: 44, color: "#d6d3d1", peso: 500 },
              { t: kpis.slice(0, 3).join("   ·   "), tam: 50, color: "#ffffff", peso: 700 },
              { t: kpis.slice(3).join("   ·   "), tam: 50, color: "#ffffff", peso: 700 },
              { t: `🎄 ${datos.temporada}`, tam: 46, color: "#86efac", peso: 600 },
            ],
            2048,
            900,
            "#10251c",
          ),
        }),
      );
      pantallaHall.position.set(0, 5.4, 0.2);
      escena.add(pantallaHall);
      const logo = new THREE.Mesh(
        new THREE.PlaneGeometry(9, 1.6),
        new THREE.MeshBasicMaterial({ map: textura(THREE, [{ t: "Oficinas → caminá con las flechas · OK para hablar", tam: 64, color: "#0b5540", peso: 700 }], 2048, 360, "#ffffff") }),
      );
      logo.position.set(0, 3.4, 13.9);
      logo.rotation.y = Math.PI;
      escena.add(logo);

      // Jugador.
      const yo = { x: 0, z: 11, giro: 0 };
      const ojo = 1.7;
      irA.current = (id: string) => {
        const p = lugares.find((l) => l.a.id === id);
        if (!p) return;
        yo.x = p.puerta.x;
        yo.z = p.zc;
        yo.giro = p.lado === -1 ? Math.PI / 2 : -Math.PI / 2;
      };

      const choca = (x: number, z: number) => paredes.some((w) => x > w.minX - 0.35 && x < w.maxX + 0.35 && z > w.minZ - 0.35 && z < w.maxZ + 0.35);

      // Mouse / toque: arrastrar para mirar, tocar a alguien para hablarle.
      const ray = new THREE.Raycaster();
      let arrastre: { x: number; giro: number; movio: boolean } | null = null;
      const abajo = (e: PointerEvent) => {
        arrastre = { x: e.clientX, giro: yo.giro, movio: false };
      };
      const mueve = (e: PointerEvent) => {
        if (!arrastre) return;
        const dx = e.clientX - arrastre.x;
        if (Math.abs(dx) > 4) arrastre.movio = true;
        yo.giro = arrastre.giro - dx * 0.005;
      };
      const arriba = (e: PointerEvent) => {
        const fue = arrastre;
        arrastre = null;
        if (fue?.movio || abiertoRef.current) return;
        const r = render.domElement.getBoundingClientRect();
        ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camara);
        const hit = ray.intersectObjects(clicables.map((c) => c.obj))[0];
        const a = hit && clicables.find((c) => c.obj === hit.object)?.a;
        if (a) {
          irA.current(a.id);
          setAbierto(a);
        }
      };
      render.domElement.addEventListener("pointerdown", abajo);
      window.addEventListener("pointermove", mueve);
      window.addEventListener("pointerup", arriba);

      const alCambiarTam = () => {
        render.setSize(cont.clientWidth, cont.clientHeight);
        camara.aspect = cont.clientWidth / cont.clientHeight;
        camara.updateProjectionMatrix();
      };
      window.addEventListener("resize", alCambiarTam);

      const reloj = new THREE.Clock();
      let anterior: string | null = null;
      render.setAnimationLoop(() => {
        const dt = Math.min(reloj.getDelta(), 0.05);
        const t = reloj.elapsedTime;
        if (!abiertoRef.current) {
          const k = teclas.current;
          const vel = (k.has("Shift") ? 7 : 4.2) * dt;
          const giro = 1.9 * dt;
          if (k.has("ArrowLeft") || k.has("a")) yo.giro += giro;
          if (k.has("ArrowRight") || k.has("d")) yo.giro -= giro;
          let av = 0;
          let lat = 0;
          if (k.has("ArrowUp") || k.has("w")) av += vel;
          if (k.has("ArrowDown") || k.has("s")) av -= vel;
          if (k.has("q")) lat -= vel;
          if (k.has("e")) lat += vel;
          const nx = yo.x - Math.sin(yo.giro) * av + Math.cos(yo.giro) * lat;
          const nz = yo.z - Math.cos(yo.giro) * av - Math.sin(yo.giro) * lat;
          if (!choca(nx, yo.z)) yo.x = nx;
          if (!choca(yo.x, nz)) yo.z = nz;
        }
        camara.position.set(yo.x, ojo + Math.sin(t * 2) * 0.01, yo.z);
        camara.rotation.set(0, yo.giro, 0, "YXZ");

        for (const c of cabezas) c.s.position.y = c.base + Math.sin(t * 1.6 + c.fase) * 0.04;
        for (const l of lamparas) {
          const m = l.m.material as THREE_T.MeshBasicMaterial;
          m.opacity = l.estado === "pendiente" ? 0.5 + 0.5 * Math.abs(Math.sin(t * 3)) : 1;
          m.transparent = l.estado === "pendiente";
        }

        // ¿Quién está cerca? (dentro de su oficina o en su puerta)
        let mejor: { a: AgenteVista; d: number } | null = null;
        for (const p of lugares) {
          const d = Math.hypot(p.persona.x - yo.x, p.zc - yo.z);
          const enPuerta = Math.hypot(p.puerta.x - yo.x, p.zc - yo.z) < 2.2;
          if ((d < 5.2 || enPuerta) && (!mejor || d < mejor.d)) mejor = { a: p.a, d };
        }
        const id = mejor?.a.id ?? null;
        if (id !== anterior) {
          anterior = id;
          setCerca(mejor?.a ?? null);
        }
        render.render(escena, camara);
      });
      setCargado(true);

      limpiar = () => {
        render.setAnimationLoop(null);
        render.domElement.removeEventListener("pointerdown", abajo);
        window.removeEventListener("pointermove", mueve);
        window.removeEventListener("pointerup", arriba);
        window.removeEventListener("resize", alCambiarTam);
        render.dispose();
        cont.removeChild(render.domElement);
      };
    })();
    return () => {
      vivo = false;
      limpiar();
    };
  }, [datos]);

  // Teclado y control remoto.
  const tecla = useCallback((e: KeyboardEvent, baja: boolean) => {
    const enCampo = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName);
    if (abiertoRef.current) {
      if (baja && e.key === "Escape") setAbierto(null);
      return;
    }
    if (enCampo) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "q", "e", "Shift"].includes(k)) {
      e.preventDefault();
      if (baja) teclas.current.add(k);
      else teclas.current.delete(k);
    }
    if (baja && (e.key === "Enter" || e.key === " ") && cercaRef.current) {
      e.preventDefault();
      teclas.current.clear();
      setAbierto(cercaRef.current);
    }
    if (baja && k === "m") setMapa((m) => !m);
  }, []);
  useEffect(() => {
    const d = (e: KeyboardEvent) => tecla(e, true);
    const u = (e: KeyboardEvent) => tecla(e, false);
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    return () => {
      window.removeEventListener("keydown", d);
      window.removeEventListener("keyup", u);
    };
  }, [tecla]);

  // Botones en pantalla (celular / TV táctil): mantener apretado = moverse.
  const boton = (k: string, txt: string) => (
    <button
      onPointerDown={() => teclas.current.add(k)}
      onPointerUp={() => teclas.current.delete(k)}
      onPointerLeave={() => teclas.current.delete(k)}
      className="h-14 w-14 rounded-2xl bg-white/15 text-2xl text-white backdrop-blur active:bg-white/30"
      aria-label={txt}
    >
      {txt}
    </button>
  );

  const transmitir = async () => {
    const url = `${window.location.origin}/admin/empresa/3d`;
    const w = window as unknown as { PresentationRequest?: new (u: string[]) => { start: () => Promise<unknown> } };
    try {
      if (w.PresentationRequest) {
        await new w.PresentationRequest([url]).start();
        return;
      }
    } catch {
      /* el usuario canceló o no hay receptor: mostramos la ayuda */
    }
    alert("Para verlo en la TV: en Chrome tocá el menú ⋮ → «Transmitir…» y elegí tu TV (Chromecast, Google TV o Smart TV compatible). El micrófono sigue siendo el de tu compu o celular.");
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900">
      <div ref={lienzo} className="absolute inset-0" />
      {!cargado ? <div className="absolute inset-0 grid place-items-center text-white/80">Abriendo la oficina…</div> : null}

      {/* Barra superior */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
        <div className="pointer-events-auto rounded-2xl bg-black/45 px-4 py-2 text-white backdrop-blur">
          <div className="text-sm font-semibold">Acopio · La empresa</div>
          <div className="text-xs text-white/70">Flechas para caminar · OK/Enter para hablar · M mapa · Esc salir de una charla</div>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button onClick={() => setMapa((m) => !m)} className="rounded-full bg-black/45 px-4 py-2 text-sm text-white backdrop-blur">🗺️ Oficinas</button>
          <button onClick={() => void transmitir()} className="rounded-full bg-black/45 px-4 py-2 text-sm text-white backdrop-blur">📺 Transmitir a la TV</button>
          <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)} className="rounded-full bg-black/45 px-4 py-2 text-sm text-white backdrop-blur">⛶</button>
          <a href="/admin/empresa" className="rounded-full bg-black/45 px-4 py-2 text-sm text-white backdrop-blur">✕</a>
        </div>
      </div>

      {/* Quién está cerca */}
      {cerca && !abierto ? (
        <button
          onClick={() => setAbierto(cerca)}
          className="absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/95 py-2 pl-2 pr-5 text-stone-900 shadow-xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/avatars/${cerca.id}.svg`} alt="" className="h-12 w-12" />
          <span className="text-left">
            <span className="block font-semibold">🎙️ Hablar con {cerca.persona}</span>
            <span className="block text-xs text-stone-500">{cerca.nombre} · {cerca.estadoTexto} · OK / Enter</span>
          </span>
        </button>
      ) : null}

      {/* Controles táctiles */}
      <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-2">
        <span />
        {boton("ArrowUp", "▲")}
        <span />
        {boton("ArrowLeft", "◀")}
        {boton("ArrowDown", "▼")}
        {boton("ArrowRight", "▶")}
      </div>

      {/* Mapa: ir directo a una oficina */}
      {mapa ? (
        <div className="absolute right-4 top-20 max-h-[75vh] w-72 overflow-y-auto rounded-2xl bg-black/70 p-3 text-white backdrop-blur">
          <div className="mb-2 text-sm font-semibold">Ir a la oficina de…</div>
          {datos.agentes.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                irA.current(a.id);
                setMapa(false);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/avatars/${a.id}.svg`} alt="" className="h-8 w-8" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{a.persona} {a.emoji}</span>
                <span className="block truncate text-xs text-white/60">{a.nombre}</span>
              </span>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: `#${COLOR_ESTADO[a.estado].toString(16).padStart(6, "0")}` }} />
            </button>
          ))}
        </div>
      ) : null}

      {abierto ? <Ficha a={abierto} tv onCerrar={() => setAbierto(null)} onCambio={() => router.refresh()} manosLibres /> : null}
    </div>
  );
}
