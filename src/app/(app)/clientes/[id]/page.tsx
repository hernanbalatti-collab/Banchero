import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonLink, Encabezado, Insignia, Tarjeta } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";
import { FormCliente } from "../form-cliente";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function PaginaEditarCliente({ params }: PageProps<"/clientes/[id]">) {
  const usuario = await requerirUsuario(ROLES_GESTION);
  const { id } = await params;
  const cliente = await db.cliente.findUnique({
    where: { id },
    include: { usuarios: { orderBy: { nombre: "asc" }, select: { id: true, nombre: true, email: true, activo: true } } },
  });
  if (!cliente) notFound();
  const admin = usuario.rol === "ADMIN";

  return (
    <>
      <Encabezado titulo={cliente.razonSocial} subtitulo={`CUIT ${cliente.cuit}`} />
      <div className="space-y-6">
        <FormCliente cliente={cliente} />
        <Tarjeta
          titulo="Acceso al portal de clientes"
          acciones={admin && <BotonLink href={`/usuarios/nuevo?cliente=${cliente.id}`} variante="secundario" chico>Crear usuario</BotonLink>}
          className="max-w-3xl"
        >
          {cliente.usuarios.length === 0 ? (
            <p className="text-sm text-stone-600">
              Este cliente todavía no tiene usuarios. Con un usuario puede ingresar y ver solo sus envíos, fletes y facturas.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {cliente.usuarios.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-medium text-stone-900">{u.nombre}</span>{" "}
                    <span className="text-stone-500">{u.email}</span> {!u.activo && <Insignia>Inactivo</Insignia>}
                  </span>
                  {admin && (
                    <Link href={`/usuarios/${u.id}`} className="font-medium text-marca-700 hover:text-marca-900">
                      Editar
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
