import type { Metadata } from "next";
import { crearEnvio } from "@/actions/envios";
import { AreaTexto, BotonEnviar, Casilla, Entrada, Form, Grilla, Selector } from "@/components/form";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirUsuario, ROLES_GESTION } from "@/lib/dal";

export const metadata: Metadata = { title: "Recibir envío" };

export default async function PaginaNuevoEnvio() {
  await requerirUsuario(ROLES_GESTION);
  const [depositos, clientes] = await Promise.all([
    db.deposito.findMany({ orderBy: { nombre: "desc" } }),
    db.cliente.findMany({ where: { activo: true }, orderBy: { razonSocial: "asc" }, select: { id: true, razonSocial: true } }),
  ]);
  const opcionesDeposito = depositos.map((d) => ({ valor: d.id, etiqueta: d.nombre }));

  return (
    <>
      <Encabezado titulo="Recibir envío" subtitulo="Registrá la encomienda al recibirla en el depósito: se genera el código de seguimiento." />
      <Tarjeta className="max-w-3xl">
        <Form accion={crearEnvio}>
          <Grilla>
            <Selector
              name="clienteId"
              etiqueta="Remitente (cliente)"
              requerido
              vacio="Seleccionar…"
              opciones={clientes.map((c) => ({ valor: c.id, etiqueta: c.razonSocial }))}
              className="sm:col-span-2"
            />
            <Selector name="depositoOrigenId" etiqueta="Recibido en" valor={depositos[0]?.id} opciones={opcionesDeposito} />
            <Selector name="depositoDestinoId" etiqueta="Destino" valor={depositos[1]?.id} opciones={opcionesDeposito} />
            <Entrada name="destinatarioNombre" etiqueta="Destinatario" requerido />
            <Entrada name="destinatarioTelefono" etiqueta="Teléfono del destinatario" />
          </Grilla>
          <Casilla name="entregaDomicilio" etiqueta="Entrega a domicilio (si no, retira en el depósito de destino)" />
          <Entrada name="direccionEntrega" etiqueta="Dirección de entrega" ayuda="Obligatoria si es a domicilio." />
          <AreaTexto name="descripcion" etiqueta="Contenido *" filas={2} />
          <Grilla columnas={4}>
            <Entrada name="bultos" etiqueta="Bultos" type="number" min={1} valor={1} />
            <Entrada name="pesoKg" etiqueta="Peso (kg)" type="number" min={0} step="0.1" />
            <Entrada name="valorDeclarado" etiqueta="Valor declarado" type="number" min={0} step="0.01" />
            <Entrada name="precio" etiqueta="Precio del envío *" type="number" min={0} step="0.01" />
          </Grilla>
          <div className="flex gap-2 border-t border-stone-100 pt-5">
            <BotonEnviar>Registrar y generar código</BotonEnviar>
            <BotonLink href="/envios" variante="secundario">
              Cancelar
            </BotonLink>
          </div>
        </Form>
      </Tarjeta>
    </>
  );
}
