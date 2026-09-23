import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { normalizarCodigo } from "@/lib/envios";
import { FormCodigo } from "./form-codigo";

export const metadata: Metadata = { title: "Seguí tu envío" };

export default async function PaginaSeguimiento({ searchParams }: PageProps<"/seguimiento">) {
  const { codigo } = await searchParams;
  const ingresado = typeof codigo === "string" ? codigo : "";
  const normalizado = ingresado ? normalizarCodigo(ingresado) : null;
  if (normalizado) redirect(`/seguimiento/${normalizado}`);

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm sm:flex">
      <Image
        src="/marca/entrega.jpg"
        alt="Entrega de una encomienda"
        width={591}
        height={371}
        priority
        sizes="(max-width: 640px) 100vw, 260px"
        className="h-48 w-full object-cover sm:h-auto sm:w-2/5"
      />
      <div className="p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-stone-900">¿Dónde está mi envío?</h1>
        <p className="mt-1 mb-5 text-sm text-stone-600">
          Ingresá el código de seguimiento que figura en tu comprobante.
        </p>
        <FormCodigo valor={ingresado} />
        {ingresado && !normalizado && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            El código tiene 8 letras y números, por ejemplo K7PM-X3QA.
          </p>
        )}
      </div>
    </div>
  );
}
