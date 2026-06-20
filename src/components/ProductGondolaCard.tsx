"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LicenseAnalysis, PrivacyPosture } from "@/lib/schema";
import type { RiskLevel } from "@/lib/types";
import { MODE_LABELS, type ContractingMode } from "@/lib/contractingModes";
import {
  octogonosFor,
  cautelasFor,
  nutritionLabel,
  availableModesFor,
  defaultModeFor,
  docAppliesToMode,
} from "@/domain/seals";
import { SealBadge } from "./SealBadge";
import { PrecautionaryLegend } from "./PrecautionaryLegend";
import { NutritionLabel } from "./NutritionLabel";
import { SealDetail } from "./SealDetail";
import { ProviderLogo } from "./ProviderLogo";
import { postureWord } from "./indicators";

/**
 * Góndola de UN producto (vista de impacto): la unidad es PRODUCTO × MODALIDAD.
 * El selector elige la modalidad y todo lo derivado (octógonos, cautelas, tabla)
 * se recalcula para ESA modalidad (las modalidades no se trasladan). Todo deriva
 * del corpus con `src/domain/seals.ts`; nada se afirma sin evidencia.
 */

const RISK_WORD: Record<RiskLevel, string> = { low: "bajo", medium: "medio", high: "alto", unknown: "—" };
const RISK_DOT: Record<RiskLevel, string> = {
  low: "text-emerald-600",
  medium: "text-amber-600",
  high: "text-red-600",
  unknown: "text-slate-300",
};
const POSTURE_RANK: Record<PrivacyPosture, number> = { strong: 3, moderate: 2, weak: 1, unknown: 0 };
const MODE_ORDER: ContractingMode[] = [
  "free", "all", "paid_individual", "team", "business", "enterprise", "api", "education", "open_source", "unknown",
];

export function ProductGondolaCard({
  providerId,
  productName,
  analyses,
  logoSrc,
  showProviderLink = true,
}: {
  providerId: string;
  productName: string;
  analyses: LicenseAnalysis[];
  /** Logo del proveedor ya resuelto (con basePath); undefined → monograma. */
  logoSrc?: string;
  /** Oculta el link "ver expediente" cuando ya estamos en la página del proveedor. */
  showProviderLink?: boolean;
}) {
  const modes = useMemo(
    () => [...availableModesFor(analyses)].sort((a, b) => MODE_ORDER.indexOf(a) - MODE_ORDER.indexOf(b)),
    [analyses],
  );
  const [mode, setMode] = useState<ContractingMode>(() => defaultModeFor(analyses));
  const [openOcta, setOpenOcta] = useState<string | null>(null);
  const [openCautela, setOpenCautela] = useState<string | null>(null);

  const octagons = useMemo(() => octogonosFor(analyses, mode), [analyses, mode]);
  const cautelas = useMemo(() => cautelasFor(analyses, mode), [analyses, mode]);
  const label = useMemo(() => nutritionLabel(analyses, mode), [analyses, mode]);
  const weakestPrivacy = useMemo<PrivacyPosture>(() => {
    const applicable = analyses.filter((a) => docAppliesToMode(a, mode));
    if (applicable.length === 0) return "unknown";
    return applicable
      .map((a) => a.privacy.posture)
      .reduce((acc, p) => (POSTURE_RANK[p] < POSTURE_RANK[acc] ? p : acc), applicable[0].privacy.posture);
  }, [analyses, mode]);

  const worst = label.riskRead?.level ?? "unknown";
  const selectId = `gondolamode-${providerId}-${slug(productName)}`;
  const selectedOcta = octagons.find((o) => o.categoryKey === openOcta) ?? null;
  const selectedCautela = cautelas.find((c) => c.key === openCautela) ?? null;

  return (
    <article className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      {/* 1 · Header */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <ProviderLogo src={logoSrc} providerId={providerId} providerName={analyses[0]?.providerName ?? providerId} size={24} />
          <h3 className="font-serif text-lg font-semibold text-slate-900">{productName}</h3>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor={selectId} className="text-xs text-slate-500">Modalidad</label>
          <select
            id={selectId}
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as ContractingMode);
              setOpenOcta(null);
              setOpenCautela(null);
            }}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
          >
            {modes.map((m) => (
              <option key={m} value={m}>{MODE_LABELS[m]}</option>
            ))}
          </select>
          {showProviderLink && (
            <Link href={`/providers/${providerId}`} className="text-xs text-sky-700 hover:underline">ver expediente →</Link>
          )}
        </div>
      </header>

      {/* 2 · Línea de riesgo */}
      <p className="text-sm text-slate-600">
        <span className={RISK_DOT[worst]} aria-hidden>●</span> riesgo {RISK_WORD[worst]}
        <span className="mx-1 text-slate-300">·</span>
        privacidad {postureWord(weakestPrivacy)}
        <span className="mx-1 text-slate-300">·</span>
        {octagons.length} advertencia{octagons.length !== 1 ? "s" : ""} · {cautelas.length} cautela{cautelas.length !== 1 ? "s" : ""}
      </p>

      {/* 3 · Advertencias: tira horizontal de octógonos */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Advertencias</h4>
        {octagons.length > 0 ? (
          <>
            <div className="mt-2 flex flex-wrap gap-4">
              {octagons.map((o) => (
                <div key={o.categoryKey} className="flex w-[112px] flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setOpenOcta((k) => (k === o.categoryKey ? null : o.categoryKey))}
                    aria-expanded={openOcta === o.categoryKey}
                    aria-label={`${openOcta === o.categoryKey ? "Ocultar" : "Ver"} evidencia de: ${o.label}`}
                    className="rounded outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
                  >
                    <SealBadge lines={o.lines} label={o.label} />
                  </button>
                  <span className="text-center text-[11px] leading-tight text-slate-600">{o.label}</span>
                </div>
              ))}
            </div>
            {selectedOcta && <SealDetail title={selectedOcta.label} sources={selectedOcta.sources} />}
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            No se detectaron cláusulas de riesgo alto para esta modalidad en el corpus. No implica ausencia: puede faltar el documento aplicable.
          </p>
        )}
      </div>

      {/* 4 · Cautelas */}
      {cautelas.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cautelas</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {cautelas.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setOpenCautela((k) => (k === c.key ? null : c.key))}
                aria-expanded={openCautela === c.key}
                className="rounded outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
              >
                <PrecautionaryLegend text={c.text} />
              </button>
            ))}
          </div>
          {selectedCautela && <SealDetail title={selectedCautela.text} sources={selectedCautela.sources} />}
        </div>
      )}

      {/* 5 · Tabla nutricional desplegada (grid) */}
      <div className="border-t border-slate-200 pt-3">
        <NutritionLabel data={label} variant="grid" />
      </div>
    </article>
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
