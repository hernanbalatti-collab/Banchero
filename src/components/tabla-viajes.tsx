import Link from "next/link";
import { Estado, Tabla, Td, Th } from "@/components/ui";
import type { EstadoViaje } from "@/generated/prisma/enums";
import { fecha, moneda, numeroViaje } from "@/lib/format";
import { ESTADO_VIAJE } from "@/lib/labels";

type FilaViaje = {
  id: string;
  numero: number;
  estado: EstadoViaje;
  origen: string;
  destino: string;
  fechaCarga: Date;
  tarifa?: { toString(): string };
  cliente: { razonSocial: string } | null;
  chofer: { nombre: string; apellido: string } | null;
  vehiculo: { patente: string } | null;
};

/** Tabla de viajes. Sin `conTarifa` no muestra importes (vista del chofer). */
export function TablaViajes({ viajes, conTarifa = true }: { viajes: FilaViaje[]; conTarifa?: boolean }) {
  return (
    <Tabla>
      <thead>
        <tr>
          <Th>N.º</Th>
          <Th>Carga</Th>
          <Th>Cliente</Th>
          <Th>Recorrido</Th>
          <Th>Chofer / unidad</Th>
          <Th>Estado</Th>
          {conTarifa && <Th derecha>Tarifa</Th>}
        </tr>
      </thead>
      <tbody>
        {viajes.map((v) => (
          <tr key={v.id} className="hover:bg-stone-50">
            <Td className="whitespace-nowrap">
              <Link href={`/viajes/${v.id}`} className="font-mono font-medium text-marca-700 hover:text-marca-900">
                {numeroViaje(v.numero)}
              </Link>
            </Td>
            <Td className="tabular-nums">{fecha(v.fechaCarga)}</Td>
            <Td className="font-medium text-stone-900">
              {v.cliente?.razonSocial ?? <span className="font-normal text-stone-500">Encomiendas entre depósitos</span>}
            </Td>
            <Td>
              {v.origen} <span className="text-stone-400">→</span> {v.destino}
            </Td>
            <Td>
              {v.chofer ? `${v.chofer.apellido}, ${v.chofer.nombre}` : <span className="text-stone-400">Sin chofer</span>}
              {v.vehiculo && <div className="font-mono text-xs text-stone-500">{v.vehiculo.patente}</div>}
            </Td>
            <Td>
              <Estado par={ESTADO_VIAJE[v.estado]} />
            </Td>
            {conTarifa && <Td derecha className="whitespace-nowrap">{moneda(v.tarifa)}</Td>}
          </tr>
        ))}
      </tbody>
    </Tabla>
  );
}
