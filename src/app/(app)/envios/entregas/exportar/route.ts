import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { buscarEntregas, leerFiltros } from "@/lib/entregas";
import { aInputFecha, fechaHora } from "@/lib/format";

// CSV con «;» y BOM UTF-8: así lo abre bien Excel en español
function celda(v: string | number | null | undefined) {
  const s = v == null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  await requerirUsuario(ROLES_GESTION);
  const f = leerFiltros(Object.fromEntries(new URL(req.url).searchParams));
  const { entregas } = await buscarEntregas(f);

  const encabezado = [
    "Fecha de entrega", "Código", "Remitente", "Destinatario", "Origen", "Destino", "Modalidad",
    "Dirección", "Bultos", "Entregó", "Recibió", "DNI", "Registró",
  ];
  const filas = entregas.map((e) => [
    fechaHora(e.fechaEntrega),
    e.codigo,
    e.cliente.razonSocial,
    e.destinatarioNombre,
    e.depositoOrigen.nombre,
    e.depositoDestino.nombre,
    e.entregaDomicilio ? "A domicilio" : "Retiro en depósito",
    e.direccionEntrega,
    e.bultos,
    e.entregadoPor,
    e.recibidoPor,
    e.recibidoDni,
    e.eventos[0]?.usuario?.nombre,
  ]);
  const csv = "﻿" + [encabezado, ...filas].map((fila) => fila.map(celda).join(";")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="entregas_${aInputFecha(f.desde)}_${aInputFecha(f.hasta)}.csv"`,
    },
  });
}
