import type { LicenseAnalysis } from "@/lib/schema";
import type { RiskLevel } from "@/lib/types";
import type { PrivacyPosture } from "@/lib/schema";
import { CATEGORY_BY_KEY } from "@/lib/categories";
import { riskRationale, topRiskCategories } from "@/lib/derive";
import {
  MODE_LABELS,
  ALL_MODE_EXPLANATION,
  SOURCE_SCOPE_LABEL,
  MODE_CONFIDENCE_LABEL,
  REVIEW_LABELS,
  SIGNAL_LABEL,
} from "@/lib/analysisMeta";

/**
 * Indicadores sobrios que reemplazan los chips. El significado vive en el
 * texto; el color es solo un refuerzo (un punto pequeño), nunca cápsulas
 * grandes compitiendo entre sí.
 */

export type Tone = "red" | "amber" | "emerald" | "sky" | "slate";

const DOT: Record<Tone, string> = {
  red: "text-red-600",
  amber: "text-amber-600",
  emerald: "text-emerald-600",
  sky: "text-sky-700",
  slate: "text-slate-400",
};

export function Dot({ tone }: { tone: Tone }) {
  return <span className={`${DOT[tone]} mr-1`} aria-hidden>●</span>;
}

const labelOf = (key: string) => CATEGORY_BY_KEY[key]?.label ?? key;

// --- mapeos sobrios (texto, no concluyente) ---
const RISK_WORD: Record<RiskLevel, string> = { low: "bajo", medium: "medio", high: "alto", unknown: "desconocido" };
const RISK_TONE: Record<RiskLevel, Tone> = { low: "emerald", medium: "amber", high: "red", unknown: "slate" };
const POSTURE_WORD: Record<PrivacyPosture, string> = { strong: "fuerte", moderate: "moderada", weak: "débil", unknown: "sin datos" };
const POSTURE_TONE: Record<PrivacyPosture, Tone> = { strong: "emerald", moderate: "sky", weak: "amber", unknown: "slate" };
const REVIEW_TONE: Record<string, Tone> = { unreviewed: "amber", needs_legal_review: "amber", reviewed: "emerald", rejected: "red" };

export const riskWord = (r: RiskLevel) => RISK_WORD[r];
export const postureWord = (p: PrivacyPosture) => POSTURE_WORD[p];

// ===== Líneas compactas (para la tabla) =====

export function RiskCompact({ analysis }: { analysis: LicenseAnalysis }) {
  const r = analysis.overall.overallRiskLevel;
  return (
    <span className="whitespace-nowrap text-slate-700">
      <Dot tone={RISK_TONE[r]} />
      {RISK_WORD[r]}
    </span>
  );
}

export function PrivacyCompact({ analysis }: { analysis: LicenseAnalysis }) {
  const p = analysis.privacy.posture;
  return (
    <span className="whitespace-nowrap text-slate-700">
      <Dot tone={POSTURE_TONE[p]} />
      {POSTURE_WORD[p]}
    </span>
  );
}

export function SourceCompact({ analysis }: { analysis: LicenseAnalysis }) {
  const verified = analysis.metadata.sourceVerified;
  return (
    <span className="whitespace-nowrap text-slate-700">
      <Dot tone={verified ? "emerald" : "amber"} />
      {verified ? "verificada técnicamente" : "sin verificar"}
    </span>
  );
}

export function ReviewCompact({ analysis }: { analysis: LicenseAnalysis }) {
  const s = analysis.metadata.reviewStatus;
  return (
    <span className="whitespace-nowrap text-slate-700">
      <Dot tone={REVIEW_TONE[s] ?? "slate"} />
      {(REVIEW_LABELS[s] ?? s).replace(/^Sin revisar$/, "sin revisar")}
    </span>
  );
}

export function ModeCompact({ analysis }: { analysis: LicenseAnalysis }) {
  return <span className="whitespace-nowrap text-slate-700">{MODE_LABELS[analysis.contractingMode]}</span>;
}

// ===== Bloques explicativos (para el dossier) =====

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t-2 border-slate-200 pt-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      <dl className="space-y-1.5 text-sm">{children}</dl>
    </section>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}

