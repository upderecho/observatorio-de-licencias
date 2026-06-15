"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type ComparisonUnit,
  type ComparisonPreset,
  compareUnits,
  findDifferentialFindings,
  getEvidenceForComparison,
  CATEGORY_AXES,
} from "@/domain/comparison";
import { ComparisonMatrix } from "./ComparisonMatrix";

const MAX_UNITS = 4;
const MIN_UNITS = 2;

const STATUS_LABEL: Record<string, string> = { found: "detectada", unclear: "ambigua", not_found: "no detectada", no_data: "sin datos" };
const STATUS_DOT: Record<string, string> = { found: "text-sky-700", unclear: "text-amber-600", not_found: "text-slate-300", no_data: "text-slate-300" };
const RISK_LABEL: Record<string, string> = { low: "cautela baja", medium: "cautela media", high: "cautela alta", unknown: "cautela —" };
const RISK_DOT: Record<string, string> = { low: "text-emerald-600", medium: "text-amber-600", high: "text-red-600", unknown: "text-slate-300" };

export function ComparisonExplorer({ units, presets }: { units: ComparisonUnit[]; presets: ComparisonPreset[] }) {
  const [presetId, setPresetId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [expert, setExpert] = useState(false);
  const [openEvidence, setOpenEvidence] = useState<string | null>(null);

  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const allAnalyses = useMemo(() => units.flatMap((u) => u.analyses), [units]);

  const choosePreset = (p: ComparisonPreset) => {
    setPresetId(p.id);
    setSelected(p.unitIds.slice(0, MAX_UNITS));
    setOpenEvidence(null);
  };

  const toggleUnit = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_UNITS) return prev;
      return [...prev, id];
    });
    setOpenEvidence(null);
  };

  // --- Modo experto: matriz documental completa (sin filtros) ---
  if (expert) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-l-4 border-slate-200 border-l-gold-500 bg-white p-3 text-sm text-slate-700">
          <strong>Modo experto: matriz documental completa.</strong> Muestra todos los documentos y categorías,
          agrupados por modalidad o proveedor. Pensado para auditoría documental, no para lectura inicial.
        </div>
        <button type="button" onClick={() => setExpert(false)} className="text-sm text-sky-700 hover:underline">
          ← Volver a la comparación guiada
        </button>
        <ComparisonMatrix analyses={allAnalyses} />
      </div>
    );
  }

  // --- Paso 1: elegir comparación (presets, no filtros) ---
  if (!presetId) {
    return (
      <div className="space-y-4">
        <h2 className="font-serif text-lg font-semibold text-slate-900">Elegí una comparación</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => choosePreset(p)}
              className="group rounded-lg border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <h3 className="font-medium text-slate-900">{p.label}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.description}</p>
              <span className="mt-3 inline-block text-sm font-medium text-sky-700">
                Comparar <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setExpert(true)} className="text-sm text-slate-500 hover:text-slate-800 hover:underline">
          Abrir modo experto: matriz documental completa →
        </button>
      </div>
    );
  }

  // --- Paso 2: selección guiada + tabla compacta ---
  const preset = presets.find((p) => p.id === presetId)!;
  const chosen = selected.map((id) => unitById.get(id)).filter(Boolean) as ComparisonUnit[];
  const rows = compareUnits(chosen);
  const differentials = findDifferentialFindings(rows, selected);
  const diffKeys = new Set(differentials.map((a) => a.key));

  // Unidades ofrecidas para ajustar: las del preset + las de sus grupos.
  const groups = new Set(preset.unitIds.map((id) => unitById.get(id)?.comparisonGroup).filter(Boolean));
  const offered = units.filter((u) => preset.unitIds.includes(u.id) || groups.has(u.comparisonGroup));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold text-slate-900">{preset.label}</h2>
        <button type="button" onClick={() => { setPresetId(null); setSelected([]); }} className="text-sm text-sky-700 hover:underline">
          ← Cambiar comparación
        </button>
      </div>

      {/* Selección guiada (no filtro): construir la comparación con 2 a 4 unidades */}
      <div>
        <p className="text-sm text-slate-600">
          Comparación sugerida: <span className="text-slate-800">{chosen.map((u) => u.label).join(" · ") || "—"}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {offered.map((u) => {
            const on = selected.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggleUnit(u.id)}
                aria-pressed={on}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {u.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-slate-400">Elegí entre {MIN_UNITS} y {MAX_UNITS} unidades para comparar.</p>
      </div>

      {chosen.length < MIN_UNITS ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Elegí al menos {MIN_UNITS} unidades para ver la comparación.
        </p>
      ) : (
        <>
          {differentials.length > 0 && (
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Diferencias principales:</span>{" "}
              {differentials.map((a) => a.label).join(" · ")}.
            </p>
          )}

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                  <th className="px-3 py-2 font-medium text-slate-600">Eje jurídico</th>
                  {chosen.map((u) => (
                    <th key={u.id} className="border-l border-slate-100 px-3 py-2 font-medium text-slate-900">
                      {u.providerName}
                      <div className="text-xs font-normal text-slate-500">{u.productName}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.axis.key} className={`border-b border-slate-100 last:border-0 ${diffKeys.has(r.axis.key) ? "bg-amber-50/40" : ""}`}>
                    <td className="px-3 py-2 align-top text-slate-700">{r.axis.label}</td>
                    {chosen.map((u) => {
                      const c = r.cells[u.id];
                      const key = `${r.axis.key}__${u.id}`;
                      return (
                        <td key={u.id} className="border-l border-slate-100 px-3 py-2 align-top">
                          <div className="whitespace-nowrap text-slate-700">
                            <span className={STATUS_DOT[c.status]} aria-hidden>●</span> {STATUS_LABEL[c.status]}
                          </div>
                          <div className="whitespace-nowrap text-xs text-slate-500">
                            <span className={RISK_DOT[c.risk]} aria-hidden>●</span> {RISK_LABEL[c.risk]}
                          </div>
                          {c.evidenceCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setOpenEvidence(openEvidence === key ? null : key)}
                              className="mt-0.5 text-xs text-sky-700 hover:underline"
                            >
                              {c.evidenceCount} evid. · Ver
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {openEvidence && <EvidencePanel unitById={unitById} openKey={openEvidence} />}

          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/analyses" className="text-sky-700 hover:underline">Ver evidencia documental →</Link>
            <button type="button" onClick={() => setExpert(true)} className="text-slate-500 hover:text-slate-800 hover:underline">
              Modo experto: matriz completa →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function EvidencePanel({ unitById, openKey }: { unitById: Map<string, ComparisonUnit>; openKey: string }) {
  const [axisKey, unitId] = openKey.split("__");
  const unit = unitById.get(unitId);
  const axis = CATEGORY_AXES.find((a) => a.key === axisKey);
  if (!unit || !axis) return null;
  const evidence = getEvidenceForComparison(unit, axis);
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Evidencia · {unit.label} · {axis.label}
      </div>
      {evidence.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500">No se registró evidencia textual para este eje.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {evidence.map((e, i) => (
            <li key={i} className="text-sm">
              <span className="text-xs text-slate-400">{e.documentType}</span>
              {e.quotes.map((q, j) => (
                <p key={j} className="evidence-quote mt-0.5 border-l-2 border-slate-200 pl-2 text-xs text-slate-600">“{q}”</p>
              ))}
              <Link href={`/analysis/${e.analysisId}`} className="text-xs text-sky-700 hover:underline">Ver dossier →</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
