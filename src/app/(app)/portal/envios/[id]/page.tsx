import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotonImprimir } from "@/components/boton-imprimir";
import { ComprobanteEnvio } from "@/components/comprobante-envio";
import { BotonLink, Dato, Encabezado, Estado, Tarjeta } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirCliente } from "@/lib/dal";
import { descripcionPublica } from "@/lib/envios";
import { fechaHora } from "@/lib/format";
import { ESTADO_ENVIO } from "@/lib/labels";

export const metadata: Metadata = { title: "Envío" };

export default async function PaginaMiEnvio({ params }: PageProps<"/portal/envios/[id]">) {
  const { clienteId } = await requerirCliente();
  const { id } = await params;
  // Buscar por id y cliente: un envío de otro cliente da "no encontrado"
  const envio = await db.envio.findFirst({
    where: { id, clienteId },
    include: {
      cliente: true,
      depositoOrigen: true,
      depositoDestino: true,
      // Sin notas internas ni quién hizo cada cambio
      eventos: {
        orderBy: { createdAt: "desc" },
        select: { id: true, estado: true, createdAt: true, deposito: { select: { nombre: true } } },
      },
    },
  });
  if (!envio) notFound();

  return (
    <>
      <div className="no-imprimir">
        <Encabezado
          titulo={
            <span className="flex items-center gap-3">
              <span className="font-mono">{envio.codigo}</span> <Estado par={ESTADO_ENVIO[envio.estado]} />
            </span>
          }
          subtitulo={`${envio.depositoOrigen.nombre} → ${envio.depositoDestino.nombre}`}
          acciones={
            <>
              <BotonLink href="/portal/envios" variante="secundario">
                Volver
              </BotonLink>
              <BotonImprimir />
            </>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ComprobanteEnvio envio={envio} />
        </div>

        <div className="no-imprimir space-y-6">
          {envio.estado === "ENTREGADO" && (
            <Tarjeta titulo="Entrega">
              <dl className="space-y-3">
                <Dato etiqueta="Fecha y hora">{fechaHora(envio.fechaEntrega)}</Dato>
                <Dato etiqueta="Recibió">
                  {envio.recibidoPor}
                  {envio.recibidoDni && <span className="text-stone-500"> · DNI {envio.recibidoDni}</span>}
                </Dato>
              </dl>
            </Tarjeta>
          )}

          <Tarjeta titulo="Recorrido">
            <ol className="space-y-4">
              {envio.eventos.map((ev) => (
                <li key={ev.id} className="border-l-2 border-marca-200 pl-4">
                  <p className="text-sm font-medium text-stone-800">{descripcionPublica(ev.estado, ev.deposito?.nombre ?? null)}</p>
                  <p className="text-xs text-stone-500">{fechaHora(ev.createdAt)}</p>
                </li>
              ))}
            </ol>
          </Tarjeta>
        </div>
      </div>
    </>
  );
}
