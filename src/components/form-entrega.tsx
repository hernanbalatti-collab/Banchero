import { cambiarEstadoEnvio } from "@/actions/envios";
import { BotonEnviar, Entrada, Form } from "@/components/form";
import { aInputFechaHora } from "@/lib/format";

/**
 * Registro de la entrega de un envío. Lo usan el detalle del envío (gestión)
 * y «Mis repartos» del chofer, que no elige quién entregó: es él.
 */
export function FormEntrega({
  envioId,
  entregadoPor,
  enReparto,
  compacto,
}: {
  envioId: string;
  /** Valor sugerido; si se omite, no se muestra el campo (lo completa el servidor). */
  entregadoPor?: string;
  /** Ofrece «No se pudo entregar» para devolverlo al depósito. */
  enReparto?: boolean;
  compacto?: boolean;
}) {
  return (
    <Form accion={cambiarEstadoEnvio.bind(null, envioId)} className="space-y-4">
      <Entrada name="recibidoPor" etiqueta="Recibió (nombre y apellido)" />
      <Entrada name="recibidoDni" etiqueta="DNI de quien recibió" inputMode="numeric" />
      {entregadoPor !== undefined && <Entrada name="entregadoPor" etiqueta="Entregó" valor={entregadoPor} />}
      {!compacto && (
        <Entrada
          name="fechaEntrega"
          etiqueta="Fecha y hora de entrega"
          type="datetime-local"
          valor={aInputFechaHora(new Date())}
          ayuda="Si la registrás más tarde, poné la hora real."
        />
      )}
      <Entrada name="nota" etiqueta="Nota" ayuda="Interna: no se muestra en el seguimiento público." />
      <div className="flex flex-wrap gap-2">
        <BotonEnviar name="estado" value="ENTREGADO">
          Registrar entrega
        </BotonEnviar>
        {enReparto && (
          <BotonEnviar name="estado" value="EN_DESTINO" variante="secundario" confirmar="¿Confirmás que no se pudo entregar y vuelve al depósito?">
            No se pudo entregar
          </BotonEnviar>
        )}
      </div>
    </Form>
  );
}
