"use client";

import { createContext, useActionState, useContext, type InputHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { EstadoForm } from "@/lib/validacion";
import { claseBoton, claseInput, cx } from "@/components/ui";

type Accion = (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;

const ContextoForm = createContext<EstadoForm>(undefined);

/**
 * Formulario conectado a una server action. Los campos hijos leen del
 * contexto sus errores y, si la validación falló, el valor que se envió.
 */
export function Form({
  accion,
  children,
  className,
}: {
  accion: Accion;
  children: ReactNode;
  className?: string;
}) {
  const [estado, accionForm] = useActionState(accion, undefined);
  return (
    <ContextoForm value={estado}>
      <form action={accionForm} className={cx("space-y-5", className)} noValidate>
        {estado?.mensaje && (
          <div
            role="alert"
            className={cx(
              "rounded-lg px-4 py-3 text-sm",
              estado.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700",
            )}
          >
            {estado.mensaje}
          </div>
        )}
        {children}
      </form>
    </ContextoForm>
  );
}

function useCampo(name: string, valorInicial?: string | number | null) {
  const estado = useContext(ContextoForm);
  const errores = estado?.errores?.[name];
  const valor = estado?.valores?.[name] ?? (valorInicial == null ? "" : String(valorInicial));
  return { errores, valor };
}

function Campo({
  name,
  etiqueta,
  ayuda,
  errores,
  className,
  children,
}: {
  name: string;
  etiqueta: string;
  ayuda?: string;
  errores?: string[];
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-stone-700">
        {etiqueta}
      </label>
      {children}
      {errores?.length ? (
        <p className="mt-1 text-xs text-red-600">{errores[0]}</p>
      ) : (
        ayuda && <p className="mt-1 text-xs text-stone-500">{ayuda}</p>
      )}
    </div>
  );
}

type PropsBase = {
  name: string;
  etiqueta: string;
  valor?: string | number | null;
  ayuda?: string;
  className?: string;
  requerido?: boolean;
};

export function Entrada({
  name,
  etiqueta,
  valor,
  ayuda,
  className,
  requerido,
  type = "text",
  ...resto
}: PropsBase & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue">) {
  const campo = useCampo(name, valor);
  return (
    <Campo name={name} etiqueta={requerido ? `${etiqueta} *` : etiqueta} ayuda={ayuda} errores={campo.errores} className={className}>
      <input
        id={name}
        name={name}
        type={type}
        // key: al volver un error, fuerza que el input tome el valor enviado
        key={campo.valor}
        defaultValue={campo.valor}
        aria-invalid={!!campo.errores}
        className={cx(claseInput, campo.errores && "ring-red-400")}
        {...resto}
      />
    </Campo>
  );
}

export function AreaTexto({
  name,
  etiqueta,
  valor,
  ayuda,
  className,
  filas = 3,
}: PropsBase & { filas?: number }) {
  const campo = useCampo(name, valor);
  return (
    <Campo name={name} etiqueta={etiqueta} ayuda={ayuda} errores={campo.errores} className={className}>
      <textarea
        id={name}
        name={name}
        rows={filas}
        key={campo.valor}
        defaultValue={campo.valor}
        className={cx(claseInput, campo.errores && "ring-red-400")}
      />
    </Campo>
  );
}

export function Selector({
  name,
  etiqueta,
  valor,
  ayuda,
  className,
  requerido,
  opciones,
  vacio,
}: PropsBase & {
  opciones: { valor: string; etiqueta: string }[];
  /** Texto de la opción vacía; si se omite, no hay opción vacía. */
  vacio?: string;
}) {
  const campo = useCampo(name, valor);
  return (
    <Campo name={name} etiqueta={requerido ? `${etiqueta} *` : etiqueta} ayuda={ayuda} errores={campo.errores} className={className}>
      <select
        id={name}
        name={name}
        key={campo.valor}
        defaultValue={campo.valor}
        className={cx(claseInput, campo.errores && "ring-red-400")}
      >
        {vacio !== undefined && <option value="">{vacio}</option>}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </Campo>
  );
}

export function Casilla({ name, etiqueta, valor }: { name: string; etiqueta: string; valor?: boolean }) {
  const estado = useContext(ContextoForm);
  const enviado = estado?.valores ? estado.valores[name] === "on" : undefined;
  const marcado = enviado ?? !!valor;
  return (
    <label className="flex items-center gap-2 text-sm text-stone-700">
      <input
        type="checkbox"
        name={name}
        key={String(marcado)}
        defaultChecked={marcado}
        className="size-4 rounded border-stone-300 text-marca-600 focus:ring-marca-600"
      />
      {etiqueta}
    </label>
  );
}

export function BotonEnviar({
  children,
  variante = "primario",
  chico,
  confirmar,
  name,
  value,
}: {
  children: ReactNode;
  variante?: "primario" | "secundario" | "peligro";
  chico?: boolean;
  /** Pide confirmación al usuario antes de enviar. */
  confirmar?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={claseBoton(variante, chico)}
      onClick={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      {pending ? "Guardando…" : children}
    </button>
  );
}

export function Grilla({ children, columnas = 2 }: { children: ReactNode; columnas?: 2 | 3 | 4 }) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columnas];
  return <div className={cx("grid grid-cols-1 gap-4", cols)}>{children}</div>;
}
