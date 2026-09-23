import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TablaViajes } from "@/components/tabla-viajes";
import { BotonLink, Encabezado, Kpi, Tarjeta, Vacio } from "@/components/ui";
import { DIAS_AVISO_VENCIMIENTO, Vencimiento } from "@/components/vencimiento";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/dal";
import { aNumero, hoy, moneda, sumarDias } from "@/lib/format";

export const metadata: Metadata = { title: "Panel" };

type Alerta = { id: string; href: string; quien: string; que: string; vence: Date };

export default async function PaginaPanel() {
  const usuario = await requerirUsuario();
  if (usuario.rol === "CHOFER") redirect("/mis-viajes");

  const h = hoy();
  const inicioMes = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 1));
  const limite = sumarDias(h, DIAS_AVISO_VENCIMIENTO);
  const porVencer = { lte: limite };

  const [enTransito, pendientes, entregadosMes, encomiendasMes, porCobrar, activos, vehiculos, choferes, depositos, enviosPorEstado] = await Promise.all([
    db.viaje.count({ where: { estado: "EN_TRANSITO" } }),
    db.viaje.count({ where: { estado: "PENDIENTE" } }),
    db.viaje.aggregate({ where: { estado: "ENTREGADO", fechaEntrega: { gte: inicioMes } }, _sum: { tarifa: true }, _count: true }),
    // Igual que en Reportes: los viajes entre depósitos facturan por encomienda
    db.envio.aggregate({
      where: { estado: { not: "CANCELADO" }, viaje: { estado: "ENTREGADO", fechaEntrega: { gte: inicioMes } } },
      _sum: { precio: true },
    }),
    db.factura.aggregate({ where: { estado: "EMITIDA" }, _sum: { total: true }, _count: true }),
    db.viaje.findMany({
      where: { estado: { in: ["PENDIENTE", "ASIGNADO", "EN_TRANSITO"] } },
      orderBy: [{ fechaCarga: "asc" }],
      take: 10,
      include: {
        cliente: { select: { razonSocial: true } },
        chofer: { select: { nombre: true, apellido: true } },
        vehiculo: { select: { patente: true } },
      },
    }),
    db.vehiculo.findMany({
      where: { estado: { not: "BAJA" }, OR: [{ vencimientoVtv: porVencer }, { vencimientoSeguro: porVencer }] },
    }),
    db.chofer.findMany({
      where: { activo: true, OR: [{ vencimientoLicencia: porVencer }, { vencimientoLinti: porVencer }] },
    }),
    db.deposito.findMany({ orderBy: { nombre: "desc" } }),
    db.envio.groupBy({
      by: ["estado", "depositoOrigenId", "depositoDestinoId"],
      where: { estado: { in: ["RECIBIDO", "EN_TRANSITO", "EN_DESTINO", "EN_REPARTO"] } },
      _count: true,
    }),
  ]);

  const contar = (filtro: (g: (typeof enviosPorEstado)[number]) => boolean) =>
    enviosPorEstado.filter(filtro).reduce((s, g) => s + g._count, 0);

  const alertas: Alerta[] = [];
  const agregar = (id: string, href: string, quien: string, que: string, vence: Date | null) => {
    if (vence && vence <= limite) alertas.push({ id: `${id}-${que}`, href, quien, que, vence });
  };
  for (const v of vehiculos) {
    agregar(v.id, `/flota/vehiculos/${v.id}`, v.patente, "VTV / RTO", v.vencimientoVtv);
    agregar(v.id, `/flota/vehiculos/${v.id}`, v.patente, "Seguro", v.vencimientoSeguro);
  }
  for (const c of choferes) {
    agregar(c.id, `/flota/choferes/${c.id}`, `${c.apellido}, ${c.nombre}`, "Licencia", c.vencimientoLicencia);
    agregar(c.id, `/flota/choferes/${c.id}`, `${c.apellido}, ${c.nombre}`, "LiNTI", c.vencimientoLinti);
  }
  alertas.sort((a, b) => a.vence.getTime() - b.vence.getTime());

  return (
    <>
      <Encabezado
        titulo={`Hola, ${usuario.nombre.split(" ")[0]}`}
        subtitulo="Resumen de la operación"
        acciones={<BotonLink href="/viajes/nuevo">Nuevo viaje</BotonLink>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi etiqueta="En tránsito" valor={enTransito} detalle="Viajes en ruta ahora" href="/viajes?estado=EN_TRANSITO" />
        <Kpi etiqueta="Sin asignar" valor={pendientes} detalle="Esperan chofer y vehículo" href="/viajes?estado=PENDIENTE" />
        <Kpi
          etiqueta="Entregado este mes"
          valor={moneda(aNumero(entregadosMes._sum.tarifa) + aNumero(encomiendasMes._sum.precio))}
          detalle={`${entregadosMes._count} viaje${entregadosMes._count === 1 ? "" : "s"}, sin IVA`}
          href="/reportes"
        />
        <Kpi
          etiqueta="Por cobrar"
          valor={moneda(porCobrar._sum.total)}
          detalle={`${porCobrar._count} factura${porCobrar._count === 1 ? "" : "s"} emitida${porCobrar._count === 1 ? "" : "s"}`}
          href="/facturacion?estado=EMITIDA"
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {depositos.map((d) => (
          <Kpi
            key={d.id}
            etiqueta={`Depósito ${d.nombre}`}
            valor={contar((g) => g.estado === "RECIBIDO" && g.depositoOrigenId === d.id) + contar((g) => g.estado === "EN_DESTINO" && g.depositoDestinoId === d.id)}
            detalle={`${contar((g) => g.estado === "RECIBIDO" && g.depositoOrigenId === d.id)} por despachar · ${contar(
              (g) => g.estado === "EN_DESTINO" && g.depositoDestinoId === d.id,
            )} para entregar`}
            href={`/depositos?deposito=${d.id}`}
          />
        ))}
        <Kpi
          etiqueta="Encomiendas en camino"
          valor={contar((g) => g.estado === "EN_TRANSITO" || g.estado === "EN_REPARTO")}
          detalle={`${contar((g) => g.estado === "EN_REPARTO")} en reparto a domicilio`}
          href="/envios"
        />
      </div>

      <div className="grid gap-6 2xl:grid-cols-3">
        <Tarjeta
          titulo="Viajes activos"
          acciones={
            <Link href="/viajes" className="text-sm font-medium text-marca-700 hover:text-marca-900">
              Ver todos
            </Link>
          }
          sinPadding
          className="2xl:col-span-2"
        >
          {activos.length === 0 ? <Vacio>No hay viajes activos.</Vacio> : <TablaViajes viajes={activos} />}
        </Tarjeta>

        <Tarjeta titulo={`Vencimientos (próximos ${DIAS_AVISO_VENCIMIENTO} días)`} sinPadding>
          {alertas.length === 0 ? (
            <Vacio>Todo al día.</Vacio>
          ) : (
            <ul className="divide-y divide-stone-100">
              {alertas.map((a) => (
                <li key={a.id}>
                  <Link href={a.href} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-stone-50">
                    <span>
                      <span className="block text-sm font-medium text-stone-900">{a.quien}</span>
                      <span className="text-xs text-stone-500">{a.que}</span>
                    </span>
                    <span className="text-sm">
                      <Vencimiento d={a.vence} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
