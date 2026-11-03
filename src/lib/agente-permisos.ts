// Claves por agente: cada agente con su clave y solo las rutas de /api/admin que necesita (lectura y
// escritura por separado), para reemplazar de a poco la clave compartida que está en todos los prompts.
// Se configura en la variable AGENTES_CLAVES_JSON de Vercel. Solo guarda hashes, nunca la clave:
//   [{"agente":"seguridad","sha256":"<hash>","leer":["*"],"escribir":["/agentes","/agentes/orden"]}]
// Las rutas se escriben sin «/api/admin». Sin la variable no cambia nada. El límite lo aplica src/middleware.ts.
// Corre también en Edge (middleware): acá no se puede importar nada de Node.

export type ClaveAgente = { agente: string; sha256: string; leer: string[]; escribir: string[] };
export type Decision = { agente: string; permitido: boolean };

const BASE = "/api/admin";

function listaDeTextos(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Lee la configuración. Si está rota no autoriza a nadie (las claves por agente dan 401). */
export function leerClavesAgentes(raw: string | undefined): ClaveAgente[] {
  if (!raw?.trim()) return [];
  try {
    const lista: unknown = JSON.parse(raw);
    if (!Array.isArray(lista)) throw new Error("no es una lista");
    return lista.flatMap((x: Record<string, unknown>) =>
      x && typeof x.agente === "string" && typeof x.sha256 === "string" && /^[0-9a-f]{64}$/i.test(x.sha256)
        ? [{ agente: x.agente, sha256: x.sha256.toLowerCase(), leer: listaDeTextos(x.leer), escribir: listaDeTextos(x.escribir) }]
        : [],
    );
  } catch {
    console.error("AGENTES_CLAVES_JSON inválida: no se aceptan claves por agente");
    return [];
  }
}

/** La regla «/agentes» cubre /agentes y /agentes/lo-que-sea, pero no /agentes-otra. «*» cubre todo. */
function reglaCubre(regla: string, ruta: string): boolean {
  if (regla === "*") return true;
  const r = regla.replace(/\/+$/, "");
  return ruta === r || ruta.startsWith(`${r}/`);
}

/**
 * Qué hacer con un pedido según el hash de su clave. null = no es una clave por agente (decide la ruta,
 * como siempre). Una ruta rara (codificada, con «..» o «//») se niega: no se puede saber qué regla le toca.
 */
export function decidirAgente(claves: ClaveAgente[], hash: string, metodo: string, pathname: string): Decision | null {
  const c = claves.find((x) => x.sha256 === hash);
  if (!c) return null;
  if (!(pathname === BASE || pathname.startsWith(`${BASE}/`)) || /%|\.\.|\/\/|\\/.test(pathname)) return { agente: c.agente, permitido: false };
  const ruta = pathname.slice(BASE.length).replace(/\/+$/, "") || "/";
  const lee = ["GET", "HEAD", "OPTIONS"].includes(metodo.toUpperCase());
  return { agente: c.agente, permitido: (lee ? c.leer : c.escribir).some((r) => reglaCubre(r, ruta)) };
}

/** Mismo hash que hashClave (admin-acceso.ts), con la API que existe en Edge. */
export async function hashEdge(clave: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clave.trim()));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
