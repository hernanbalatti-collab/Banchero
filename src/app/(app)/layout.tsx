import { Navegacion } from "@/components/navegacion";
import { requerirUsuario } from "@/lib/dal";

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const usuario = await requerirUsuario();
  return (
    <div className="min-h-screen">
      <Navegacion nombre={usuario.nombre} rol={usuario.rol} />
      <main className="lg:pl-60 print:pl-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
