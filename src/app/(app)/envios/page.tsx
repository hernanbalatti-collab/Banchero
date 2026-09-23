import type { Metadata } from "next";
import Link from "next/link";
import { BotonLink, claseInput, Encabezado, Estado, Filtros, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { EstadoEnvio } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { fechaHora, moneda } from "@/lib/format";
import { ESTADO_ENVIO, opciones } from "@/lib/labels";

export const metadata: Metadata = { title: "Envíos" };

const ACTIVOS: EstadoEnvio[] = ["RECIBIDO", "EN_TRANSITO", "EN_DESTINO", "EN_REPARTO"];

export default async function PaginaEnvios({ searchParams }: PageProps<"/envios">) {
  await requerirUsuario(ROLES_GESTION);
  const sp = await searchParams;
  const busqueda = typeof sp.q === "string" ? sp.q.trim() : "";
  const estado = typeof sp.estado === "string" ? sp.estado : "ACTIVOS";
  const deposito = typeof sp.deposito === "string" ? sp.deposito : "";

  const depositos = await db.deposito.findMany({ orderBy: { nombre: "desc" } });

  const where: Prisma.EnvioWhereInput = {
    estado: estado === "ACTIVOS" ? { in: ACTIVOS } : Object.values(EstadoEnvio).find((e) => e === estado),
    AND: [],
  };
  const and = where.AND as Prisma.EnvioWhereInput[];
  if (deposito) {
    // Lo que está físicamente en ese depósito
    and.push({
      OR: [
        { estado: "RECIBIDO", depositoOrigenId: deposito },
        { estado: "EN_DESTINO", depositoDestinoId: deposito },
      ],
    });
  }
  if (busqueda) {
    and.push({
      OR: [
        { codigo: { contains: busqueda.toUpperCase() } },
        { destinatarioNombre: { contains: busqueda } },
        { cliente: { razonSocial: { contains: busqueda } } },
      ],
    });
  }

  const envios = await db.envio.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      cliente: { select: { razonSocial: true } },
      depositoOrigen: { select: { nombre: true } },
      depositoDestino: { select: { nombre: true } },
    },
  });

  return (
    <>
      <Encabezado
        titulo="Envíos"
        subtitulo="Encomiendas entre los depósitos de Chivilcoy y CABA"
        acciones={<BotonLink href="/envios/nuevo">Recibir envío</BotonLink>}
      />
      <Tarjeta sinPadding>
        <Filtros>
          <input name="q" defaultValue={busqueda} placeholder="Código, remitente o destinatario" className={`${claseInput} max-w-xs`} />
          <select name="estado" defaultValue={estado} className={`${claseInput} max-w-56`}>
            <option value="ACTIVOS">Activos</option>
            <option value="TODOS">Todos</option>
            {opciones(ESTADO_ENVIO).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
          <select name="deposito" defaultValue={deposito} className={`${claseInput} max-w-56`}>
            <option value="">Cualquier ubicación</option>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                En depósito {d.nombre}
              </option>
            ))}
          </select>
        </Filtros>
        {envios.length === 0 ? (
          <Vacio>No hay envíos que coincidan con el filtro.</Vacio>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Recibido</Th>
                <Th>Remitente</Th>
                <Th>Destinatario</Th>
                <Th>Tramo</Th>
                <Th derecha>Bultos</Th>
                <Th>Estado</Th>
                <Th derecha>Precio</Th>
              </tr>
            </thead>
            <tbody>
              {envios.map((e) => (
                <tr key={e.id} className="hover:bg-stone-50">
                  <Td>
                    <Link href={`/envios/${e.id}`} className="whitespace-nowrap font-mono font-medium text-marca-700 hover:text-marca-900">
                      {e.codigo}
                    </Link>
                  </Td>
                  <Td className="tabular-nums">{fechaHora(e.createdAt)}</Td>
                  <Td className="font-medium text-stone-900">{e.cliente.razonSocial}</Td>
                  <Td>
                    {e.destinatarioNombre}
                    {e.entregaDomicilio && <div className="text-xs text-stone-500">A domicilio</div>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {e.depositoOrigen.nombre} → {e.depositoDestino.nombre}
                  </Td>
                  <Td derecha>{e.bultos}</Td>
                  <Td>
                    <Estado par={ESTADO_ENVIO[e.estado]} />
                  </Td>
                  <Td derecha>{moneda(e.precio)}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Tarjeta>
    </>
  );
}
