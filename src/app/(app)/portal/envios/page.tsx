import type { Metadata } from "next";
import { claseInput, Encabezado, Filtros, Tarjeta, Vacio } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { EstadoEnvio } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requerirCliente } from "@/lib/dal";
import { ESTADO_ENVIO, opciones } from "@/lib/labels";
import { ENVIOS_ACTIVOS, INCLUDE_ENVIO } from "../consultas";
import { TablaEnviosCliente } from "../tablas";

export const metadata: Metadata = { title: "Mis envíos" };

export default async function PaginaMisEnvios({ searchParams }: PageProps<"/portal/envios">) {
  const { clienteId } = await requerirCliente();
  const sp = await searchParams;
  const busqueda = typeof sp.q === "string" ? sp.q.trim() : "";
  const estado = typeof sp.estado === "string" ? sp.estado : "ACTIVOS";

  // El filtro por cliente va siempre: es lo que garantiza que solo vea lo suyo
  const where: Prisma.EnvioWhereInput = {
    clienteId,
    estado: estado === "ACTIVOS" ? { in: ENVIOS_ACTIVOS } : Object.values(EstadoEnvio).find((e) => e === estado),
  };
  if (busqueda) {
    where.OR = [{ codigo: { contains: busqueda.toUpperCase() } }, { destinatarioNombre: { contains: busqueda } }];
  }

  const envios = await db.envio.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: INCLUDE_ENVIO });

  return (
    <>
      <Encabezado titulo="Mis envíos" subtitulo="Encomiendas despachadas con Expreso Banchero" />
      <Tarjeta sinPadding>
        <Filtros>
          <input name="q" defaultValue={busqueda} placeholder="Código o destinatario" className={`${claseInput} max-w-xs`} />
          <select name="estado" defaultValue={estado} className={`${claseInput} max-w-56`}>
            <option value="ACTIVOS">En curso</option>
            <option value="TODOS">Todos</option>
            {opciones(ESTADO_ENVIO).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </Filtros>
        {envios.length === 0 ? <Vacio>No hay envíos que coincidan con el filtro.</Vacio> : <TablaEnviosCliente envios={envios} />}
      </Tarjeta>
    </>
  );
}
