import { PageContainer } from "@/components/PageContainer";

export const metadata = { title: "Criterio de riesgo — UP-Law-AILO" };

const RISK: { nivel: string; texto: string }[] = [
  { nivel: "Bajo", texto: "Cláusulas de baja criticidad o informativas. Sin señales fuertes de transferencia de derechos, limitación de remedios o restricciones procesales." },
  { nivel: "Medio", texto: "Cláusulas relevantes sobre privacidad, uso o conservación de datos, jurisdicción o cambios de términos. Requiere revisión legal." },
  { nivel: "Alto", texto: "Cláusulas que podrían afectar derechos del usuario, propiedad intelectual, responsabilidad, indemnidad, arbitraje o posición procesal. No es conclusión definitiva." },
  { nivel: "Desconocido", texto: "Evidencia insuficiente o redacción ambigua. Requiere revisión manual del documento fuente." },
];

const PRIVACY: { nivel: string; texto: string }[] = [
  { nivel: "Fuerte", texto: "Compromisos relevantes de protección: límites al entrenamiento, confidencialidad, controles de retención, DPA o condiciones enterprise." },
  { nivel: "Moderada", texto: "Regula el tratamiento de datos con algunas salvaguardas, pero no alcanza para una protección fuerte." },
  { nivel: "Débil", texto: "Señales de uso amplio de datos, retención poco clara, licencias amplias o falta de controles." },
  { nivel: "Desconocida", texto: "Evidencia insuficiente para asignar una postura." },
];

export default function CriteriaPage() {
  return (
    <PageContainer>
      <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Criterio de riesgo</h1>
        <p className="text-sm text-slate-600">
          Cómo UP-Law-AILO calcula y presenta sus señales. Sirven para <strong>priorizar revisión legal
          humana</strong>, no son conclusiones jurídicas definitivas.
        </p>
      </header>

      <Concepto titulo="Riesgo contractual preliminar">
        Señal derivada de las cláusulas detectadas por el parser determinístico (responsabilidad,
        indemnidad, arbitraje, jurisdicción, propiedad intelectual, cambios de términos, entre otras).
        El nivel general surge de cuántas categorías de riesgo medio/alto se detectaron y con qué
        evidencia. No es una interpretación jurídica del contenido.
      </Concepto>

      <Concepto titulo="Perfil preliminar de privacidad">
        Postura tentativa separada del riesgo contractual. Se deriva de señales con evidencia
        (compromiso de no-entrenamiento, DPA, controles de retención/eliminación, confidencialidad,
        uso amplio de datos, licencias amplias). Un documento puede tener riesgo contractual alto y a
        la vez una postura de privacidad moderada o fuerte.
      </Concepto>

      <Concepto titulo="Fuente verificada técnicamente">
        Significa que la descarga respondió correctamente y que el dominio final coincide con un
        dominio oficial del proveedor. No implica validación del contenido jurídico ni de su vigencia.
      </Concepto>

      <Concepto titulo="Estado de revisión">
        Indica si una persona abogada validó el análisis: sin revisar, requiere revisión, revisado o
        rechazado. Por defecto, los análisis están <strong>sin revisar</strong>.
      </Concepto>

      <Concepto titulo="Cómo se calcula cada nivel">
        El parser localiza pasajes por coincidencia léxica y asigna a cada categoría un estado
        (detectada / no detectada / ambigua) y un riesgo base. El riesgo general es conservador: un
        nivel alto requiere varias categorías de alto riesgo detectadas. El perfil de privacidad se
        decide también de forma conservadora; una postura fuerte exige múltiples señales con evidencia.
      </Concepto>

      <Concepto titulo="Limitaciones del parser">
        Es léxico, no semántico: puede haber falsos positivos y negativos. La ausencia de coincidencias
        no implica ausencia de cláusula. Las heurísticas están en inglés. Toda conclusión queda sujeta a
        revisión legal humana.
      </Concepto>

      <Tabla titulo="Niveles de riesgo contractual" items={RISK} />
      <Tabla titulo="Perfiles de privacidad" items={PRIVACY} />

      <p className="rounded border border-l-4 border-slate-200 border-l-gold-500 bg-white p-3 text-sm text-slate-700">
        Estos criterios sirven para priorizar revisión legal humana. No son conclusiones jurídicas definitivas.
      </p>

      </div>
    </PageContainer>
  );
}

function Concepto({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-t-2 border-slate-200 pt-3">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">{titulo}</h2>
      <p className="text-sm text-slate-600">{children}</p>
    </section>
  );
}

function Tabla({ titulo, items }: { titulo: string; items: { nivel: string; texto: string }[] }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</h2>
      <dl className="overflow-hidden rounded border border-slate-200 bg-white">
        {items.map((it) => (
          <div key={it.nivel} className="grid grid-cols-1 gap-1 border-b border-slate-100 px-4 py-3 last:border-0 sm:grid-cols-[10rem_1fr] sm:gap-3">
            <dt className="text-sm font-semibold text-slate-900">{it.nivel}</dt>
            <dd className="text-sm text-slate-600">{it.texto}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
