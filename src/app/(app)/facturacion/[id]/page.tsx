import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { anularFactura, marcarCobrada } from "@/actions/facturacion";
import { BotonImprimir } from "@/components/boton-imprimir";
import { BotonEnviar } from "@/components/form";
import { ComprobanteFactura } from "@/components/comprobante-factura";
import { BotonLink } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";

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

      <ComprobanteFactura factura={factura} />
    </>
  );
}
