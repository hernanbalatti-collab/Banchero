import type { Metadata } from "next";
import { Encabezado, Tarjeta, Vacio } from "@/components/ui";
import { TablaViajes } from "@/components/tabla-viajes";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/dal";
import { ESTADOS_ACTIVOS } from "@/lib/viajes";

export const metadata: Metadata = { title: "Mis viajes" };

const INCLUDE = {
  cliente: { select: { razonSocial: true } },
  chofer: { select: { nombre: true, apellido: true } },
  vehiculo: { select: { patente: true } },
} as const;

export default async function PaginaMisViajes() {
  const usuario = await requerirUsuario(["CHOFER"]);

  if (!usuario.choferId) {
    return (
      <>
        <Encabezado titulo="Mis viajes" />
        <Tarjeta>
          <p className="text-sm text-stone-600">
            Tu usuario todavía no está vinculado a un legajo de chofer. Pedile a un administrador que lo vincule.
          </p>
        </Tarjeta>
      </>
    );
  }

  const [activos, recientes] = await Promise.all([
    db.viaje.findMany({
      where: { choferId: usuario.choferId, estado: { in: ESTADOS_ACTIVOS } },
      orderBy: { fechaCarga: "asc" },
      include: INCLUDE,
    }),
    db.viaje.findMany({
      where: { choferId: usuario.choferId, estado: { in: ["ENTREGADO", "CANCELADO"] } },
      orderBy: { fechaCarga: "desc" },
      take: 10,
      include: INCLUDE,
    }),
  ]);

  return (
    <>
      <Encabezado titulo="Mis viajes" subtitulo={`Hola, ${usuario.nombre}`} />
      <div className="space-y-6">
        <Tarjeta titulo="Viajes asignados" sinPadding>
          {activos.length === 0 ? <Vacio>No tenés viajes asignados.</Vacio> : <TablaViajes viajes={activos} conTarifa={false} />}
        </Tarjeta>
        <Tarjeta titulo="Últimos viajes finalizados" sinPadding>
          {recientes.length === 0 ? <Vacio>Todavía no hay viajes finalizados.</Vacio> : <TablaViajes viajes={recientes} conTarifa={false} />}
        </Tarjeta>
      </div>
    </>
  );
}
