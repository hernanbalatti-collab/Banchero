import type { Metadata } from "next";
import { cx } from "@/components/ui";
import type { EstadoEnvio } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { descripcionPublica, normalizarCodigo } from "@/lib/envios";
import { fechaHora } from "@/lib/format";
import { FormCodigo } from "../form-codigo";

export const metadata: Metadata = { title: "Seguimiento de envío", robots: { index: false } };

/** Solo nombre e inicial del apellido: la página es pública. */
function nombreReducido(nombre: string) {
  const [primero, ...resto] = nombre.trim().split(/\s+/);
  return resto.length ? `${primero} ${resto[resto.length - 1][0]}.` : primero;
}

type Paso = { estado: EstadoEnvio; titulo: string };

export default async function PaginaSeguimientoEnvio({ params }: PageProps<"/seguimiento/[codigo]">) {
  const { codigo } = await params;
  const normalizado = normalizarCodigo(decodeURIComponent(codigo));
  // Solo se lee lo que es apto para mostrar públicamente
  const envio = normalizado
    ? await db.envio.findUnique({
        where: { codigo: normalizado },
        select: {
          codigo: true,
          estado: true,
          bultos: true,
          entregaDomicilio: true,
          destinatarioNombre: true,
          fechaEntrega: true,
          createdAt: true,
          depositoOrigen: { select: { nombre: true } },
          depositoDestino: { select: { nombre: true, direccion: true, telefono: true } },
          eventos: {
            orderBy: { createdAt: "desc" },
            select: { id: true, estado: true, createdAt: true, deposito: { select: { nombre: true } } },
          },
        },
      })
    : null;

  if (!envio) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold text-stone-900">No encontramos ese envío</h1>
        <p className="mt-1 mb-5 text-sm text-stone-600">
          Revisá el código <span className="font-mono font-medium">{decodeURIComponent(codigo)}</span> e intentá de nuevo.
        </p>
        <FormCodigo />
      </div>
    );
  }

  const pasos: Paso[] = [
    { estado: "RECIBIDO", titulo: `Recibido en ${envio.depositoOrigen.nombre}` },
    { estado: "EN_TRANSITO", titulo: "En viaje" },
    { estado: "EN_DESTINO", titulo: `En depósito ${envio.depositoDestino.nombre}` },
    ...(envio.entregaDomicilio ? [{ estado: "EN_REPARTO" as const, titulo: "En reparto" }] : []),
    { estado: "ENTREGADO", titulo: "Entregado" },
  ];
  const actual = pasos.findIndex((p) => p.estado === envio.estado);
  const cancelado = envio.estado === "CANCELADO";

  const resumen: Record<EstadoEnvio, string> = {
    RECIBIDO: `Tu envío está en nuestro depósito de ${envio.depositoOrigen.nombre}, esperando el próximo viaje a ${envio.depositoDestino.nombre}.`,
    EN_TRANSITO: `Tu envío está viajando de ${envio.depositoOrigen.nombre} a ${envio.depositoDestino.nombre}.`,
    EN_DESTINO: envio.entregaDomicilio
      ? `Tu envío llegó al depósito de ${envio.depositoDestino.nombre} y pronto sale a reparto.`
      : `Tu envío llegó al depósito de ${envio.depositoDestino.nombre} y está listo para retirar.`,
    EN_REPARTO: "Tu envío salió a reparto y hoy llega a destino.",
    ENTREGADO: `Tu envío fue entregado el ${fechaHora(envio.fechaEntrega)}`,
    CANCELADO: "Este envío fue cancelado. Comunicate con nosotros para más información.",
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Envío</p>
        <h1 className="mt-1 font-mono text-2xl font-semibold tracking-wider text-stone-900">{envio.codigo}</h1>
        <p className="mt-2 text-sm text-stone-600">
          {envio.depositoOrigen.nombre} → {envio.depositoDestino.nombre} · {envio.bultos} bulto{envio.bultos === 1 ? "" : "s"} · Para{" "}
          {nombreReducido(envio.destinatarioNombre)}
        </p>

        <p
          className={cx(
            "mt-6 rounded-lg px-4 py-3 text-sm font-medium",
            cancelado ? "bg-red-50 text-red-700" : envio.estado === "ENTREGADO" ? "bg-emerald-50 text-emerald-800" : "bg-marca-50 text-marca-900",
          )}
        >
          {resumen[envio.estado]}
        </p>

        {!cancelado && (
          <ol className="mt-8 space-y-0">
            {pasos.map((p, i) => {
              const hecho = i <= actual;
              return (
                <li key={p.estado} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < pasos.length - 1 && (
                    <span
                      aria-hidden
                      className={cx("absolute top-6 left-[11px] h-full w-0.5", i < actual ? "bg-marca-600" : "bg-stone-200")}
                    />
                  )}
                  <span
                    className={cx(
                      "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      hecho ? "bg-marca-600 text-white" : "border-2 border-stone-300 bg-white text-stone-400",
                    )}
                  >
                    {hecho ? "✓" : i + 1}
                  </span>
                  <span className={cx("pt-0.5 text-sm", i === actual ? "font-semibold text-stone-900" : hecho ? "text-stone-700" : "text-stone-400")}>
                    {p.titulo}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {envio.estado === "EN_DESTINO" && !envio.entregaDomicilio && (envio.depositoDestino.direccion || envio.depositoDestino.telefono) && (
          <p className="mt-6 text-sm text-stone-600">
            Retirá en: {[envio.depositoDestino.direccion, envio.depositoDestino.telefono].filter(Boolean).join(" · ")}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="mb-4 text-sm font-semibold text-stone-900">Movimientos</h2>
        <ol className="space-y-3">
          {envio.eventos.map((ev) => (
            <li key={ev.id} className="flex flex-wrap justify-between gap-x-4 text-sm">
              <span className="text-stone-800">{descripcionPublica(ev.estado, ev.deposito?.nombre ?? null)}</span>
              <span className="tabular-nums text-stone-500">{fechaHora(ev.createdAt)}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="text-center">
        <p className="mb-3 text-sm text-stone-600">¿Querés buscar otro envío?</p>
        <div className="flex justify-center">
          <FormCodigo />
        </div>
      </div>
    </div>
  );
}
