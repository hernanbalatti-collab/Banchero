import { guardarVehiculo } from "@/actions/flota";
import { BotonEnviar, Entrada, Form, Grilla, Selector } from "@/components/form";
import { BotonLink, Tarjeta } from "@/components/ui";
import type { Vehiculo } from "@/generated/prisma/client";
import { aInputFecha } from "@/lib/format";
import { ESTADO_VEHICULO, opciones, TIPO_VEHICULO } from "@/lib/labels";

export function FormVehiculo({ vehiculo }: { vehiculo?: Vehiculo }) {
  return (
    <Tarjeta className="max-w-3xl">
      <Form accion={guardarVehiculo.bind(null, vehiculo?.id ?? null)}>
        <Grilla>
          <Entrada name="patente" etiqueta="Patente" valor={vehiculo?.patente} requerido placeholder="AB123CD" />
          <Selector name="tipo" etiqueta="Tipo" valor={vehiculo?.tipo ?? "CAMION"} opciones={opciones(TIPO_VEHICULO)} />
          <Entrada name="marca" etiqueta="Marca" valor={vehiculo?.marca} requerido />
          <Entrada name="modelo" etiqueta="Modelo" valor={vehiculo?.modelo} requerido />
          <Entrada name="anio" etiqueta="Año" type="number" valor={vehiculo?.anio} />
          <Entrada name="capacidadKg" etiqueta="Capacidad de carga (kg)" type="number" valor={vehiculo?.capacidadKg} />
          <Selector
            name="estado"
            etiqueta="Estado"
            valor={vehiculo?.estado ?? "DISPONIBLE"}
            opciones={opciones(ESTADO_VEHICULO)}
            ayuda="Pasa a «En viaje» automáticamente cuando un viaje sale."
          />
          <div className="hidden sm:block" />
          <Entrada name="vencimientoVtv" etiqueta="Vencimiento VTV / RTO" type="date" valor={aInputFecha(vehiculo?.vencimientoVtv)} />
          <Entrada name="vencimientoSeguro" etiqueta="Vencimiento del seguro" type="date" valor={aInputFecha(vehiculo?.vencimientoSeguro)} />
        </Grilla>
        <div className="flex gap-2 border-t border-stone-100 pt-5">
          <BotonEnviar>Guardar</BotonEnviar>
          <BotonLink href="/flota/vehiculos" variante="secundario">
            Cancelar
          </BotonLink>
        </div>
      </Form>
    </Tarjeta>
  );
}
