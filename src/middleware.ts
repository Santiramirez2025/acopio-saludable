import { withAuth } from "next-auth/middleware";

export default withAuth({ pages: { signIn: "/admin/login" } });

// El panel entero pide sesión, menos el login y el manifest: el navegador pide el manifest
// sin credenciales para ofrecer la instalación, y si lo mandamos al login no instala nada.
export const config = { matcher: ["/admin", "/admin/((?!login|manifest.webmanifest).+)"] };
