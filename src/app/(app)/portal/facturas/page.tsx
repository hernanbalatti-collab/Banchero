import type { Metadata } from "next";
import { Encabezado, Kpi, Tarjeta, Vacio } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirCliente } from "@/lib/dal";
import { hoy, moneda } from "@/lib/format";
import { TablaFacturasCliente } from "../tablas";

export const metadata: Metadata = { title: "Mis facturas" };

export default async function PaginaMisFacturas() {
  const { clienteId } = await requerirCliente();
  // Las anuladas no se muestran: no tienen importe ni viajes
  const [facturas, pendiente, vencido] = await Promise.all([
    db.factura.findMany({
      where: { clienteId, estado: { not: "ANULADA" } },
      orderBy: [{ fecha: "desc" }, { numero: "desc" }],
      take: 100,
    }),
    db.factura.aggregate({ where: { clienteId, estado: "EMITIDA" }, _sum: { total: true }, _count: true }),
    db.factura.aggregate({ where: { clienteId, estado: "EMITIDA", vencimiento: { lt: hoy() } }, _sum: { total: true }, _count: true }),
  ]);

  return (
    <>
      <Encabezado titulo="Mis facturas" subtitulo="Comprobantes de los fletes realizados" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Kpi etiqueta="Pendiente de pago" valor={moneda(pendiente._sum.total)} detalle={`${pendiente._count} factura(s)`} />
        <Kpi etiqueta="Vencido" valor={moneda(vencido._sum.total)} detalle={`${vencido._count} factura(s) con vencimiento pasado`} />
      </div>
      <Tarjeta sinPadding>
        {facturas.length === 0 ? <Vacio>Todavía no hay facturas.</Vacio> : <TablaFacturasCliente facturas={facturas} />}
      </Tarjeta>
    </>
  );
}
