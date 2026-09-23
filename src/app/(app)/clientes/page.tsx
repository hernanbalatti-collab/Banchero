import type { Metadata } from "next";
import Link from "next/link";
import { BotonLink, claseInput, Encabezado, Filtros, Insignia, Tabla, Tarjeta, Td, Th, Vacio } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { CONDICION_IVA } from "@/lib/labels";

export const metadata: Metadata = { title: "Clientes" };

export default async function PaginaClientes({ searchParams }: PageProps<"/clientes">) {
  await requerirUsuario(ROLES_GESTION);
  const { q } = await searchParams;
  const busqueda = typeof q === "string" ? q.trim() : "";

  const clientes = await db.cliente.findMany({
    where: busqueda
      ? { OR: [{ razonSocial: { contains: busqueda } }, { cuit: { contains: busqueda } }] }
      : undefined,
    orderBy: { razonSocial: "asc" },
    include: { _count: { select: { viajes: true } } },
  });

  return (
    <>
      <Encabezado
        titulo="Clientes"
        subtitulo={`${clientes.length} cliente${clientes.length === 1 ? "" : "s"}`}
        acciones={<BotonLink href="/clientes/nuevo">Nuevo cliente</BotonLink>}
      />
      <Tarjeta sinPadding>
        <Filtros>
          <input name="q" defaultValue={busqueda} placeholder="Buscar por razón social o CUIT" className={`${claseInput} max-w-xs`} />
        </Filtros>
        {clientes.length === 0 ? (
          <Vacio>No hay clientes{busqueda && " que coincidan con la búsqueda"}.</Vacio>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th>Razón social</Th>
                <Th>CUIT</Th>
                <Th>Condición IVA</Th>
                <Th>Contacto</Th>
                <Th derecha>Viajes</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-stone-50">
                  <Td className="font-medium text-stone-900">
                    {c.razonSocial} {!c.activo && <Insignia>Inactivo</Insignia>}
                  </Td>
                  <Td className="tabular-nums">{c.cuit}</Td>
                  <Td>{CONDICION_IVA[c.condicionIva]}</Td>
                  <Td>
                    <div>{c.email ?? "—"}</div>
                    {c.telefono && <div className="text-xs text-stone-500">{c.telefono}</div>}
                  </Td>
                  <Td derecha>{c._count.viajes}</Td>
                  <Td derecha>
                    <Link href={`/clientes/${c.id}`} className="font-medium text-marca-600 hover:text-marca-800">
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
