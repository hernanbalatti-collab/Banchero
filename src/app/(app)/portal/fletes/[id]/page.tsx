import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonLink, Dato, Encabezado, Estado, Tarjeta } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirCliente } from "@/lib/dal";
import { fecha, fechaHora, moneda, numero, numeroFactura, numeroViaje } from "@/lib/format";
import { ESTADO_VIAJE } from "@/lib/labels";

export const metadata: Metadata = { title: "Flete" };

export default async function PaginaMiFlete({ params }: PageProps<"/portal/fletes/[id]">) {
  const { clienteId } = await requerirCliente();
  const { id } = await params;
  // Buscar por id y cliente: un viaje de otro cliente (o entre depósitos) da "no encontrado".
  // Sin gastos, margen, chofer ni notas internas.
  const viaje = await db.viaje.findFirst({
    where: { id, clienteId },
    include: {
      factura: { select: { id: true, tipo: true, puntoVenta: true, numero: true } },
      eventos: {
        where: { OR: [{ estado: { not: null } }, { ubicacion: { not: null } }] },
        orderBy: { createdAt: "desc" },
        select: { id: true, estado: true, ubicacion: true, createdAt: true },
      },
    },
  });
  if (!viaje) notFound();

  return (
    <>
      <Encabezado
        titulo={
          <span className="flex items-center gap-3">
            Flete {numeroViaje(viaje.numero)} <Estado par={ESTADO_VIAJE[viaje.estado]} />
          </span>
        }
        subtitulo={`${viaje.origen} → ${viaje.destino}`}
        acciones={
          <BotonLink href="/portal/fletes" variante="secundario">
            Volver
          </BotonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Datos del flete" className="lg:col-span-2">
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Dato etiqueta="Fecha de carga">{fecha(viaje.fechaCarga)}</Dato>
            <Dato etiqueta="Entrega">
              {viaje.fechaEntrega ? fecha(viaje.fechaEntrega) : `Estimada ${fecha(viaje.fechaEntregaEstimada)}`}
            </Dato>
            <Dato etiqueta="Tarifa (sin IVA)">{moneda(viaje.tarifa)}</Dato>
            <Dato etiqueta="Carga">{viaje.descripcionCarga}</Dato>
            <Dato etiqueta="Peso">{viaje.pesoKg ? `${numero(viaje.pesoKg)} kg` : "—"}</Dato>
            <Dato etiqueta="Carta de porte / remito">
              {[viaje.cartaPorte, viaje.remito].filter(Boolean).join(" · ") || "—"}
            </Dato>
            <Dato etiqueta="Factura">
              {viaje.factura ? (
                <Link href={`/portal/facturas/${viaje.factura.id}`} className="font-mono text-marca-700 hover:underline">
                  {numeroFactura(viaje.factura)}
                </Link>
              ) : (
                "—"
              )}
            </Dato>
          </dl>
        </Tarjeta>

        <Tarjeta titulo="Seguimiento">
          <ol className="space-y-4">
            {viaje.eventos.map((ev) => (
              <li key={ev.id} className="border-l-2 border-marca-200 pl-4">
                <div className="flex flex-wrap items-center gap-2">
                  {ev.estado && <Estado par={ESTADO_VIAJE[ev.estado]} />}
                  <span className="text-xs text-stone-500">{fechaHora(ev.createdAt)}</span>
                </div>
                {ev.ubicacion && <p className="mt-1 text-sm font-medium text-stone-800">📍 {ev.ubicacion}</p>}
              </li>
            ))}
          </ol>
        </Tarjeta>
      </div>
    </>
  );
}
