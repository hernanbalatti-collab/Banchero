import type { Metadata } from "next";
import { Encabezado, Tarjeta, Vacio } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirCliente } from "@/lib/dal";
import { ESTADOS_ACTIVOS } from "@/lib/viajes";
import { TablaFletesCliente } from "../tablas";

export const metadata: Metadata = { title: "Mis fletes" };

export default async function PaginaMisFletes() {
  const { clienteId } = await requerirCliente();
  const [activos, finalizados] = await Promise.all([
    db.viaje.findMany({ where: { clienteId, estado: { in: ESTADOS_ACTIVOS } }, orderBy: { fechaCarga: "asc" } }),
    db.viaje.findMany({
      where: { clienteId, estado: { in: ["ENTREGADO", "CANCELADO"] } },
      orderBy: { fechaCarga: "desc" },
      take: 100,
    }),
  ]);

  return (
    <>
      <Encabezado titulo="Mis fletes" subtitulo="Viajes contratados con Expreso Banchero" />
      <div className="space-y-6">
        <Tarjeta titulo="En curso" sinPadding>
          {activos.length === 0 ? <Vacio>No tenés fletes en curso.</Vacio> : <TablaFletesCliente fletes={activos} />}
        </Tarjeta>
        <Tarjeta titulo="Finalizados" sinPadding>
          {finalizados.length === 0 ? <Vacio>Todavía no hay fletes finalizados.</Vacio> : <TablaFletesCliente fletes={finalizados} />}
        </Tarjeta>
      </div>
    </>
  );
}
