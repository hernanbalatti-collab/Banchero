import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotonImprimir } from "@/components/boton-imprimir";
import { ComprobanteFactura } from "@/components/comprobante-factura";
import { BotonLink } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirCliente } from "@/lib/dal";

export const metadata: Metadata = { title: "Factura" };

export default async function PaginaMiFactura({ params }: PageProps<"/portal/facturas/[id]">) {
  const { clienteId } = await requerirCliente();
  const { id } = await params;
  // Buscar por id y cliente: una factura de otro cliente da "no encontrado"
  const factura = await db.factura.findFirst({
    where: { id, clienteId, estado: { not: "ANULADA" } },
    include: { cliente: true, viajes: { orderBy: { numero: "asc" } } },
  });
  if (!factura) notFound();

  return (
    <>
      <div className="no-imprimir mb-6 flex flex-wrap items-center justify-between gap-3">
        <BotonLink href="/portal/facturas" variante="secundario">
          Volver
        </BotonLink>
        <BotonImprimir />
      </div>
      <ComprobanteFactura factura={factura} />
    </>
  );
}
