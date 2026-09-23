import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { anularFactura, marcarCobrada } from "@/actions/facturacion";
import { BotonImprimir } from "@/components/boton-imprimir";
import { BotonEnviar } from "@/components/form";
import { BotonLink, Estado, Tabla, Td, Th } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { fecha, moneda, numeroFactura, numeroViaje } from "@/lib/format";
import { CONDICION_IVA, ESTADO_FACTURA } from "@/lib/labels";

export const metadata: Metadata = { title: "Factura" };

export default async function PaginaFactura({ params }: PageProps<"/facturacion/[id]">) {
  await requerirUsuario(ROLES_GESTION);
  const { id } = await params;
  const factura = await db.factura.findUnique({
    where: { id },
    include: { cliente: true, viajes: { orderBy: { numero: "asc" } } },
  });
  if (!factura) notFound();

  return (
    <>
      <div className="no-imprimir mb-6 flex flex-wrap items-center justify-between gap-3">
        <BotonLink href="/facturacion" variante="secundario">
          Volver
        </BotonLink>
        <div className="flex flex-wrap gap-2">
          <BotonImprimir />
          {factura.estado === "EMITIDA" && (
            <form action={marcarCobrada.bind(null, factura.id)}>
              <BotonEnviar>Marcar como cobrada</BotonEnviar>
            </form>
          )}
          {factura.estado !== "ANULADA" && (
            <form action={anularFactura.bind(null, factura.id)}>
              <BotonEnviar variante="peligro" confirmar="¿Anular la factura? Sus viajes quedarán libres para volver a facturarse.">
                Anular
              </BotonEnviar>
            </form>
          )}
        </div>
      </div>

      <article className="mx-auto max-w-4xl rounded-xl border border-stone-200 bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-stone-200 pb-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-stone-500">Factura {factura.tipo}</p>
            <h1 className="mt-1 font-mono text-2xl font-semibold text-stone-900">{numeroFactura(factura)}</h1>
            <p className="mt-2 text-sm text-stone-600">
              Emitida el {fecha(factura.fecha)}
              {factura.vencimiento && ` · Vence el ${fecha(factura.vencimiento)}`}
            </p>
          </div>
          <div className="text-right">
            <Estado par={ESTADO_FACTURA[factura.estado]} />
            {factura.fechaPago && <p className="mt-2 text-sm text-stone-600">Cobrada el {fecha(factura.fechaPago)}</p>}
          </div>
        </header>

        <section className="grid gap-1 border-b border-stone-200 py-6 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Cliente</p>
          <p className="text-base font-semibold text-stone-900">{factura.cliente.razonSocial}</p>
          <p className="text-stone-600">
            CUIT {factura.cliente.cuit} · {CONDICION_IVA[factura.cliente.condicionIva]}
          </p>
          {factura.cliente.direccion && <p className="text-stone-600">{factura.cliente.direccion}</p>}
        </section>

        {factura.viajes.length > 0 ? (
          <div className="-mx-8 print:mx-0">
            <Tabla>
              <thead>
                <tr>
                  <Th>Viaje</Th>
                  <Th>Fecha</Th>
                  <Th>Detalle</Th>
                  <Th derecha>Importe</Th>
                </tr>
              </thead>
              <tbody>
                {factura.viajes.map((v) => (
                  <tr key={v.id}>
                    <Td className="font-mono">{numeroViaje(v.numero)}</Td>
                    <Td className="tabular-nums">{fecha(v.fechaEntrega ?? v.fechaCarga)}</Td>
                    <Td>
                      Flete {v.origen} → {v.destino}
                      <div className="text-xs text-stone-500">
                        {v.descripcionCarga}
                        {v.cartaPorte && ` · CP ${v.cartaPorte}`}
                        {v.remito && ` · Remito ${v.remito}`}
                      </div>
                    </Td>
                    <Td derecha>{moneda(v.tarifa)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </div>
        ) : (
          <p className="py-6 text-sm text-stone-500">Factura anulada: sus viajes fueron liberados.</p>
        )}

        <dl className="ml-auto mt-6 max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-500">Subtotal</dt>
            <dd className="tabular-nums">{moneda(factura.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">IVA 21 %</dt>
            <dd className="tabular-nums">{moneda(factura.iva)}</dd>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{moneda(factura.total)}</dd>
          </div>
        </dl>

        <p className="mt-10 text-xs text-stone-400">
          Comprobante interno sin validez fiscal. La factura electrónica se emite por separado ante ARCA.
        </p>
      </article>
    </>
  );
}
