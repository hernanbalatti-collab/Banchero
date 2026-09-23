import * as z from "zod";
import { Prisma } from "@/generated/prisma/client";

/** Resultado que devuelven las server actions de formularios. */
export type EstadoForm =
  | {
      errores?: Record<string, string[] | undefined>;
      mensaje?: string;
      ok?: boolean;
      // Lo enviado, para rellenar el formulario si la validación falla
      valores?: Record<string, string>;
    }
  | undefined;

const vacioANull = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") ? null : v;

const REQUERIDO = "Campo obligatorio";

export const texto = z.string({ error: REQUERIDO }).trim().min(1, REQUERIDO);

export const textoOpcional = z.preprocess(vacioANull, z.string().trim().nullable());

export const email = z.email({ error: "Email inválido" }).trim().toLowerCase();

export const emailOpcional = z.preprocess(vacioANull, email.nullable());

export const enteroOpcional = z.preprocess(
  vacioANull,
  z.coerce.number({ error: "Número inválido" }).int("Debe ser un número entero").min(0, "No puede ser negativo").nullable(),
);

export const importe = z.preprocess(
  // Vacío → undefined (obligatorio), en lugar de convertirse en 0
  (v) => {
    if (typeof v !== "string") return v;
    const s = v.trim().replace(",", ".");
    return s === "" ? undefined : Number(s);
  },
  z
    .number({ error: (iss) => (iss.input === undefined ? REQUERIDO : "Importe inválido") })
    .min(0, "No puede ser negativo")
    .transform((n) => new Prisma.Decimal(n.toFixed(2))),
);

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export const fecha = z
  .string({ error: REQUERIDO })
  .regex(FECHA_ISO, "Fecha inválida")
  .transform((s) => new Date(`${s}T00:00:00Z`));

export const fechaOpcional = z.preprocess(vacioANull, fecha.nullable());

export const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

export const cuit = z
  .string({ error: REQUERIDO })
  .trim()
  .transform((s) => s.replace(/\D/g, ""))
  .refine((s) => s.length === 11, "El CUIT debe tener 11 dígitos")
  .transform((s) => `${s.slice(0, 2)}-${s.slice(2, 10)}-${s.slice(10)}`);

export const patente = z
  .string({ error: REQUERIDO })
  .trim()
  .transform((s) => s.toUpperCase().replace(/[\s-]/g, ""))
  .refine((s) => /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/.test(s), "Patente inválida (ej: ABC123 o AB123CD)");

/**
 * Opción para refine/superRefine de objeto: por defecto zod no las corre si
 * otro campo falló, y el usuario vería los errores de a tandas. Así corren
 * siempre que los campos que usan sean válidos.
 */
export function siValidos(...campos: string[]) {
  return {
    when: (payload: z.core.ParsePayload) => !payload.issues.some((i) => campos.includes(String(i.path?.[0]))),
  };
}

/** Convierte el FormData a objeto plano de strings (sin archivos). */
export function datosForm(formData: FormData) {
  const valores: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$ACTION")) valores[k] = v;
  }
  return valores;
}

export function errorValidacion(error: z.ZodError, valores: Record<string, string>): EstadoForm {
  return {
    errores: z.flattenError(error).fieldErrors as Record<string, string[]>,
    mensaje: "Revisá los campos marcados.",
    valores,
  };
}

/** true si el error de Prisma es por un valor único duplicado. */
export function esDuplicado(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}
