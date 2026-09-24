import type {
  CondicionIva,
  EstadoEnvio,
  EstadoFactura,
  EstadoPedido,
  EstadoVehiculo,
  EstadoViaje,
  Rol,
  TipoGasto,
  TipoPedido,
  TipoVehiculo,
} from "@/generated/prisma/enums";

export type Tono = "gris" | "azul" | "ambar" | "verde" | "rojo" | "violeta";

export const ROL: Record<Rol, string> = {
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  CHOFER: "Chofer",
  CLIENTE: "Cliente",
};

export const CONDICION_IVA: Record<CondicionIva, string> = {
  RESPONSABLE_INSCRIPTO: "Responsable inscripto",
  MONOTRIBUTO: "Monotributo",
  EXENTO: "Exento",
  CONSUMIDOR_FINAL: "Consumidor final",
};

export const TIPO_VEHICULO: Record<TipoVehiculo, string> = {
  CAMION: "Camión",
  TRACTOR: "Tractor",
  SEMIRREMOLQUE: "Semirremolque",
  ACOPLADO: "Acoplado",
  UTILITARIO: "Utilitario",
};

export const ESTADO_VEHICULO: Record<EstadoVehiculo, [string, Tono]> = {
  DISPONIBLE: ["Disponible", "verde"],
  EN_VIAJE: ["En viaje", "azul"],
  MANTENIMIENTO: ["Mantenimiento", "ambar"],
  BAJA: ["Baja", "gris"],
};

export const ESTADO_VIAJE: Record<EstadoViaje, [string, Tono]> = {
  PENDIENTE: ["Pendiente", "gris"],
  ASIGNADO: ["Asignado", "violeta"],
  EN_TRANSITO: ["En tránsito", "azul"],
  ENTREGADO: ["Entregado", "verde"],
  CANCELADO: ["Cancelado", "rojo"],
};

export const ESTADO_ENVIO: Record<EstadoEnvio, [string, Tono]> = {
  RECIBIDO: ["En depósito de origen", "gris"],
  EN_TRANSITO: ["En viaje", "azul"],
  EN_DESTINO: ["En depósito de destino", "violeta"],
  EN_REPARTO: ["En reparto", "ambar"],
  ENTREGADO: ["Entregado", "verde"],
  CANCELADO: ["Cancelado", "rojo"],
};

export const TIPO_GASTO: Record<TipoGasto, string> = {
  COMBUSTIBLE: "Combustible",
  PEAJE: "Peaje",
  VIATICO: "Viático",
  MANTENIMIENTO: "Mantenimiento",
  OTRO: "Otro",
};

export const ESTADO_FACTURA: Record<EstadoFactura, [string, Tono]> = {
  EMITIDA: ["Pendiente de cobro", "ambar"],
  PAGADA: ["Cobrada", "verde"],
  ANULADA: ["Anulada", "gris"],
};

export const TIPO_PEDIDO: Record<TipoPedido, string> = {
  FLETE: "Flete",
  ENCOMIENDA: "Encomienda",
};

export const ESTADO_PEDIDO: Record<EstadoPedido, [string, Tono]> = {
  PENDIENTE: ["Por revisar", "ambar"],
  ACEPTADO: ["Aceptado", "verde"],
  RECHAZADO: ["Rechazado", "rojo"],
  CANCELADO: ["Cancelado", "gris"],
};

/** Convierte un mapa de etiquetas en opciones para un <select>. */
export function opciones<K extends string>(mapa: Record<K, string | [string, Tono]>) {
  return (Object.keys(mapa) as K[]).map((valor) => {
    const e = mapa[valor];
    const etiqueta: string = typeof e === "string" ? e : e[0];
    return { valor, etiqueta };
  });
}
