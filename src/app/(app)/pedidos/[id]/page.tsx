import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { rechazarPedido } from "@/actions/pedidos";
import { AreaTexto, BotonEnviar, Form } from "@/components/form";
import { DatosPedido, INCLUDE_PEDIDO } from "@/components/pedidos";
import { BotonLink, Dato, Encabezado, Estado, Tarjeta } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { fechaHora, numeroPedido, numeroViaje } from "@/lib/format";
import { ESTADO_PEDIDO, TIPO_PEDIDO } from "@/lib/labels";

export const metadata: Metadata = { title: "Pedido" };

const claseLink = "font-mono font-medium text-marca-700 hover:text-marca-900";

export default async function PaginaPedido({ params }: PageProps<"/pedidos/[id]">) {
  await requerirUsuario(ROLES_GESTION);
  const { id } = await params;
  const pedido = await db.pedido.findUnique({
    where: { id },
    include: {
      ...INCLUDE_PEDIDO,
      cliente: { select: { id: true, razonSocial: true, telefono: true, email: true } },
      creadoPor: { select: { nombre: true, email: true } },
      revisadoPor: { select: { nombre: true } },
      viaje: { select: { id: true, numero: true } },
      envio: { select: { id: true, codigo: true } },
    },
  });
  if (!pedido) notFound();
  const esFlete = pedido.tipo === "FLETE";

  return (
    <>
      <Encabezado
        titulo={
          <span className="flex items-center gap-3">
            {TIPO_PEDIDO[pedido.tipo]} <span className="font-mono">{numeroPedido(pedido.numero)}</span>
            <Estado par={ESTADO_PEDIDO[pedido.estado]} />
          </span>
        }
        subtitulo={
          <>
            <Link href={`/clientes/${pedido.cliente.id}`} className="font-medium text-marca-700 hover:text-marca-900">
              {pedido.cliente.razonSocial}
            </Link>{" "}
            · cargado por {pedido.creadoPor.nombre} el {fechaHora(pedido.createdAt)}
          </>
        }
        acciones={
          <>
            <BotonLink href="/pedidos" variante="secundario">
              Volver
            </BotonLink>
            {pedido.estado === "PENDIENTE" && (
              <BotonLink href={esFlete ? `/viajes/nuevo?pedido=${pedido.id}` : `/envios/nuevo?pedido=${pedido.id}`}>
                {esFlete ? "Crear viaje" : "Recibir en depósito"}
              </BotonLink>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Pedido" className="lg:col-span-2">
          <DatosPedido pedido={pedido} />
        </Tarjeta>

        <div className="space-y-6">
          <Tarjeta titulo="Contacto del cliente">
            <dl className="space-y-3">
              <Dato etiqueta="Usuario">{pedido.creadoPor.email}</Dato>
              <Dato etiqueta="Teléfono">{pedido.cliente.telefono}</Dato>
              <Dato etiqueta="Email">{pedido.cliente.email}</Dato>
            </dl>
          </Tarjeta>

          {pedido.estado === "PENDIENTE" ? (
            <>
              <Tarjeta titulo="Aceptar">
                <p className="text-sm text-stone-600">
                  {esFlete
                    ? "«Crear viaje» abre el alta de viaje con los datos del pedido: completá tarifa, chofer y vehículo."
                    : "Cuando el cliente traiga la encomienda, «Recibir en depósito» abre el alta del envío con estos datos: controlalos, poné el precio y se genera el código de seguimiento."}
                </p>
              </Tarjeta>
              <Tarjeta titulo="Rechazar">
                <Form accion={rechazarPedido.bind(null, pedido.id)}>
                  <AreaTexto name="respuesta" etiqueta="Motivo (lo ve el cliente) *" filas={3} />
                  <BotonEnviar variante="peligro" confirmar="¿Rechazar el pedido?">
                    Rechazar pedido
                  </BotonEnviar>
                </Form>
              </Tarjeta>
            </>
          ) : (
            <Tarjeta titulo="Resolución">
              <dl className="space-y-3">
                {pedido.viaje && (
                  <Dato etiqueta="Viaje">
                    <Link href={`/viajes/${pedido.viaje.id}`} className={claseLink}>
                      {numeroViaje(pedido.viaje.numero)}
                    </Link>
                  </Dato>
                )}
                {pedido.envio && (
                  <Dato etiqueta="Envío">
                    <Link href={`/envios/${pedido.envio.id}`} className={claseLink}>
                      {pedido.envio.codigo}
                    </Link>
                  </Dato>
                )}
                {pedido.respuesta && <Dato etiqueta="Motivo">{pedido.respuesta}</Dato>}
                {pedido.revisadoPor ? (
                  <Dato etiqueta="Revisó">
                    {pedido.revisadoPor.nombre} · {fechaHora(pedido.fechaRevision)}
                  </Dato>
                ) : (
                  pedido.estado === "CANCELADO" && <Dato etiqueta="Cancelado">Por el cliente · {fechaHora(pedido.updatedAt)}</Dato>
                )}
              </dl>
            </Tarjeta>
          )}
        </div>
      </div>
    </>
  );
}
