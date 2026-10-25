// El control remoto de la TV como página del panel (para tenerlo a un toque en el celular).
import { ControlTv } from "../empresa/control-tv";

export const metadata = { title: "TV" };

export default function Tv() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-semibold text-acopio-900">📺 Control de la TV</h1>
      <p className="mb-4 text-sm text-stone-500">Elegí qué se ve en la TV. No hace falta tocar el control remoto.</p>
      <ControlTv />
    </div>
  );
}
