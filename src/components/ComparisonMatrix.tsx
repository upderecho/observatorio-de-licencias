"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LicenseAnalysis, CategoryFinding } from "@/lib/schema";
import type { RiskLevel } from "@/lib/types";
import { MATRIX_CATEGORIES } from "@/lib/categories";
import { CONTRACTING_MODES } from "@/lib/contractingModes";
import { sourceKind, MODE_LABELS, ALL_MODE_EXPLANATION, COMPARISON_GROUP_LABEL } from "@/lib/analysisMeta";

type SourceFilter = "all" | "verified" | "unverified";
type View = "mode" | "provider" | "group";

const GROUP_ORDER: Record<string, number> = { ai: 0, traditional_software: 1, social_platform: 2, mobile_ecosystem: 3 };

const DATA_ROWS = new Set(["privacy", "training_use", "data_retention", "data_deletion"]);
const MODE_ORDER = new Map(CONTRACTING_MODES.map((m, i) => [m, i]));

const STATUS_WORD: Record<CategoryFinding["status"], string> = { found: "detectada", not_found: "no detectada", unclear: "ambigua" };
const STATUS_DOT: Record<CategoryFinding["status"], string> = { found: "text-sky-700", not_found: "text-slate-300", unclear: "text-amber-600" };
const RISK_WORD: Record<RiskLevel, string> = { low: "bajo", medium: "medio", high: "alto", unknown: "—" };
const RISK_DOT: Record<RiskLevel, string> = { low: "text-emerald-600", medium: "text-amber-600", high: "text-red-600", unknown: "text-slate-300" };
const POSTURE_WORD: Record<string, string> = { strong: "fuerte", moderate: "moderada", weak: "débil", unknown: "sin datos" };

/**
 * Matriz comparativa densa y sobria. Eje primario: modalidad (también por
 * proveedor). Sin cápsulas grandes: puntos + texto compacto en cada celda.
 */
