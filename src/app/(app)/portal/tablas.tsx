// Tablas del portal de clientes. Enlazan solo a páginas del portal.
import Link from "next/link";
import { Estado, Tabla, Td, Th } from "@/components/ui";
import type { EstadoEnvio, EstadoFactura, EstadoViaje } from "@/generated/prisma/enums";
import { fecha, fechaHora, moneda, numeroFactura, numeroViaje } from "@/lib/format";
import { ESTADO_ENVIO, ESTADO_FACTURA, ESTADO_VIAJE } from "@/lib/labels";

type Numerico = { toString(): string };

const claseLink = "whitespace-nowrap font-mono font-medium text-marca-700 hover:text-marca-900";

export function TablaEnviosCliente({
  envios,
}: {
  envios: {
    id: string;
    codigo: string;
    estado: EstadoEnvio;
    createdAt: Date;
    destinatarioNombre: string;
    entregaDomicilio: boolean;
    bultos: number;
    precio: Numerico;
    depositoOrigen: { nombre: string };
    depositoDestino: { nombre: string };
  }[];
}) {
  return (
    <Tabla>
      <thead>
        <tr>
          <Th>Código</Th>
          <Th>Recibido</Th>
          <Th>Destinatario</Th>
          <Th>Tramo</Th>
          <Th derecha>Bultos</Th>
          <Th>Estado</Th>
          <Th derecha>Precio</Th>
        </tr>
      </thead>
      <tbody>
        {envios.map((e) => (
          <tr key={e.id} className="hover:bg-stone-50">
            <Td>
              <Link href={`/portal/envios/${e.id}`} className={claseLink}>
                {e.codigo}
              </Link>
            </Td>
            <Td className="tabular-nums">{fechaHora(e.createdAt)}</Td>
            <Td>
              {e.destinatarioNombre}
              {e.entregaDomicilio && <div className="text-xs text-stone-500">A domicilio</div>}
            </Td>
            <Td className="whitespace-nowrap">
              {e.depositoOrigen.nombre} → {e.depositoDestino.nombre}
            </Td>
            <Td derecha>{e.bultos}</Td>
            <Td>
              <Estado par={ESTADO_ENVIO[e.estado]} />
            </Td>
            <Td derecha>{moneda(e.precio)}</Td>
          </tr>
        ))}
      </tbody>
    </Tabla>
  );
}

export function TablaFletesCliente({
  fletes,
}: {
  fletes: {
    id: string;
    numero: number;
    estado: EstadoViaje;
    origen: string;
    destino: string;
    fechaCarga: Date;
    descripcionCarga: string;
    tarifa: Numerico;
  }[];
}) {
  return (
    <Tabla>
      <thead>
        <tr>
          <Th>N.º</Th>
          <Th>Carga</Th>
          <Th>Recorrido</Th>
          <Th>Detalle</Th>
          <Th>Estado</Th>
          <Th derecha>Tarifa</Th>
        </tr>
      </thead>
      <tbody>
        {fletes.map((v) => (
          <tr key={v.id} className="hover:bg-stone-50">
            <Td>
              <Link href={`/portal/fletes/${v.id}`} className={claseLink}>
                {numeroViaje(v.numero)}
              </Link>
            </Td>
            <Td className="tabular-nums">{fecha(v.fechaCarga)}</Td>
            <Td>
              {v.origen} <span className="text-stone-400">→</span> {v.destino}
            </Td>
            <Td>{v.descripcionCarga}</Td>
            <Td>
              <Estado par={ESTADO_VIAJE[v.estado]} />
            </Td>
            <Td derecha className="whitespace-nowrap">
              {moneda(v.tarifa)}
            </Td>
          </tr>
        ))}
      </tbody>
    </Tabla>
  );
}

export function TablaFacturasCliente({
  facturas,
}: {
  facturas: {
    id: string;
    tipo: string;
    puntoVenta: number;
    numero: number;
    fecha: Date;
    vencimiento: Date | null;
    estado: EstadoFactura;
    total: Numerico;
  }[];
}) {
  return (
    <Tabla>
      <thead>
        <tr>
          <Th>Número</Th>
          <Th>Fecha</Th>
          <Th>Vencimiento</Th>
          <Th>Estado</Th>
          <Th derecha>Total</Th>
        </tr>
      </thead>
      <tbody>
        {facturas.map((f) => (
          <tr key={f.id} className="hover:bg-stone-50">
            <Td>
              <Link href={`/portal/facturas/${f.id}`} className={claseLink}>
                {numeroFactura(f)}
              </Link>
            </Td>
            <Td className="tabular-nums">{fecha(f.fecha)}</Td>
            <Td className="tabular-nums">{fecha(f.vencimiento)}</Td>
            <Td>
              <Estado par={ESTADO_FACTURA[f.estado]} />
            </Td>
            <Td derecha>{moneda(f.total)}</Td>
          </tr>
        ))}
      </tbody>
    </Tabla>
  );
}
