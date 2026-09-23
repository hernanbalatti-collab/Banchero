import { guardarUsuario } from "@/actions/usuarios";
import { BotonEnviar, Casilla, Entrada, Form, Grilla, Selector } from "@/components/form";
import { BotonLink, Tarjeta } from "@/components/ui";
import type { Usuario } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { opciones, ROL } from "@/lib/labels";

export async function FormUsuario({ usuario, clienteInicial }: { usuario?: Usuario; clienteInicial?: string }) {
  // Legajos sin usuario, más el vinculado actualmente
  const [choferes, clientes] = await Promise.all([
    db.chofer.findMany({
      where: { OR: [{ usuario: null }, { id: usuario?.choferId ?? undefined }] },
      orderBy: { apellido: "asc" },
    }),
    // Un cliente puede tener varios usuarios
    db.cliente.findMany({
      where: { OR: [{ activo: true }, { id: usuario?.clienteId ?? undefined }] },
      orderBy: { razonSocial: "asc" },
    }),
  ]);

  return (
    <Tarjeta className="max-w-3xl">
      <Form accion={guardarUsuario.bind(null, usuario?.id ?? null)}>
        <Grilla>
          <Entrada name="nombre" etiqueta="Nombre" valor={usuario?.nombre} requerido />
          <Entrada name="email" etiqueta="Email" type="email" valor={usuario?.email} requerido />
          <Selector name="rol" etiqueta="Rol" valor={usuario?.rol ?? (clienteInicial ? "CLIENTE" : "OPERADOR")} opciones={opciones(ROL)} />
          <Selector
            name="choferId"
            etiqueta="Legajo de chofer"
            valor={usuario?.choferId}
            vacio="—"
            opciones={choferes.map((c) => ({ valor: c.id, etiqueta: `${c.apellido}, ${c.nombre} (DNI ${c.dni})` }))}
            ayuda="Solo para el rol Chofer: define qué viajes ve."
          />
          <Selector
            name="clienteId"
            etiqueta="Cliente"
            valor={usuario?.clienteId ?? clienteInicial}
            vacio="—"
            opciones={clientes.map((c) => ({ valor: c.id, etiqueta: `${c.razonSocial} (CUIT ${c.cuit})` }))}
            ayuda="Solo para el rol Cliente: ve únicamente los envíos, fletes y facturas de este cliente."
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
