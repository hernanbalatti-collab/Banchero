import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cambiarEstadoEnvio } from "@/actions/envios";
import { BotonImprimir } from "@/components/boton-imprimir";
import { BotonEnviar, Entrada, Form } from "@/components/form";
import { BotonLink, Dato, Encabezado, Estado, Tarjeta } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { ACCION_ENVIO, transicionesEnvio } from "@/lib/envios";
import { fechaHora, moneda, numeroViaje } from "@/lib/format";
import { ESTADO_ENVIO } from "@/lib/labels";

export const metadata: Metadata = { title: "Envío" };

export default async function PaginaEnvio({ params }: PageProps<"/envios/[id]">) {
  await requerirUsuario(ROLES_GESTION);
  const { id } = await params;
  const envio = await db.envio.findUnique({
    where: { id },
    include: {
      cliente: true,
      depositoOrigen: true,
      depositoDestino: true,
      viaje: { select: { id: true, numero: true, estado: true } },
      eventos: {
        orderBy: { createdAt: "desc" },
        include: { deposito: { select: { nombre: true } }, usuario: { select: { nombre: true } } },
      },
    },
  });
  if (!envio) notFound();

  const h = await headers();
  const urlSeguimiento = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/seguimiento/${envio.codigo}`;
  const transiciones = transicionesEnvio(envio);

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
              <BotonLink href="/envios" variante="secundario">
                Volver
              </BotonLink>
              <BotonImprimir />
            </>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Comprobante para el cliente: es lo que sale al imprimir */}
          <Tarjeta titulo="Comprobante para el remitente" className="print:border-0 print:shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Código de seguimiento</p>
                <p className="mt-1 font-mono text-3xl font-semibold tracking-wider text-stone-900">{envio.codigo}</p>
                <p className="mt-3 text-sm text-stone-600">
                  Seguí tu envío en <span className="break-all font-medium text-stone-900">{urlSeguimiento}</span>
                </p>
              </div>
              <div className="text-right text-sm text-stone-600">
                <p>Recibido el {fechaHora(envio.createdAt)}</p>
                <p>en depósito {envio.depositoOrigen.nombre}</p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-1 gap-5 border-t border-stone-100 pt-5 sm:grid-cols-3">
              <Dato etiqueta="Remitente">{envio.cliente.razonSocial}</Dato>
              <Dato etiqueta="Destinatario">
                {envio.destinatarioNombre}
                {envio.destinatarioTelefono && <div className="text-xs text-stone-500">{envio.destinatarioTelefono}</div>}
              </Dato>
              <Dato etiqueta="Entrega">
                {envio.entregaDomicilio ? envio.direccionEntrega : `Retira en depósito ${envio.depositoDestino.nombre}`}
              </Dato>
              <Dato etiqueta="Contenido">{envio.descripcion}</Dato>
              <Dato etiqueta="Bultos / peso">
                {envio.bultos} {envio.pesoKg != null && `· ${envio.pesoKg} kg`}
              </Dato>
              <Dato etiqueta="Precio">
                {moneda(envio.precio)}
                {envio.valorDeclarado && <div className="text-xs text-stone-500">Valor declarado {moneda(envio.valorDeclarado)}</div>}
              </Dato>
            </dl>
          </Tarjeta>

          <Tarjeta titulo="Historial" className="no-imprimir">
            <ol className="space-y-4">
              {envio.eventos.map((ev) => (
                <li key={ev.id} className="border-l-2 border-marca-200 pl-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Estado par={ESTADO_ENVIO[ev.estado]} />
                    {ev.deposito && <span className="text-sm text-stone-700">Depósito {ev.deposito.nombre}</span>}
                    <span className="text-xs text-stone-500">{fechaHora(ev.createdAt)}</span>
                  </div>
                  {ev.nota && <p className="mt-1 text-sm text-stone-700">{ev.nota}</p>}
                  {ev.usuario && <p className="mt-0.5 text-xs text-stone-400">{ev.usuario.nombre}</p>}
                </li>
              ))}
            </ol>
          </Tarjeta>
        </div>

        <div className="no-imprimir space-y-6">
          <Tarjeta titulo="Viaje">
            {envio.viaje ? (
              <p className="text-sm">
                <Link href={`/viajes/${envio.viaje.id}`} className="font-mono font-medium text-marca-700 hover:underline">
                  {numeroViaje(envio.viaje.numero)}
                </Link>
              </p>
            ) : envio.estado === "RECIBIDO" ? (
              <p className="text-sm text-stone-600">
                Esperando viaje. Cargalo desde un viaje {envio.depositoOrigen.nombre} → {envio.depositoDestino.nombre} (sección
                «Encomiendas a bordo»).
              </p>
            ) : (
              <p className="text-sm text-stone-500">—</p>
            )}
            {envio.recibidoPor && (
              <p className="mt-3 text-sm text-stone-700">
                Recibió: <strong>{envio.recibidoPor}</strong> ({fechaHora(envio.fechaEntrega)})
              </p>
            )}
          </Tarjeta>

          {transiciones.length > 0 && (
            <Tarjeta titulo="Actualizar estado">
              <Form accion={cambiarEstadoEnvio.bind(null, envio.id)} className="space-y-4">
                {transiciones.includes("ENTREGADO") && (
                  <Entrada name="recibidoPor" etiqueta="Recibió (nombre y DNI)" ayuda="Obligatorio para registrar la entrega." />
                )}
                <Entrada name="nota" etiqueta="Nota interna" ayuda="No se muestra en el seguimiento público." />
                <div className="flex flex-wrap gap-2">
                  {transiciones.map((e) => (
                    <BotonEnviar
                      key={e}
                      name="estado"
                      value={e}
                      variante={e === "CANCELADO" ? "peligro" : e === "EN_DESTINO" ? "secundario" : "primario"}
                      confirmar={e === "CANCELADO" ? "¿Cancelar este envío?" : undefined}
                    >
                      {ACCION_ENVIO[e]}
                    </BotonEnviar>
                  ))}
                </div>
              </Form>
            </Tarjeta>
          )}
        </div>
      </div>
    </>
  );
}