export function ModeIndicator({ analysis }: { analysis: LicenseAnalysis }) {
  const a = analysis;
  return (
    <Block title="Modalidad de contratación">
      <Line label="Modalidad">{MODE_LABELS[a.contractingMode]}</Line>
      <Line label="Aplica a">
        {a.appliesToModes.length > 0
          ? a.appliesToModes.map((m) => MODE_LABELS[m]).join(", ")
          : a.contractingMode === "all"
            ? "Todas (aplicación general)"
            : "No determinado"}
      </Line>
      <Line label="Alcance">{SOURCE_SCOPE_LABEL[a.sourceScope]}</Line>
      <Line label="Confianza">{MODE_CONFIDENCE_LABEL[a.modeConfidence]}</Line>
      <Line label="Fundamento">{a.modeRationale}</Line>
      {a.contractingMode === "all" && <Line label="Nota">{ALL_MODE_EXPLANATION}</Line>}
    </Block>
  );
}

export function PrivacyIndicator({ analysis }: { analysis: LicenseAnalysis }) {
  const a = analysis;
  return (
    <Block title="Perfil preliminar de privacidad">
      <Line label="Postura">
        <Dot tone={POSTURE_TONE[a.privacy.posture]} />
        {POSTURE_WORD[a.privacy.posture]}
      </Line>
      <Line label="Fundamento">{a.privacy.rationale}</Line>
      <Line label="Señales">
        {a.privacy.signals.length > 0
          ? a.privacy.signals.map((s) => SIGNAL_LABEL[s] ?? s).join(" · ")
          : "Sin señales suficientes."}
      </Line>
      <Line label="Modalidad aplicable">{MODE_LABELS[a.contractingMode]}</Line>
      {a.privacy.evidence.length === 0 && (
        <Line label="Evidencia">Sin evidencia textual suficiente para fundar la postura.</Line>
      )}
    </Block>
  );
}

export function RiskIndicator({ analysis }: { analysis: LicenseAnalysis }) {
  const a = analysis;
  const drivers = topRiskCategories(a, labelOf);
  return (
    <Block title="Riesgo contractual preliminar">
      <Line label="Nivel">
        <Dot tone={RISK_TONE[a.overall.overallRiskLevel]} />
        {RISK_WORD[a.overall.overallRiskLevel]}
      </Line>
      <Line label="Fundamento">{riskRationale(a, labelOf)}</Line>
      <Line label="Señales principales">
        {drivers.length > 0 ? drivers.map((d) => d.label).join(" · ") : "Sin categorías de riesgo elevado detectadas."}
      </Line>
      <Line label="Base">Parser determinístico con evidencia textual. No es conclusión jurídica.</Line>
      <Line label="Revisión">{REVIEW_LABELS[a.metadata.reviewStatus] ?? a.metadata.reviewStatus}</Line>
    </Block>
  );
}

export function ReviewIndicator({ analysis }: { analysis: LicenseAnalysis }) {
  const s = analysis.metadata.reviewStatus;
  const pending = s === "unreviewed" || s === "needs_legal_review";
  return (
    <Block title="Revisión legal">
      <Line label="Estado">
        <Dot tone={REVIEW_TONE[s] ?? "slate"} />
        {REVIEW_LABELS[s] ?? s}
      </Line>
      {pending && <Line label="Aviso">Este análisis no fue validado todavía por una persona abogada.</Line>}
    </Block>
  );
}

export function SourceIndicator({ analysis }: { analysis: LicenseAnalysis }) {
  const m = analysis.metadata;
  let host = "—";
  try {
    if (analysis.sourceUrl) host = new URL(analysis.sourceUrl).host;
  } catch {
    host = "—";
  }
  const estado = m.sourceVerified
    ? "Verificada técnicamente"
    : m.sourceStatus === "needs_manual_review"
      ? "Pendiente de revisión / sin verificar"
      : "No verificada";
  return (
    <Block title="Fuente documental">
      <Line label="Estado">
        <Dot tone={m.sourceVerified ? "emerald" : "amber"} />
        {estado}
      </Line>
      <Line label="Dominio">{host}</Line>
      <Line label="URL fuente">
        {analysis.sourceUrl ? (
          <a href={analysis.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-sky-700 underline">
            {analysis.sourceUrl}
          </a>
        ) : (
          "— no informada"
        )}
      </Line>
      <Line label="Recuperado">{m.retrievedAt ?? analysis.retrievedAt}</Line>
      {m.contentHash && <Line label="Hash">{m.contentHash.replace(/^sha256:/, "sha256:").slice(0, 23)}…</Line>}
      {m.extractionMethod && <Line label="Extracción">{m.extractionMethod}</Line>}
      {m.fetchedPath && <Line label="Documento original"><code className="text-xs">{m.fetchedPath}</code></Line>}
      <Line label="Texto extraído"><code className="text-xs">{m.extractedTextPath ?? analysis.rawTextPath}</code></Line>
    </Block>
  );
}
