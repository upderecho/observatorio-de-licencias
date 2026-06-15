import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";

export const metadata = { title: "Vista retirada — UP-Law-AILO" };

export default function RetiredDifferencesPage() {
  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl space-y-4 py-10 text-center">
      <h1 className="font-serif text-2xl font-bold text-slate-900">Esta vista fue retirada</h1>
      <p className="text-sm leading-relaxed text-slate-600">
        UP-Law-AILO ahora organiza la lectura por <strong>escenarios jurídicos</strong> y un
        <strong> corpus documental</strong>, en lugar de comparar diferencias entre modalidades.
      </p>
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <Link href="/escenarios" className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">
          Ir a Escenarios
        </Link>
        <Link href="/analyses" className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">
          Ir al Corpus documental
        </Link>
      </div>
      </div>
    </PageContainer>
  );
}
