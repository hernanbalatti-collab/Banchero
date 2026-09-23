import type { Metadata } from "next";
import Link from "next/link";
import { BotonLink, claseInput, Encabezado, Estado, Filtros, Kpi, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { EstadoFactura } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { fecha, hoy, moneda, numeroFactura } from "@/lib/format";
import { ESTADO_FACTURA, opciones } from "@/lib/labels";

export const metadata: Metadata = { title: "Facturación" };

export default async function PaginaFacturacion({ searchParams }: PageProps<"/facturacion">) {
  await requerirUsuario(ROLES_GESTION);
  const { estado } = await searchParams;
  const filtroEstado = Object.values(EstadoFactura).find((e) => e === estado);

  const [facturas, pendiente, vencido, sinFacturar] = await Promise.all([
    db.factura.findMany({
      where: { estado: filtroEstado },
      orderBy: [{ fecha: "desc" }, { numero: "desc" }],
      take: 100,
      include: { cliente: { select: { razonSocial: true } }, _count: { select: { viajes: true } } },
    }),
    db.factura.aggregate({ where: { estado: "EMITIDA" }, _sum: { total: true }, _count: true }),
    db.factura.aggregate({ where: { estado: "EMITIDA", vencimiento: { lt: hoy() } }, _sum: { total: true }, _count: true }),
    db.viaje.aggregate({ where: { estado: "ENTREGADO", facturaId: null }, _sum: { tarifa: true }, _count: true }),
  ]);

  return (
    <>
      <Encabezado
        titulo="Facturación"
        subtitulo="Comprobantes internos por viajes entregados"
        acciones={<BotonLink href="/facturacion/nueva">Nueva factura</BotonLink>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kpi
          etiqueta="Viajes entregados sin facturar"
          valor={moneda(sinFacturar._sum.tarifa)}
          detalle={`${sinFacturar._count} viaje${sinFacturar._count === 1 ? "" : "s"} (sin IVA)`}
          href="/facturacion/nueva"
        />
        <Kpi etiqueta="Pendiente de cobro" valor={moneda(pendiente._sum.total)} detalle={`${pendiente._count} factura(s)`} />
        <Kpi etiqueta="Vencido" valor={moneda(vencido._sum.total)} detalle={`${vencido._count} factura(s) con vencimiento pasado`} />
      </div>
      <Tarjeta sinPadding>
        <Filtros>
          <select name="estado" defaultValue={filtroEstado ?? ""} className={`${claseInput} max-w-56`}>
            <option value="">Todos los estados</option>
            {opciones(ESTADO_FACTURA).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </Filtros>
        {facturas.length === 0 ? (
          <Vacio>No hay facturas.</Vacio>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th>Número</Th>
                <Th>Fecha</Th>
                <Th>Cliente</Th>
                <Th derecha>Viajes</Th>
                <Th>Vencimiento</Th>
                <Th>Estado</Th>
                <Th derecha>Total</Th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <tr key={f.id} className="hover:bg-stone-50">
                  <Td>
                    <Link href={`/facturacion/${f.id}`} className="font-mono font-medium text-marca-700 hover:text-marca-900">
                      {numeroFactura(f)}
                    </Link>
                  </Td>
                  <Td className="tabular-nums">{fecha(f.fecha)}</Td>
                  <Td className="font-medium text-stone-900">{f.cliente.razonSocial}</Td>
                  <Td derecha>{f._count.viajes}</Td>
                  <Td className="tabular-nums">
                    {fecha(f.vencimiento)}
                    {f.estado === "EMITIDA" && f.vencimiento && f.vencimiento < hoy() && (
                      <span className="ml-2 text-xs font-medium text-red-600">Vencida</span>
                    )}
                  </Td>
                  <Td>
                    <Estado par={ESTADO_FACTURA[f.estado]} />
                  </Td>
                  <Td derecha className="font-medium">
                    {moneda(f.total)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Tarjeta>
    </>
  );
}
