import { guardarViaje } from "@/actions/viajes";
import { AreaTexto, BotonEnviar, Entrada, Form, Grilla, Selector } from "@/components/form";
import { BotonLink, Tarjeta } from "@/components/ui";
import type { Viaje } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { aInputFecha, aNumero, hoy } from "@/lib/format";
import { ESTADO_VEHICULO, TIPO_VEHICULO } from "@/lib/labels";

const TIPOS_TRACCION = ["CAMION", "TRACTOR", "UTILITARIO"] as const;
const TIPOS_ARRASTRE = ["SEMIRREMOLQUE", "ACOPLADO"] as const;

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-sm font-semibold text-stone-900">{titulo}</legend>
      {children}
    </fieldset>
  );
}

export async function FormViaje({ viaje }: { viaje?: Viaje }) {
  // Incluye los registros ya asignados aunque estén inactivos o de baja
  const [depositos, clientes, choferes, vehiculos] = await Promise.all([
    db.deposito.findMany({ orderBy: { nombre: "desc" } }),
    db.cliente.findMany({
      where: { OR: [{ activo: true }, { id: viaje?.clienteId ?? undefined }] },
      orderBy: { razonSocial: "asc" },
      select: { id: true, razonSocial: true },
    }),
    db.chofer.findMany({
      where: { OR: [{ activo: true }, { id: viaje?.choferId ?? undefined }] },
      orderBy: { apellido: "asc" },
      select: { id: true, nombre: true, apellido: true },
    }),
    db.vehiculo.findMany({
      where: { OR: [{ estado: { not: "BAJA" } }, { id: { in: [viaje?.vehiculoId, viaje?.acopladoId].filter((v): v is string => !!v) } }] },
      orderBy: { patente: "asc" },
    }),
  ]);

  const opcionVehiculo = (v: (typeof vehiculos)[number]) => ({
    valor: v.id,
    etiqueta: `${v.patente} · ${TIPO_VEHICULO[v.tipo]} ${v.marca}${v.estado !== "DISPONIBLE" ? ` (${ESTADO_VEHICULO[v.estado][0]})` : ""}`,
  });

  return (
    <Tarjeta className="max-w-4xl">
      <Form accion={guardarViaje.bind(null, viaje?.id ?? null)} className="space-y-8">
        <Seccion titulo="Tipo de viaje">
          <p className="-mt-2 text-xs text-stone-500">
            Para un flete a un cliente, elegí el cliente y el recorrido. Para llevar encomiendas entre depósitos,
            elegí los depósitos: el cliente queda vacío y cada encomienda tiene su propio remitente.
          </p>
          <Grilla columnas={3}>
            <Selector
              name="clienteId"
              etiqueta="Cliente (flete)"
              valor={viaje?.clienteId}
              vacio="—"
              opciones={clientes.map((c) => ({ valor: c.id, etiqueta: c.razonSocial }))}
            />
            <Selector
              name="depositoOrigenId"
              etiqueta="Depósito de origen"
              valor={viaje?.depositoOrigenId}
              vacio="—"
              opciones={depositos.map((d) => ({ valor: d.id, etiqueta: d.nombre }))}
            />
            <Selector
              name="depositoDestinoId"
              etiqueta="Depósito de destino"
              valor={viaje?.depositoDestinoId}
              vacio="—"
              opciones={depositos.map((d) => ({ valor: d.id, etiqueta: d.nombre }))}
            />
          </Grilla>
        </Seccion>

        <Seccion titulo="Carga y recorrido">
          <Grilla>
            <Entrada name="origen" etiqueta="Origen" valor={viaje?.origen} placeholder="Ciudad, provincia" ayuda="Entre depósitos se completa solo." />
            <Entrada name="destino" etiqueta="Destino" valor={viaje?.destino} placeholder="Ciudad, provincia" />
            <Entrada name="fechaCarga" etiqueta="Fecha de carga" type="date" valor={aInputFecha(viaje?.fechaCarga ?? hoy())} requerido />
            <Entrada name="fechaEntregaEstimada" etiqueta="Entrega estimada" type="date" valor={aInputFecha(viaje?.fechaEntregaEstimada)} />
            <Entrada
              name="descripcionCarga"
              etiqueta="Descripción de la carga"
              valor={viaje?.descripcionCarga}
              requerido
              placeholder="Ej: 28 pallets de alimentos secos / Encomiendas"
              className="sm:col-span-2"
            />
          </Grilla>
          <Grilla columnas={3}>
            <Entrada name="pesoKg" etiqueta="Peso (kg)" type="number" min={0} valor={viaje?.pesoKg} />
            <Entrada name="kmEstimados" etiqueta="Km estimados" type="number" min={0} valor={viaje?.kmEstimados} />
            <Entrada name="tarifa" etiqueta="Tarifa (ARS, sin IVA)" type="number" min={0} step="0.01" valor={viaje ? aNumero(viaje.tarifa) : undefined} ayuda="Entre depósitos puede quedar en 0: se cobra por encomienda." />
          </Grilla>
        </Seccion>

        <Seccion titulo="Asignación">
          <p className="-mt-2 text-xs text-stone-500">
            Con chofer y vehículo asignados, el viaje pasa a «Asignado» y queda listo para iniciar.
          </p>
          <Grilla columnas={3}>
            <Selector
              name="choferId"
              etiqueta="Chofer"
              valor={viaje?.choferId}
              vacio="Sin asignar"
              opciones={choferes.map((c) => ({ valor: c.id, etiqueta: `${c.apellido}, ${c.nombre}` }))}
            />
            <Selector
              name="vehiculoId"
              etiqueta="Vehículo"
              valor={viaje?.vehiculoId}
              vacio="Sin asignar"
              opciones={vehiculos.filter((v) => (TIPOS_TRACCION as readonly string[]).includes(v.tipo)).map(opcionVehiculo)}
            />
            <Selector
              name="acopladoId"
              etiqueta="Semi / acoplado"
              valor={viaje?.acopladoId}
              vacio="Ninguno"
              opciones={vehiculos.filter((v) => (TIPOS_ARRASTRE as readonly string[]).includes(v.tipo)).map(opcionVehiculo)}
            />
          </Grilla>
        </Seccion>

        <Seccion titulo="Documentación">
          <Grilla>
            <Entrada name="cartaPorte" etiqueta="Carta de porte / CTG" valor={viaje?.cartaPorte} />
            <Entrada name="remito" etiqueta="Remito" valor={viaje?.remito} />
            <AreaTexto name="observaciones" etiqueta="Observaciones" valor={viaje?.observaciones} className="sm:col-span-2" />
          </Grilla>
        </Seccion>

        <div className="flex gap-2 border-t border-stone-100 pt-5">
          <BotonEnviar>{viaje ? "Guardar cambios" : "Crear viaje"}</BotonEnviar>
          <BotonLink href={viaje ? `/viajes/${viaje.id}` : "/viajes"} variante="secundario">
            Cancelar
          </BotonLink>
        </div>
      </Form>
    </Tarjeta>
  );
}
