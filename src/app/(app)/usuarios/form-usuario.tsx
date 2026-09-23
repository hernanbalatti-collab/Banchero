import { guardarUsuario } from "@/actions/usuarios";
import { BotonEnviar, Casilla, Entrada, Form, Grilla, Selector } from "@/components/form";
import { BotonLink, Tarjeta } from "@/components/ui";
import type { Usuario } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { opciones, ROL } from "@/lib/labels";

export async function FormUsuario({ usuario }: { usuario?: Usuario }) {
  // Legajos sin usuario, más el vinculado actualmente
  const choferes = await db.chofer.findMany({
    where: { OR: [{ usuario: null }, { id: usuario?.choferId ?? undefined }] },
    orderBy: { apellido: "asc" },
  });

  return (
    <Tarjeta className="max-w-3xl">
      <Form accion={guardarUsuario.bind(null, usuario?.id ?? null)}>
        <Grilla>
          <Entrada name="nombre" etiqueta="Nombre" valor={usuario?.nombre} requerido />
          <Entrada name="email" etiqueta="Email" type="email" valor={usuario?.email} requerido />
          <Selector name="rol" etiqueta="Rol" valor={usuario?.rol ?? "OPERADOR"} opciones={opciones(ROL)} />
          <Selector
            name="choferId"
            etiqueta="Legajo de chofer"
            valor={usuario?.choferId}
            vacio="—"
            opciones={choferes.map((c) => ({ valor: c.id, etiqueta: `${c.apellido}, ${c.nombre} (DNI ${c.dni})` }))}
            ayuda="Solo para el rol Chofer: define qué viajes ve."
          />
          <Entrada
            name="password"
            etiqueta={usuario ? "Nueva contraseña" : "Contraseña"}
            type="password"
            autoComplete="new-password"
            requerido={!usuario}
            ayuda={usuario ? "Dejala vacía para no cambiarla." : "Mínimo 8 caracteres, con letras y números."}
          />
        </Grilla>
        <Casilla name="activo" etiqueta="Usuario activo (puede ingresar)" valor={usuario?.activo ?? true} />
        <div className="flex gap-2 border-t border-stone-100 pt-5">
          <BotonEnviar>Guardar</BotonEnviar>
          <BotonLink href="/usuarios" variante="secundario">
            Cancelar
          </BotonLink>
        </div>
      </Form>
    </Tarjeta>
  );
}