export function ComparisonMatrix({ analyses }: { analyses: LicenseAnalysis[] }) {
  const [view, setView] = useState<View>("mode");
  const [source, setSource] = useState<SourceFilter>("all");
  const [provider, setProvider] = useState("");
  const [product, setProduct] = useState("");
  const [modality, setModality] = useState("");
  const [docType, setDocType] = useState("");
  const [risk, setRisk] = useState("");
  const [posture, setPosture] = useState("");
  const [review, setReview] = useState("");
  const [group, setGroup] = useState("");

  const filtered = useMemo(() => {
    const out = analyses.filter((a) => {
      if (source !== "all" && sourceKind(a) !== source) return false;
      if (provider && a.providerName !== provider) return false;
      if (product && a.productName !== product) return false;
      if (modality && a.contractingMode !== modality) return false;
      if (docType && a.documentType !== docType) return false;
      if (risk && a.overall.overallRiskLevel !== risk) return false;
      if (posture && a.privacy.posture !== posture) return false;
      if (review && a.metadata.reviewStatus !== review) return false;
      if (group && a.comparisonGroup !== group) return false;
      return true;
    });
    out.sort((a, b) => {
      if (view === "group") {
        const d = (GROUP_ORDER[a.comparisonGroup] ?? 99) - (GROUP_ORDER[b.comparisonGroup] ?? 99);
        if (d !== 0) return d;
        return a.providerName.localeCompare(b.providerName) || a.documentType.localeCompare(b.documentType);
      }
      if (view === "mode") {
        const d = (MODE_ORDER.get(a.contractingMode) ?? 99) - (MODE_ORDER.get(b.contractingMode) ?? 99);
        if (d !== 0) return d;
        return a.providerName.localeCompare(b.providerName) || a.documentType.localeCompare(b.documentType);
      }
      return a.providerName.localeCompare(b.providerName) || a.productName.localeCompare(b.productName) || a.documentType.localeCompare(b.documentType);
    });
    return out;
  }, [analyses, view, source, provider, product, modality, docType, risk, posture, review, group]);

  return (
    <div className="space-y-3">
      {/* Agrupación (no filtro): cómo ordenar las columnas de la matriz. */}
      <div className="flex flex-wrap items-end gap-3 rounded border border-slate-200 bg-white p-3 text-sm">
        <Segmented label="Agrupar por" value={view} onChange={(v) => setView(v as View)} options={[{ value: "mode", label: "Modalidad" }, { value: "provider", label: "Proveedor" }, { value: "group", label: "IA vs tradicional" }]} />
      </div>

      {view === "group" && (
        <p className="rounded border border-l-4 border-slate-200 border-l-gold-500 bg-white p-3 text-xs leading-relaxed text-slate-600">
          En proveedores de IA, la categoría &quot;uso de datos para entrenamiento o mejora de modelos&quot; puede tener
          mayor centralidad. En software tradicional, puede aparecer bajo fórmulas más generales de mejora de
          servicios, analytics o personalización. La comparación requiere revisión del texto fuente.
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="rounded border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          {group && group !== "ai"
            ? "Todavía no hay documentos de software tradicional ingeridos para este grupo. Las fuentes están registradas y pendientes de verificación e ingesta."
            : "Ningún análisis coincide con los filtros."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="sticky left-0 z-10 min-w-40 bg-white px-3 py-2 text-left font-semibold text-slate-600">Categoría</th>
                {filtered.map((a) => (
                  <th key={a.id} className="min-w-56 border-l border-slate-100 px-3 py-2 text-left align-top font-normal">
                    <Link href={`/analysis/${a.id}`} className="font-semibold text-slate-900 hover:underline">{a.providerName}</Link>
                    <div className="text-slate-500">{a.productName}</div>
                    <div className="mt-0.5 text-slate-700">{MODE_LABELS[a.contractingMode]}</div>
                    <div className="text-xs text-slate-400">{a.documentType}</div>
                    <div className="text-xs text-slate-400">{COMPARISON_GROUP_LABEL[a.comparisonGroup] ?? a.comparisonGroup}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_CATEGORIES.map((cat) => (
                <tr key={cat.key} className="border-b border-slate-100 align-top last:border-0">
                  <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-slate-700">{cat.label}</th>
                  {filtered.map((a) => {
                    const f = a.categories[cat.key];
                    if (!f) return <td key={a.id} className="border-l border-slate-100 px-3 py-2 text-slate-300">—</td>;
                    const summary = f.legalSummary;
                    return (
                      <td key={a.id} className="border-l border-slate-100 px-3 py-2">
                        <div className="text-slate-700">
                          <span className={STATUS_DOT[f.status]}>●</span> {STATUS_WORD[f.status]}
                          {f.status !== "not_found" && (
                            <>
                              <span className="mx-1 text-slate-300">·</span>
                              riesgo <span className={RISK_DOT[f.riskLevel]}>●</span> {RISK_WORD[f.riskLevel]}
                            </>
                          )}
                          {DATA_ROWS.has(cat.key) && (
                            <>
                              <span className="mx-1 text-slate-300">·</span>
                              priv. {POSTURE_WORD[a.privacy.posture]}
                            </>
                          )}
                        </div>
                        {f.modeSpecificity === "mode_specific" && f.appliesToModes.length > 0 && (
                          <div className="mt-0.5 text-xs text-gold-600">específico: {f.appliesToModes.map((m) => MODE_LABELS[m]).join(", ")}</div>
                        )}
                        <p className="mt-1 line-clamp-2 text-slate-500">{summary}</p>
                        <Link href={`/analysis/${a.id}#cat-${cat.key}`} className="mt-1 inline-block text-sky-700 hover:underline">evidencia ({f.evidence.length})</Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-400">{ALL_MODE_EXPLANATION}</p>
    </div>
  );
}


function Segmented({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <div className="inline-flex rounded border border-slate-300 bg-white p-0.5">
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} className={`rounded px-2 py-1 text-xs font-medium ${value === o.value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
