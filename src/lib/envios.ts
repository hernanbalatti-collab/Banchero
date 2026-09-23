import type { EstadoEnvio, Rol } from "@/generated/prisma/enums";

/** Estados que se cambian a mano. RECIBIDO → EN_TRANSITO → EN_DESTINO los mueve el viaje. */
const TRANSICIONES: Record<EstadoEnvio, EstadoEnvio[]> = {
  RECIBIDO: ["CANCELADO"],
  EN_TRANSITO: [],
  EN_DESTINO: ["EN_REPARTO", "ENTREGADO"],
  // Si el reparto falla, vuelve al depósito
  EN_REPARTO: ["ENTREGADO", "EN_DESTINO"],
  ENTREGADO: [],
  CANCELADO: [],
};

export function transicionesEnvio(
  envio: { estado: EstadoEnvio; entregaDomicilio: boolean; repartidorId?: string | null },
  usuario?: { rol: Rol; choferId: string | null },
) {
  if (usuario?.rol === "CLIENTE") return [];
  // El chofer solo cierra los repartos que tiene asignados: entregado o de vuelta al depósito
  if (usuario?.rol === "CHOFER") {
    const esSuyo = envio.estado === "EN_REPARTO" && !!usuario.choferId && envio.repartidorId === usuario.choferId;
    return esSuyo ? (["ENTREGADO", "EN_DESTINO"] as EstadoEnvio[]) : [];
  }
  return TRANSICIONES[envio.estado].filter((e) => e !== "EN_REPARTO" || envio.entregaDomicilio);
}

/** Días completos desde una fecha hasta hoy. */
export function diasDesde(d: Date) {
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

/** Paquetes con más días que esto en un depósito se marcan como demorados. */
export const DIAS_DEMORA_DEPOSITO = 3;

export const ACCION_ENVIO: Partial<Record<EstadoEnvio, string>> = {
  EN_REPARTO: "Salió a reparto",
  ENTREGADO: "Registrar entrega",
  EN_DESTINO: "Volvió al depósito",
  CANCELADO: "Cancelar envío",
};

// Sin caracteres ambiguos (0/O, 1/I/L)
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Código público de seguimiento, ej. "K7PM-X3QA". */
export function generarCodigo() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const c = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

/** Normaliza lo que tipea el cliente: "k7pm x3qa" → "K7PM-X3QA". */
export function normalizarCodigo(entrada: string) {
  const c = entrada.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : null;
}

/** Texto público de cada estado para la página de seguimiento. */
export function descripcionPublica(estado: EstadoEnvio, deposito: string | null) {
  switch (estado) {
    case "RECIBIDO":
      return `Recibido en el depósito ${deposito ?? ""}`.trim();
    case "EN_TRANSITO":
      return `En viaje${deposito ? ` desde ${deposito}` : ""}`;
    case "EN_DESTINO":
      return `Llegó al depósito ${deposito ?? ""}`.trim();
    case "EN_REPARTO":
      return "Salió a reparto";
    case "ENTREGADO":
      return "Entregado";
    case "CANCELADO":
      return "Envío cancelado";
  }
}
