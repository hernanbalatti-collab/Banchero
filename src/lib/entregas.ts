import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hoy } from "@/lib/format";

export type FiltrosEntregas = { desde: Date; hasta: Date; deposito: string; q: string };

type Params = Record<string, string | string[] | undefined>;

function leerFecha(v: string | string[] | undefined) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null;
}

/** Filtros desde la querystring. Por defecto: el mes en curso. */
export function leerFiltros(sp: Params): FiltrosEntregas {
  const h = hoy();
  return {
    desde: leerFecha(sp.desde) ?? new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 1)),
    hasta: leerFecha(sp.hasta) ?? h,
    deposito: typeof sp.deposito === "string" ? sp.deposito : "",
    q: typeof sp.q === "string" ? sp.q.trim() : "",
  };
}

const HORA = 3600_000;

/** Envíos entregados en el período (días completos, hora de Argentina). */
export async function buscarEntregas(f: FiltrosEntregas, limite?: number) {
  const where: Prisma.EnvioWhereInput = {
    estado: "ENTREGADO",
    // Medianoche argentina = 03:00 UTC
    fechaEntrega: { gte: new Date(f.desde.getTime() + 3 * HORA), lt: new Date(f.hasta.getTime() + 27 * HORA) },
    ...(f.deposito && { depositoDestinoId: f.deposito }),
    ...(f.q && {
      OR: [
        { codigo: { contains: f.q.toUpperCase() } },
        { destinatarioNombre: { contains: f.q } },
        { recibidoPor: { contains: f.q } },
        { recibidoDni: { contains: f.q.replace(/\D/g, "") || f.q } },
        { entregadoPor: { contains: f.q } },
        { cliente: { razonSocial: { contains: f.q } } },
      ],
    }),
  };

  const [entregas, total] = await Promise.all([
    db.envio.findMany({
      where,
      orderBy: { fechaEntrega: "desc" },
      take: limite,
      include: {
        cliente: { select: { razonSocial: true } },
        depositoOrigen: { select: { nombre: true } },
        depositoDestino: { select: { nombre: true } },
        eventos: {
          where: { estado: "ENTREGADO" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { usuario: { select: { nombre: true } } },
        },
      },
    }),
    db.envio.count({ where }),
  ]);
  return { entregas, total };
}
