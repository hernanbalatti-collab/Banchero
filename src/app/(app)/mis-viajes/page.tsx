import type { Metadata } from "next";
import { Encabezado, Tarjeta, Vacio } from "@/components/ui";
import { FormEntrega } from "@/components/form-entrega";
import { TablaViajes } from "@/components/tabla-viajes";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/dal";
import { fechaHora } from "@/lib/format";
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

  const [repartos, entregasRecientes, activos, recientes] = await Promise.all([
    db.envio.findMany({
      where: { repartidorId: usuario.choferId, estado: "EN_REPARTO" },
      orderBy: { updatedAt: "asc" },
      include: { depositoDestino: { select: { nombre: true } } },
    }),
    db.envio.findMany({
      where: { repartidorId: usuario.choferId, estado: "ENTREGADO" },
      orderBy: { fechaEntrega: "desc" },
      take: 5,
    }),
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
        {repartos.length > 0 && (
          <Tarjeta titulo={`Repartos pendientes (${repartos.length})`} sinPadding>
            <ul className="divide-y divide-stone-100">
              {repartos.map((e) => (
                <li key={e.id} className="grid gap-5 p-5 md:grid-cols-2">
                  <div className="space-y-1 text-sm">
                    <p className="font-mono text-xs text-stone-500">{e.codigo}</p>
                    <p className="text-base font-semibold text-stone-900">{e.destinatarioNombre}</p>
                    <p className="text-stone-700">{e.direccionEntrega}</p>
                    {e.destinatarioTelefono && (
                      <a href={`tel:${e.destinatarioTelefono}`} className="inline-block font-medium text-marca-700 underline">
                        {e.destinatarioTelefono}
                      </a>
                    )}
                    <p className="pt-1 text-stone-500">
                      {e.bultos} bulto{e.bultos === 1 ? "" : "s"} · {e.descripcion}
                    </p>
                  </div>
                  <FormEntrega envioId={e.id} enReparto compacto />
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}

        <Tarjeta titulo="Viajes asignados" sinPadding>
          {activos.length === 0 ? <Vacio>No tenés viajes asignados.</Vacio> : <TablaViajes viajes={activos} conTarifa={false} />}
        </Tarjeta>
        <Tarjeta titulo="Últimos viajes finalizados" sinPadding>
          {recientes.length === 0 ? <Vacio>Todavía no hay viajes finalizados.</Vacio> : <TablaViajes viajes={recientes} conTarifa={false} />}
        </Tarjeta>

        {entregasRecientes.length > 0 && (
          <Tarjeta titulo="Mis últimas entregas" sinPadding>
            <ul className="divide-y divide-stone-100 text-sm">
              {entregasRecientes.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-2 px-5 py-3">
                  <span>
                    <span className="font-mono text-xs text-stone-500">{e.codigo}</span> · {e.destinatarioNombre}
                    <span className="block text-xs text-stone-500">
                      Recibió {e.recibidoPor}
                      {e.recibidoDni && ` (DNI ${e.recibidoDni})`}
                    </span>
                  </span>
                  <span className="tabular-nums text-stone-500">{fechaHora(e.fechaEntrega)}</span>
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}
      </div>
    </>
  );
}
