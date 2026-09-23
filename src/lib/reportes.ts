import "server-only";
import { db } from "@/lib/db";
import { aNumero } from "@/lib/format";
import type { TipoGasto } from "@/generated/prisma/enums";

export type Fila = { clave: string; nombre: string; viajes: number; km: number; ingresos: number; gastos: number };

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function claveMes(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function acumular(mapa: Map<string, Fila>, clave: string, nombre: string, v: { km: number; ingresos: number; gastos: number }) {
  const f = mapa.get(clave) ?? { clave, nombre, viajes: 0, km: 0, ingresos: 0, gastos: 0 };
  f.viajes += 1;
  f.km += v.km;
  f.ingresos += v.ingresos;
  f.gastos += v.gastos;
  mapa.set(clave, f);
}

const porIngresos = (m: Map<string, Fila>) => [...m.values()].sort((a, b) => b.ingresos - a.ingresos);

/**
 * Resultado de los viajes ENTREGADOS en el período (por fecha de entrega).
 * Los gastos se imputan al viaje, así el margen es por viaje entregado.
 */
export async function reporte(desde: Date, hasta: Date) {
  const viajes = await db.viaje.findMany({
    where: { estado: "ENTREGADO", fechaEntrega: { gte: desde, lte: hasta } },
    include: {
      cliente: { select: { id: true, razonSocial: true } },
      chofer: { select: { id: true, nombre: true, apellido: true } },
      vehiculo: { select: { id: true, patente: true } },
      gastos: { select: { tipo: true, monto: true } },
      envios: { where: { estado: { not: "CANCELADO" } }, select: { precio: true } },
    },
  });

  // Todos los meses del rango, aunque no tengan viajes
  const meses = new Map<string, { mes: string; ingresos: number; gastos: number }>();
  for (let d = new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), 1)); d <= hasta; d.setUTCMonth(d.getUTCMonth() + 1)) {
    meses.set(claveMes(d), { mes: `${MESES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`, ingresos: 0, gastos: 0 });
  }

  const clientes = new Map<string, Fila>();
  const vehiculos = new Map<string, Fila>();
  const choferes = new Map<string, Fila>();
  const gastosPorTipo = new Map<TipoGasto, number>();
  const total = { viajes: viajes.length, km: 0, ingresos: 0, gastos: 0 };

  for (const v of viajes) {
    const gastos = v.gastos.reduce((s, g) => s + aNumero(g.monto), 0);
    // En viajes entre depósitos el ingreso son las encomiendas que llevó
    const ingresos = aNumero(v.tarifa) + v.envios.reduce((s, e) => s + aNumero(e.precio), 0);
    const valores = { km: v.kmEstimados ?? 0, ingresos, gastos };
    total.km += valores.km;
    total.ingresos += valores.ingresos;
    total.gastos += gastos;
    for (const g of v.gastos) gastosPorTipo.set(g.tipo, (gastosPorTipo.get(g.tipo) ?? 0) + aNumero(g.monto));

    const mes = meses.get(claveMes(v.fechaEntrega!));
    if (mes) {
      mes.ingresos += valores.ingresos;
      mes.gastos += gastos;
    }
    if (v.cliente) acumular(clientes, v.cliente.id, v.cliente.razonSocial, valores);
    else acumular(clientes, "_depositos", "Encomiendas entre depósitos", valores);
    if (v.vehiculo) acumular(vehiculos, v.vehiculo.id, v.vehiculo.patente, valores);
    if (v.chofer) acumular(choferes, v.chofer.id, `${v.chofer.apellido}, ${v.chofer.nombre}`, valores);
  }

  return {
    total,
    mensual: [...meses.values()],
    clientes: porIngresos(clientes),
    vehiculos: porIngresos(vehiculos),
    choferes: porIngresos(choferes),
    gastosPorTipo: [...gastosPorTipo.entries()].sort((a, b) => b[1] - a[1]),
  };
}
