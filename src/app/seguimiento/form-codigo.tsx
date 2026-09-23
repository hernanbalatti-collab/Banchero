import { claseBoton, claseInput } from "@/components/ui";

/** Formulario GET: /seguimiento?codigo=… redirige al detalle. */
export function FormCodigo({ valor }: { valor?: string }) {
  return (
    <form action="/seguimiento" className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="codigo" className="sr-only">
        Código de seguimiento
      </label>
      <input
        id="codigo"
        name="codigo"
        defaultValue={valor}
        placeholder="Ej: K7PM-X3QA"
        autoComplete="off"
        autoCapitalize="characters"
        required
        className={`${claseInput} font-mono uppercase tracking-wider sm:max-w-xs`}
      />
      <button type="submit" className={claseBoton("primario")}>
        Buscar
      </button>
    </form>
  );
}
