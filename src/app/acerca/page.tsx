import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";

export const metadata = { title: "Acerca del proyecto — UP-Law-AILO" };

export default function AcercaPage() {
  return (
    <PageContainer>
      <div className="max-w-3xl space-y-6">
      <Link href="/" className="text-sm text-sky-700 hover:underline">← Inicio</Link>

      <header>
        <h1 className="font-serif text-2xl font-bold text-slate-900">Propósito académico</h1>
      </header>

      <p className="text-sm leading-relaxed text-slate-700">
        UP-Law-AILO es un <strong>observatorio académico de condiciones legales de software</strong>. Su
        propósito es ayudar a abogados y estudiantes de derecho en América Latina a comprender, comparar y
        auditar los términos bajo los cuales utilizan herramientas digitales, incluyendo IA, correo,
        productividad, redes sociales y sistemas móviles.
      </p>

      <p className="text-sm leading-relaxed text-slate-700">
        Busca fortalecer el vínculo entre derecho y software. A partir de documentos públicos —términos de
        uso, políticas de privacidad y condiciones contractuales— organiza evidencia para facilitar la
        lectura jurídica, la comparación y la discusión académica. No constituye asesoramiento legal.
      </p>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">Escenarios de uso jurídico</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Son el eje práctico de la experiencia: ayudan a decidir qué herramienta usar según el tipo de
          información, el contexto profesional y la modalidad de contratación. <Link href="/escenarios" className="text-sky-700 hover:underline">Ver escenarios</Link>.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">Comparaciones académicas</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Gmail, Microsoft 365, LinkedIn, X, Android y Apple se incorporan como <strong>puntos de
          comparación</strong> frente a las herramientas de IA. Comparar IA con software ya normalizado en la
          práctica permite distinguir qué riesgos son propios de la IA y cuáles ya estaban presentes en el
          software cotidiano. La comparación siempre requiere revisión del texto fuente.
        </p>
      </section>

      <p className="text-xs leading-relaxed text-slate-500">
        Observatorio académico · lectura jurídica de software · evidencia documental pública · trazabilidad ·
        alfabetización jurídica digital. No constituye asesoramiento legal.
      </p>
      </div>
    </PageContainer>
  );
}
