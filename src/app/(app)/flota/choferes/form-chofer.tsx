import { guardarChofer } from "@/actions/flota";
import { BotonEnviar, Casilla, Entrada, Form, Grilla } from "@/components/form";
import { BotonLink, Tarjeta } from "@/components/ui";
import type { Chofer } from "@/generated/prisma/client";
import { aInputFecha } from "@/lib/format";

export function FormChofer({ chofer }: { chofer?: Chofer }) {
  return (
    <Tarjeta className="max-w-3xl">
      <Form accion={guardarChofer.bind(null, chofer?.id ?? null)}>
        <Grilla>
          <Entrada name="nombre" etiqueta="Nombre" valor={chofer?.nombre} requerido />
          <Entrada name="apellido" etiqueta="Apellido" valor={chofer?.apellido} requerido />
          <Entrada name="dni" etiqueta="DNI" valor={chofer?.dni} requerido inputMode="numeric" />
          <Entrada name="telefono" etiqueta="Teléfono" valor={chofer?.telefono} />
          <Entrada name="categoriaLicencia" etiqueta="Categoría de licencia" valor={chofer?.categoriaLicencia} placeholder="E1, E2…" />
          <Entrada name="vencimientoLicencia" etiqueta="Vencimiento de licencia" type="date" valor={aInputFecha(chofer?.vencimientoLicencia)} />
          <Entrada
            name="vencimientoLinti"
            etiqueta="Vencimiento LiNTI"
            type="date"
            valor={aInputFecha(chofer?.vencimientoLinti)}
            ayuda="Licencia Nacional de Transporte Interjurisdiccional"
          />
        </Grilla>
        <Casilla name="activo" etiqueta="Chofer activo" valor={chofer?.activo ?? true} />
        <div className="flex gap-2 border-t border-stone-100 pt-5">
          <BotonEnviar>Guardar</BotonEnviar>
          <BotonLink href="/flota/choferes" variante="secundario">
            Cancelar
          </BotonLink>
        </div>
      </Form>
    </Tarjeta>
  );
}
