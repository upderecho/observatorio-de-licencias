import Link from "next/link";
import {
  type StateOfArt,
  type ProductReading,
  type ProductScore,
  type ScoreSignal,
  topSignals,
} from "@/domain/stateOfArt";
import { EscenariosGate } from "@/components/featureGates";

/**
 * Estado del arte como DOCUMENTO DE LECTURA (no dashboard): prosa jurídica
 * preliminar, en lenguaje claro, con enlaces a los documentos del corpus que
 * sostienen cada afirmación. El scoring queda internamente en el dominio; acá no
 * se muestran índices ni métricas como protagonistas.
 */
export function StateOfArtReading({ state }: { state: StateOfArt }) {
  const { mostRestrictiveProduct: restrictive, mostExposedLegalPracticeProduct: exposed } = state;

  return (
    <article className="max-w-3xl space-y-7 text-base leading-relaxed text-slate-700">
      {/* 1 · Qué revela el corpus */}
      <p className="text-lg leading-relaxed text-slate-800">{state.generalReading}</p>

      {/* 2 · Por qué leer con criterio jurídico */}
      <Section title="Por qué leer software con criterio jurídico">
        <p>{state.whyLegalCriteria}</p>
      </Section>

      {/* 3 · IA vs. software cotidiano */}
      <Section title="Qué cambia con la IA frente al software cotidiano">
        <p>{state.aiVsEveryday}</p>
      </Section>

      {/* 4 · Mayores cautelas */}
      {state.keyCautions.length > 0 && (
        <Section title="Dónde aparecen las mayores cautelas">
          <p>
            Según el corpus actual, las cláusulas que conviene revisar con más atención, por su frecuencia en los
            documentos de IA analizados, son{" "}
            {state.keyCautions.slice(0, 3).map((z, i, arr) => (
              <span key={z.categoryKey}>
                {i > 0 && (i === arr.length - 1 ? " y " : ", ")}
                <strong className="font-medium text-slate-900">{z.label.toLowerCase()}</strong>{" "}
                <span className="text-slate-500">
                  (
                  {z.exampleDocumentId ? (
                    <Link href={`/analysis/${z.exampleDocumentId}`} className="text-sky-700 hover:underline">
                      {z.count} de {z.total} documentos
                    </Link>
                  ) : (
                    <>
                      {z.count} de {z.total} documentos
                    </>
                  )}
                  )
                </span>
              </span>
            ))}
            . No surge de estas frecuencias una conclusión sobre validez: indican dónde concentrar la lectura.
          </p>
        </Section>
      )}

      {state.insufficientEvidence ? (
        <Section title="Lectura por producto">
          <p>
            El corpus actual no reúne evidencia suficiente para señalar, con fundamento, un producto más restrictivo o
            uno donde la práctica legal quede más expuesta. La lectura se ampliará a medida que se incorporen documentos.
          </p>
        </Section>
      ) : (
        <>
          {/* 5 · Producto más restrictivo */}
          {restrictive && (
            <Section title="El producto que aparece como más restrictivo">
              <p>
                Según el corpus actual, el producto cuyo clausulado aparece como más restrictivo es{" "}
                <ProductLink reading={restrictive} />. La evidencia disponible reúne {reasonsProse(restrictive.restrictiveness)}.
                Este documento debería leerse con especial atención antes de un uso profesional. Se trata de una lectura
                según el corpus analizado, no de una conclusión universal.
              </p>
              <Citation signal={topSignals(restrictive.restrictiveness, 1)[0]} />
            </Section>
          )}

          {/* 6 · Dónde la práctica legal queda más expuesta */}
          {exposed && (
            <Section title="Dónde la práctica legal queda más expuesta">
              <p>
                La práctica legal queda más expuesta, según la evidencia disponible, al usar <ProductLink reading={exposed} />.
                Allí confluyen {reasonsProse(exposed.exposure)}. {exposureModality(exposed)}
              </p>
              <Citation signal={topSignals(exposed.exposure, 1)[0]} />
            </Section>
          )}
        </>
      )}

      {/* 7 · Qué leer primero */}
      {state.documentsToReadFirst.length > 0 && (
        <Section title="Qué debería leer primero un abogado">
          <p>
            Para situarse rápido, la evidencia disponible sugiere empezar por estos documentos del corpus, que son los que
            más pesan en la lectura anterior:
          </p>
          <ul className="mt-2 space-y-1">
            {state.documentsToReadFirst.map((d) => (
              <li key={d.id} className="leading-relaxed">
                <Link href={`/analysis/${d.id}`} className="font-medium text-sky-700 hover:underline">
                  {d.providerName} · {d.productName} — {d.documentType}
                </Link>
                <span className="text-slate-600">: {d.reason}.</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 8 · Qué no puede concluirse */}
      <Section title="Qué no puede concluirse todavía">
        <ul className="space-y-1.5 text-sm leading-relaxed text-slate-500">
          {state.limitations.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </Section>

      {/* Respaldo: corpus, dossiers y escenarios */}
      <p className="border-t border-slate-200 pt-4 text-sm leading-relaxed text-slate-500">
        Cada afirmación de esta lectura enlaza al dossier del documento citado. Para profundizar, recorré el{" "}
        <Link href="/analyses" className="text-sky-700 hover:underline">corpus documental</Link>, los{" "}
        <Link href="/providers" className="text-sky-700 hover:underline">expedientes por proveedor</Link>
        <EscenariosGate>
          {" "}o seguí un{" "}
          <Link href="/escenarios" className="text-sky-700 hover:underline">escenario de uso</Link> como recorrido de lectura
        </EscenariosGate>
        . El corpus y los dossiers son el respaldo de esta opinión preliminar.
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="font-serif text-lg font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function ProductLink({ reading }: { reading: ProductReading }) {
  return (
    <Link href={`/providers/${reading.providerId}`} className="font-medium text-sky-700 hover:underline">
      {reading.providerName} · {reading.productName}
    </Link>
  );
}

/** Convierte las 3 señales principales en una enumeración en prosa. */
function reasonsProse(score: ProductScore): string {
  const labels = topSignals(score, 3).map((s) => s.label.toLowerCase());
  if (labels.length === 0) return "señales diversas en su clausulado";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
}

/** Frase sobre de qué modalidad depende la exposición y qué leer primero. */
function exposureModality(reading: ProductReading): string {
  const general = reading.exposure.signals.some((s) => s.key === "general_scope");
  const noDpa = reading.exposure.signals.some((s) => s.key === "no_dpa");
  const dep = general
    ? "La exposición es mayor en la modalidad general no diferenciada, típicamente la cuenta gratuita o individual"
    : "La exposición varía según la modalidad efectivamente contratada";
  const dpa = noDpa
    ? ", ya que el corpus no registra un DPA ni términos empresariales claros que la acoten"
    : ", por lo que conviene verificar si la modalidad empresarial acota estas condiciones";
  return `${dep}${dpa}. Conviene leer primero la política de privacidad y las cláusulas de uso de datos y de licencia sobre el contenido.`;
}

/** Cita textual breve (trazabilidad), enlazada a su dossier. */
function Citation({ signal }: { signal: ScoreSignal | undefined }) {
  if (!signal?.evidence) return null;
  return (
    <p className="border-l-2 border-slate-200 pl-3 text-sm italic text-slate-500">
      “{signal.evidence.quote}”
      {signal.documentId && (
        <>
          {" "}
          <Link href={`/analysis/${signal.documentId}`} className="not-italic text-sky-700 hover:underline">
            {signal.documentType} →
          </Link>
        </>
      )}
    </p>
  );
}
