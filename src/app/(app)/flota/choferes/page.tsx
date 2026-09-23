import type { Metadata } from "next";
import Link from "next/link";
import { BotonLink, claseInput, Encabezado, Filtros, Insignia, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { Vencimiento } from "@/components/vencimiento";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";

export const metadata: Metadata = { title: "Choferes" };

export default async function PaginaChoferes({ searchParams }: PageProps<"/flota/choferes">) {
  await requerirUsuario(ROLES_GESTION);
  const { q } = await searchParams;
  const busqueda = typeof q === "string" ? q.trim() : "";

  const choferes = await db.chofer.findMany({
    where: busqueda
      ? { OR: [{ nombre: { contains: busqueda } }, { apellido: { contains: busqueda } }, { dni: { contains: busqueda } }] }
      : undefined,
    orderBy: [{ activo: "desc" }, { apellido: "asc" }],
    include: {
      usuario: { select: { email: true } },
      viajes: { where: { estado: { in: ["ASIGNADO", "EN_TRANSITO"] } }, select: { id: true } },
    },
  });

  return (
    <>
      <Encabezado
        titulo="Choferes"
        subtitulo={`${choferes.length} chofer${choferes.length === 1 ? "" : "es"}`}
        acciones={<BotonLink href="/flota/choferes/nuevo">Nuevo chofer</BotonLink>}
      />
      <Tarjeta sinPadding>
        <Filtros>
          <input name="q" defaultValue={busqueda} placeholder="Nombre, apellido o DNI" className={`${claseInput} max-w-xs`} />
        </Filtros>
        {choferes.length === 0 ? (
          <Vacio>No hay choferes que mostrar.</Vacio>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th>Chofer</Th>
                <Th>DNI</Th>
                <Th>Teléfono</Th>
                <Th>Licencia</Th>
                <Th>LiNTI</Th>
                <Th>Situación</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {choferes.map((c) => (
                <tr key={c.id} className="hover:bg-stone-50">
                  <Td className="font-medium text-stone-900">
                    {c.apellido}, {c.nombre}
                    {c.usuario && <div className="text-xs font-normal text-stone-500">Usuario: {c.usuario.email}</div>}
                  </Td>
                  <Td className="tabular-nums">{c.dni}</Td>
                  <Td>{c.telefono ?? "—"}</Td>
                  <Td>
                    {c.categoriaLicencia && <span className="mr-2 font-medium">{c.categoriaLicencia}</span>}
                    <Vencimiento d={c.vencimientoLicencia} />
                  </Td>
                  <Td>
                    <Vencimiento d={c.vencimientoLinti} />
                  </Td>
                  <Td>
                    {!c.activo ? (
                      <Insignia>Inactivo</Insignia>
                    ) : c.viajes.length > 0 ? (
                      <Insignia tono="azul">Con viaje asignado</Insignia>
                    ) : (
                      <Insignia tono="verde">Disponible</Insignia>
                    )}
                  </Td>
                  <Td derecha>
                    <Link href={`/flota/choferes/${c.id}`} className="font-medium text-marca-600 hover:text-marca-800">
                      Editar
                    </Link>
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
