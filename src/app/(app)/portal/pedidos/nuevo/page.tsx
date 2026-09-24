import type { Metadata } from "next";
import { crearPedido } from "@/actions/pedidos";
import { AreaTexto, BotonEnviar, Casilla, Entrada, Form, Grilla, Selector } from "@/components/form";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { db } from "@/lib/db";
import { requerirCliente } from "@/lib/dal";
import { aInputFecha, hoy, sumarDias } from "@/lib/format";

export const metadata: Metadata = { title: "Nuevo pedido" };

function Botones() {
  return (
    <div className="flex gap-2 border-t border-stone-100 pt-5">
      <BotonEnviar>Enviar pedido</BotonEnviar>
      <BotonLink href="/portal/pedidos" variante="secundario">
        Cancelar
      </BotonLink>
    </div>
  );
}

export default async function PaginaNuevoPedido({ searchParams }: PageProps<"/portal/pedidos/nuevo">) {
  await requerirCliente();
  const { tipo } = await searchParams;

  if (tipo !== "ENCOMIENDA") {
    return (
      <>
        <Encabezado
          titulo="Pedir un flete"
          subtitulo="Contanos qué hay que llevar y adónde. Te confirmamos la tarifa y la fecha antes de programar el viaje."
        />
        <Tarjeta className="max-w-3xl">
          <Form accion={crearPedido.bind(null, "FLETE")}>
            <Grilla>
              <Entrada name="origen" etiqueta="Origen (dónde se carga)" placeholder="Dirección, ciudad" requerido />
              <Entrada name="destino" etiqueta="Destino (dónde se descarga)" placeholder="Dirección, ciudad" requerido />
              <Entrada name="fechaCarga" etiqueta="Fecha de carga deseada" type="date" min={aInputFecha(hoy())} valor={aInputFecha(sumarDias(hoy(), 1))} requerido />
              <Entrada name="pesoKg" etiqueta="Peso aproximado (kg)" type="number" min={0} />
              <Entrada
                name="descripcion"
                etiqueta="Qué hay que llevar"
                placeholder="Ej: 12 pallets de alimentos secos"
                requerido
                className="sm:col-span-2"
              />
            </Grilla>
            <AreaTexto
              name="observaciones"
              etiqueta="Observaciones"
              ayuda="Horarios de carga y descarga, contacto en origen, si hace falta autoelevador, etc."
            />
            <Botones />
          </Form>
        </Tarjeta>
      </>
    );
  }

  const depositos = await db.deposito.findMany({ orderBy: { nombre: "desc" } });
  const opcionesDeposito = depositos.map((d) => ({ valor: d.id, etiqueta: d.nombre }));
  return (
    <>
      <Encabezado
        titulo="Enviar una encomienda"
        subtitulo="Cargá los datos antes de traerla al depósito: al recibirla te damos el código de seguimiento."
      />
      <Tarjeta className="max-w-3xl">
        <Form accion={crearPedido.bind(null, "ENCOMIENDA")}>
          <Grilla>
            <Selector name="depositoOrigenId" etiqueta="La llevo al depósito" valor={depositos[0]?.id} opciones={opcionesDeposito} />
            <Selector name="depositoDestinoId" etiqueta="Destino" valor={depositos[1]?.id} opciones={opcionesDeposito} />
            <Entrada name="destinatarioNombre" etiqueta="Destinatario" requerido />
            <Entrada name="destinatarioTelefono" etiqueta="Teléfono del destinatario" />
          </Grilla>
          <Casilla name="entregaDomicilio" etiqueta="Entrega a domicilio (si no, retira en el depósito de destino)" />
          <Entrada name="direccionEntrega" etiqueta="Dirección de entrega" ayuda="Obligatoria si es a domicilio." />
          <AreaTexto name="descripcion" etiqueta="Contenido *" filas={2} />
          <Grilla columnas={3}>
            <Entrada name="bultos" etiqueta="Bultos" type="number" min={1} valor={1} />
            <Entrada name="pesoKg" etiqueta="Peso (kg)" type="number" min={0} step="0.1" />
            <Entrada name="valorDeclarado" etiqueta="Valor declarado" type="number" min={0} step="0.01" />
          </Grilla>
          <AreaTexto name="observaciones" etiqueta="Observaciones" filas={2} />
          <Botones />
        </Form>
      </Tarjeta>
    </>
  );
}
