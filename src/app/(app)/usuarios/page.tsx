import type { Metadata } from "next";
import Link from "next/link";
import { BotonLink, Encabezado, Insignia, Tabla, Tarjeta, Td, Th } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/dal";
import { fechaHora } from "@/lib/format";
import { ROL } from "@/lib/labels";

export const metadata: Metadata = { title: "Usuarios" };

export default async function PaginaUsuarios() {
  await requerirUsuario(["ADMIN"]);
  const usuarios = await db.usuario.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      createdAt: true,
      chofer: { select: { nombre: true, apellido: true } },
    },
  });

  return (
    <>
      <Encabezado
        titulo="Usuarios"
        subtitulo="Quién puede ingresar y con qué permisos"
        acciones={<BotonLink href="/usuarios/nuevo">Nuevo usuario</BotonLink>}
      />
      <Tarjeta sinPadding>
        <Tabla>
          <thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Email</Th>
              <Th>Rol</Th>
              <Th>Alta</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-stone-50">
                <Td className="font-medium text-stone-900">
                  {u.nombre} {!u.activo && <Insignia>Inactivo</Insignia>}
                </Td>
                <Td>{u.email}</Td>
                <Td>
                  <Insignia tono={u.rol === "ADMIN" ? "violeta" : u.rol === "OPERADOR" ? "azul" : "gris"}>{ROL[u.rol]}</Insignia>
                  {u.chofer && (
                    <span className="ml-2 text-xs text-stone-500">
                      {u.chofer.apellido}, {u.chofer.nombre}
                    </span>
                  )}
                </Td>
                <Td className="tabular-nums">{fechaHora(u.createdAt)}</Td>
                <Td derecha>
                  <Link href={`/usuarios/${u.id}`} className="font-medium text-marca-700 hover:text-marca-900">
                    Editar
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Tarjeta>
    </>
  );
}
