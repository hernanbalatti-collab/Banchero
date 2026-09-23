import { guardarCliente } from "@/actions/clientes";
import { BotonEnviar, Casilla, Entrada, Form, Grilla, Selector } from "@/components/form";
import { BotonLink, Tarjeta } from "@/components/ui";
import type { Cliente } from "@/generated/prisma/client";
import { CONDICION_IVA, opciones } from "@/lib/labels";

export function FormCliente({ cliente }: { cliente?: Cliente }) {
  return (
    <Tarjeta className="max-w-3xl">
      <Form accion={guardarCliente.bind(null, cliente?.id ?? null)}>
        <Grilla>
          <Entrada name="razonSocial" etiqueta="Razón social" valor={cliente?.razonSocial} requerido className="sm:col-span-2" />
          <Entrada name="cuit" etiqueta="CUIT" valor={cliente?.cuit} requerido placeholder="30-12345678-9" />
          <Selector
            name="condicionIva"
            etiqueta="Condición frente al IVA"
            valor={cliente?.condicionIva ?? "RESPONSABLE_INSCRIPTO"}
            opciones={opciones(CONDICION_IVA)}
          />
          <Entrada name="email" etiqueta="Email" type="email" valor={cliente?.email} />
          <Entrada name="telefono" etiqueta="Teléfono" valor={cliente?.telefono} />
          <Entrada name="direccion" etiqueta="Dirección" valor={cliente?.direccion} className="sm:col-span-2" />
        </Grilla>
        <Casilla name="activo" etiqueta="Cliente activo" valor={cliente?.activo ?? true} />
        <div className="flex gap-2 border-t border-stone-100 pt-5">
          <BotonEnviar>Guardar</BotonEnviar>
          <BotonLink href="/clientes" variante="secundario">
            Cancelar
          </BotonLink>
        </div>
      </Form>
    </Tarjeta>
  );
}
