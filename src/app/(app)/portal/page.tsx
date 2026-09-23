import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado, Kpi, Tarjeta, Vacio } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirCliente } from "@/lib/dal";
import { moneda } from "@/lib/format";
import { ESTADOS_ACTIVOS } from "@/lib/viajes";
import { ENVIOS_ACTIVOS, INCLUDE_ENVIO } from "./consultas";
import { TablaEnviosCliente, TablaFacturasCliente, TablaFletesCliente } from "./tablas";

export const metadata: Metadata = { title: "Inicio" };

function VerTodos({ href }: { href: string }) {
  return (
    <Link href={href} className="text-sm font-medium text-marca-700 hover:text-marca-900">
      Ver todos
    </Link>
  );
}

export default async function PaginaPortal() {
  const { nombre, clienteId } = await requerirCliente();

  const [cliente, envios, fletes, facturas, pendiente] = await Promise.all([
    db.cliente.findUniqueOrThrow({ where: { id: clienteId }, select: { razonSocial: true } }),
    db.envio.findMany({
      where: { clienteId, estado: { in: ENVIOS_ACTIVOS } },
      orderBy: { createdAt: "desc" },
      include: INCLUDE_ENVIO,
    }),
    db.viaje.findMany({ where: { clienteId, estado: { in: ESTADOS_ACTIVOS } }, orderBy: { fechaCarga: "asc" } }),
    db.factura.findMany({ where: { clienteId, estado: "EMITIDA" }, orderBy: { fecha: "asc" } }),
    db.factura.aggregate({ where: { clienteId, estado: "EMITIDA" }, _sum: { total: true } }),
  ]);

  return (
    <>
      <Encabezado titulo={`Hola, ${nombre.split(" ")[0]}`} subtitulo={cliente.razonSocial} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kpi etiqueta="Envíos en curso" valor={envios.length} detalle="Todavía no entregados" href="/portal/envios" />
        <Kpi etiqueta="Fletes en curso" valor={fletes.length} detalle="Programados o en viaje" href="/portal/fletes" />
        <Kpi
          etiqueta="Pendiente de pago"
          valor={moneda(pendiente._sum.total)}
          detalle={`${facturas.length} factura${facturas.length === 1 ? "" : "s"}`}
          href="/portal/facturas"
        />
      </div>

      <div className="space-y-6">
        <Tarjeta titulo="Envíos en curso" acciones={<VerTodos href="/portal/envios?estado=TODOS" />} sinPadding>
          {envios.length === 0 ? <Vacio>No tenés envíos en curso.</Vacio> : <TablaEnviosCliente envios={envios} />}
        </Tarjeta>
        {fletes.length > 0 && (
          <Tarjeta titulo="Fletes en curso" acciones={<VerTodos href="/portal/fletes" />} sinPadding>
            <TablaFletesCliente fletes={fletes} />
          </Tarjeta>
        )}
        {facturas.length > 0 && (
          <Tarjeta titulo="Facturas pendientes de pago" acciones={<VerTodos href="/portal/facturas" />} sinPadding>
            <TablaFacturasCliente facturas={facturas} />
          </Tarjeta>
        )}
      </div>
    </>
  );
}
