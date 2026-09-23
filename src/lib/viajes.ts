import type { EstadoViaje, Rol } from "@/generated/prisma/enums";

/**
 * Cambios de estado que se hacen a mano desde el detalle del viaje.
 * PENDIENTE ⇄ ASIGNADO no figura: se resuelve solo al guardar el viaje,
 * según tenga o no chofer y vehículo.
 */
const TRANSICIONES: Record<EstadoViaje, EstadoViaje[]> = {
  PENDIENTE: ["CANCELADO"],
  ASIGNADO: ["EN_TRANSITO", "CANCELADO"],
  EN_TRANSITO: ["ENTREGADO", "CANCELADO"],
  ENTREGADO: [],
  CANCELADO: [],
};

const TRANSICIONES_CHOFER: Partial<Record<EstadoViaje, EstadoViaje[]>> = {
  ASIGNADO: ["EN_TRANSITO"],
  EN_TRANSITO: ["ENTREGADO"],
};

export function transicionesPermitidas(actual: EstadoViaje, rol: Rol): EstadoViaje[] {
  if (rol === "ADMIN" || rol === "OPERADOR") return TRANSICIONES[actual];
  return rol === "CHOFER" ? (TRANSICIONES_CHOFER[actual] ?? []) : [];
}

export const ACCION_ESTADO: Partial<Record<EstadoViaje, string>> = {
  EN_TRANSITO: "Iniciar viaje",
  ENTREGADO: "Marcar como entregado",
  CANCELADO: "Cancelar viaje",
};

export const ESTADOS_ACTIVOS: EstadoViaje[] = ["PENDIENTE", "ASIGNADO", "EN_TRANSITO"];

/** Estado que corresponde a un viaje no iniciado según sus recursos. */
export function estadoSegunAsignacion(choferId: string | null, vehiculoId: string | null): EstadoViaje {
  return choferId && vehiculoId ? "ASIGNADO" : "PENDIENTE";
}

export function puedeVerViaje(
  usuario: { rol: Rol; choferId: string | null },
  viaje: { choferId: string | null },
) {
  if (usuario.rol === "ADMIN" || usuario.rol === "OPERADOR") return true;
  if (usuario.rol === "CHOFER") return usuario.choferId != null && viaje.choferId === usuario.choferId;
  // El cliente ve sus fletes desde el portal, no desde la gestión
  return false;
}
