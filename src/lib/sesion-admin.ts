// Cuánto dura la sesión del panel. Antes eran 60 días fijos desde el login: un celular o una compu
// perdidos quedaban con el panel abierto dos meses. Ahora vence a los 7 días SIN USO: cada vez que se
// abre el panel, RenovarSesion pide /api/auth/session y NextAuth vuelve a emitir la cookie con 7 días más.
// Quien usa el panel seguido no nota nada; una sesión olvidada se cierra sola en una semana.

export const SESION_ADMIN_DIAS = 7;
export const SESION_ADMIN_MAX_AGE_S = SESION_ADMIN_DIAS * 24 * 60 * 60;
/** Mientras el panel está abierto (ej. la TV), renueva cada 6 horas. */
export const RENOVAR_SESION_CADA_MS = 6 * 60 * 60 * 1000;
