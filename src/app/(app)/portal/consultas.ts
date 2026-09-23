import type { EstadoEnvio } from "@/generated/prisma/enums";

export const ENVIOS_ACTIVOS: EstadoEnvio[] = ["RECIBIDO", "EN_TRANSITO", "EN_DESTINO", "EN_REPARTO"];

export const INCLUDE_ENVIO = {
  depositoOrigen: { select: { nombre: true } },
  depositoDestino: { select: { nombre: true } },
} as const;
