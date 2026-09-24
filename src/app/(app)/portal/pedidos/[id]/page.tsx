import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelarPedido } from "@/actions/pedidos";
import { BotonEnviar } from "@/components/form";
import { DatosPedido, INCLUDE_PEDIDO } from "@/components/pedidos";
import { BotonLink, Dato, Encabezado, Estado, Tarjeta } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirCliente } from "@/lib/dal";
import { fechaHora, numeroPedido, numeroViaje } from "@/lib/format";
import { ESTADO_PEDIDO, TIPO_PEDIDO } from "@/lib/labels";

export const metadata: Metadata = { title: "Pedido" };

const claseLink = "font-mono font-medium text-marca-700 hover:text-marca-900";

export default async function PaginaMiPedido({ params }: PageProps<"/portal/pedidos/[id]">) {
  const { clienteId } = await requerirCliente();
  const { id } = await params;
  // Buscar por id y cliente: un pedido de otro cliente da "no encontrado"
  const pedido = await db.pedido.findFirst({
    where: { id, clienteId },
    include: {
      ...INCLUDE_PEDIDO,
      creadoPor: { select: { nombre: true } },
      viaje: { select: { id: true, numero: true } },
      envio: { select: { id: true, codigo: true } },
    },
  });
  if (!pedido) notFound();

  return (
    <>
      <Encabezado
        titulo={
          <span className="flex items-center gap-3">
            {TIPO_PEDIDO[pedido.tipo]} <span className="font-mono">{numeroPedido(pedido.numero)}</span>
            <Estado par={ESTADO_PEDIDO[pedido.estado]} />
          </span>
        }
        subtitulo={`Cargado por ${pedido.creadoPor.nombre} el ${fechaHora(pedido.createdAt)}`}
        acciones={
          <BotonLink href="/portal/pedidos" variante="secundario">
            Volver
          </BotonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Pedido" className="lg:col-span-2">
          <DatosPedido pedido={pedido} />
        </Tarjeta>

        <Tarjeta titulo="Estado">
          {pedido.estado === "PENDIENTE" && (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                {pedido.tipo === "FLETE"
                  ? "Lo estamos revisando: te confirmamos tarifa y fecha, y el viaje aparece en «Mis fletes»."
                  : "Traé la encomienda al depósito: al recibirla te damos el código de seguimiento y aparece en «Mis envíos»."}
              </p>
              <form action={cancelarPedido.bind(null, pedido.id)}>
                <BotonEnviar variante="peligro" chico confirmar="¿Cancelar el pedido?">
                  Cancelar pedido
                </BotonEnviar>
              </form>
            </div>
          )}
          {pedido.estado === "ACEPTADO" && (
            <dl className="space-y-3">
              {pedido.viaje && (
                <Dato etiqueta="Flete programado">
                  <Link href={`/portal/fletes/${pedido.viaje.id}`} className={claseLink}>
                    {numeroViaje(pedido.viaje.numero)}
                  </Link>
                </Dato>
              )}
              {pedido.envio && (
                <Dato etiqueta="Código de seguimiento">
                  <Link href={`/portal/envios/${pedido.envio.id}`} className={claseLink}>
                    {pedido.envio.codigo}
                  </Link>
                </Dato>
              )}
              <Dato etiqueta="Aceptado">{fechaHora(pedido.fechaRevision)}</Dato>
            </dl>
          )}
          {pedido.estado === "RECHAZADO" && (
            <dl className="space-y-3">
              <Dato etiqueta="Motivo">{pedido.respuesta}</Dato>
              <Dato etiqueta="Fecha">{fechaHora(pedido.fechaRevision)}</Dato>
            </dl>
          )}
          {pedido.estado === "CANCELADO" && <p className="text-sm text-stone-600">Cancelaste este pedido.</p>}
        </Tarjeta>
      </div>
    </>
  );
}
