/**
 * Parser determinístico local de UP-Law-AILO.
 *
 * NO usa ningún LLM ni servicio externo. Detecta categorías jurídicas por
 * coincidencia de palabras clave y devuelve un análisis estructurado, con
 * lenguaje deliberadamente prudente y evidencia textual para cada hallazgo.
 *
 * Está diseñado para ser reemplazable: la firma `parseLicense` puede mantenerse
 * mientras su implementación interna pasa, en el futuro, a un parser con LLM.
 */

import { CATEGORIES, CATEGORY_BY_KEY, type CategoryConfig } from "./categories";
import type {
  CategoryFinding,
  ClauseFunction,
  Evidence,
  LicenseAnalysis,
  ModeConfidence,
  ModeSpecificity,
  PrivacyProfile,
  PrivacyPosture,
  SourceScope,
  SoftwareCategory,
  ComparisonGroup,
} from "./schema";
import { classifyClause, splitSentences } from "./clauseDirection";
import { STRONG_MODE_PHRASES, DIFFERENTIATION_CUE, type ContractingMode } from "./contractingModes";
import type { RiskLevel } from "./types";

export const PARSER_VERSION = "0.3.0";

export interface ParseLicenseParams {
  id: string;
  providerName: string;
  productName: string;
  productTier: string;
  documentType: string;
  sourceUrl: string | null;
  retrievedAt: string;
  rawTextPath: string;
  rawText: string;
  isMock?: boolean;
  // --- Modalidad (autoridad: el registro de fuentes). Defaults conservadores. ---
  contractingMode?: ContractingMode;
  appliesToModes?: ContractingMode[];
  sourceScope?: SourceScope;
  // --- Taxonomía de software (autoridad: el registro). Default IA. ---
  softwareCategory?: SoftwareCategory;
  comparisonGroup?: ComparisonGroup;
  comparativeBaseline?: boolean;
  academicPurposeNotes?: string;
}

const MAX_EVIDENCE_PER_CATEGORY = 3;
const SNIPPET_RADIUS = 120;

/** Normaliza espacios en blanco de un fragmento. */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Extrae un fragmento de evidencia alrededor de una coincidencia, recortado a
 * límites de palabra, e incluye una pista de ubicación. Devuelve el contexto,
 * no solo la palabra clave.
 */
function extractSnippet(original: string, matchIndex: number, matchLen: number, keyword: string): Evidence {
  let start = Math.max(0, matchIndex - SNIPPET_RADIUS);
  let end = Math.min(original.length, matchIndex + matchLen + SNIPPET_RADIUS);

  // Recorta a límites de palabra para no cortar a la mitad.
  if (start > 0) {
    const space = original.indexOf(" ", start);
    if (space !== -1 && space < matchIndex) start = space + 1;
  }
  if (end < original.length) {
    const space = original.lastIndexOf(" ", end);
    if (space !== -1 && space > matchIndex + matchLen) end = space;
  }

  const prefix = start > 0 ? "… " : "";
  const suffix = end < original.length ? " …" : "";
  const quote = `${prefix}${collapseWhitespace(original.slice(start, end))}${suffix}`;

  return {
    quote,
    locationHint: `coincidencia: "${keyword}" (~offset ${matchIndex})`,
  };
}

/** Busca todas las apariciones de un conjunto de keywords y arma evidencias. */
function collectEvidence(original: string, lower: string, keywords: string[]): { evidence: Evidence[]; matched: string[] } {
  const evidence: Evidence[] = [];
  const matched: string[] = [];
  const usedOffsets: number[] = [];

  for (const keyword of keywords) {
    const needle = keyword.toLowerCase();
    let from = 0;
    let foundThisKeyword = false;

    while (evidence.length < MAX_EVIDENCE_PER_CATEGORY) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;
      foundThisKeyword = true;

      // Evita evidencias casi idénticas (offsets muy cercanos).
      const tooClose = usedOffsets.some((o) => Math.abs(o - idx) < SNIPPET_RADIUS);
      if (!tooClose) {
        evidence.push(extractSnippet(original, idx, needle.length, keyword));
        usedOffsets.push(idx);
      }
      from = idx + needle.length;
    }

    if (foundThisKeyword) matched.push(keyword);
    if (evidence.length >= MAX_EVIDENCE_PER_CATEGORY) break;
  }

  return { evidence, matched };
}

/** Genera el resumen técnico-jurídico (abogados), prudente. */
function legalSummary(cat: CategoryConfig, status: CategoryFinding["status"]): string {
  switch (status) {
    case "found":
      return `Se identifican pasajes vinculados a ${cat.legalConcern}. La cláusula podría configurar disposiciones relevantes; su alcance no surge con claridad del texto analizado y requeriría revisión legal humana.`;
    case "unclear":
      return `La redacción relativa a ${cat.legalConcern} resulta ambigua. No surge con claridad del texto analizado y requeriría revisión legal humana.`;
    case "not_found":
      return `No surge del texto analizado una cláusula expresa sobre ${cat.legalConcern}. La ausencia de coincidencias léxicas no permite concluir su inexistencia.`;
  }
}

function notesFor(status: CategoryFinding["status"], matched: string[]): string {
  const base = "Análisis generado por parser determinístico (coincidencia de palabras clave). Requiere revisión humana.";
  if (status === "found") return `${base} Términos detectados: ${matched.join(", ")}.`;
  if (status === "unclear") return `${base} Solo se hallaron señales débiles o ambiguas: ${matched.join(", ")}.`;
  return `${base} No se hallaron coincidencias léxicas relevantes.`;
}

/** Hallazgo base (sin anotación de modalidad, que se agrega luego). */
type BaseFinding = Omit<CategoryFinding, "appliesToModes" | "modeSpecificity" | "modeEvidence">;

/** Dirección jurídica neutra (categorías no sensibles a la dirección). */
const NEUTRAL_DIRECTION = {
  actor: "unclear",
  obligationTarget: "unclear",
  clauseFunction: "unclear",
} as const;

/** Analiza una sola categoría sobre el texto (clasificación léxica neutra). */
function analyzeCategory(cat: CategoryConfig, original: string, lower: string): BaseFinding {
  const strong = collectEvidence(original, lower, cat.strongKeywords);

  if (strong.matched.length > 0) {
    return {
      status: "found",
      riskLevel: cat.riskWhenFound,
      legalSummary: legalSummary(cat, "found"),
      evidence: strong.evidence,
      notes: notesFor("found", strong.matched),
      ...NEUTRAL_DIRECTION,
    };
  }

  const ambiguous = collectEvidence(original, lower, cat.ambiguousKeywords);
  if (ambiguous.matched.length > 0) {
    return {
      status: "unclear",
      riskLevel: "unknown",
      legalSummary: legalSummary(cat, "unclear"),
      evidence: ambiguous.evidence,
      notes: notesFor("unclear", ambiguous.matched),
      ...NEUTRAL_DIRECTION,
    };
  }

  return {
    status: "not_found",
    riskLevel: "unknown",
    legalSummary: legalSummary(cat, "not_found"),
    evidence: [],
    notes: notesFor("not_found", []),
    ...NEUTRAL_DIRECTION,
  };
}

/** Evidencia construida a partir de una oración completa. */
function sentenceEvidence(sentence: string, keyword: string): Evidence {
  return {
    quote: trimQuote(sentence),
    locationHint: keyword ? `coincidencia dirigida: "${keyword}"` : "cláusula reclasificada por dirección",
  };
}

function dedupeEvidence(list: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  const out: Evidence[] = [];
  for (const e of list) {
    if (seen.has(e.quote)) continue;
    seen.add(e.quote);
    out.push(e);
  }
  return out;
}

/**
 * Analiza una categoría SENSIBLE A LA DIRECCIÓN (privacidad del proveedor o uso
 * de datos para entrenamiento por el proveedor). Solo cuenta como hallazgo del
 * proveedor cuando la oración tiene esa dirección (`providerFunction`). Las
 * cláusulas que en realidad RESTRINGEN al usuario se devuelven aparte para
 * reclasificarse como uso prohibido, en lugar de inflar esta categoría.
 */
function analyzeDirectionalCategory(
  cat: CategoryConfig,
  original: string,
  providerFunction: Extract<ClauseFunction, "provider_data_use" | "privacy_policy">,
): { finding: BaseFinding; restriction: Evidence[] } {
  const sentences = splitSentences(original);
  const strongEvidence: Evidence[] = [];
  const ambiguousEvidence: Evidence[] = [];
  const matchedStrong: string[] = [];
  const matchedAmbiguous: string[] = [];
  const restriction: Evidence[] = [];
  let sawRestriction = false;

  for (const s of sentences) {
    const low = s.toLowerCase();
    const strongHit = cat.strongKeywords.find((k) => low.includes(k.toLowerCase()));
    const ambiguousHit = cat.ambiguousKeywords.find((k) => low.includes(k.toLowerCase()));
    if (!strongHit && !ambiguousHit) continue;

    const dir = classifyClause(s);
    if (dir.clauseFunction === providerFunction) {
      if (strongHit) {
        if (strongEvidence.length < MAX_EVIDENCE_PER_CATEGORY) strongEvidence.push(sentenceEvidence(s, strongHit));
        matchedStrong.push(strongHit);
      } else if (ambiguousHit) {
        if (ambiguousEvidence.length < MAX_EVIDENCE_PER_CATEGORY) ambiguousEvidence.push(sentenceEvidence(s, ambiguousHit));
        matchedAmbiguous.push(ambiguousHit);
      }
    } else if (dir.clauseFunction === "prohibited_use" || dir.clauseFunction === "user_restriction") {
      sawRestriction = true;
      if (restriction.length < MAX_EVIDENCE_PER_CATEGORY) restriction.push(sentenceEvidence(s, strongHit ?? ambiguousHit ?? ""));
    }
  }

  const restrictionNote = sawRestriction
    ? " Se hallaron además cláusulas que imponen una restricción al usuario (p. ej. prohibición de entrenar, scrapear o destilar, o de violar la privacidad de terceros); se reclasifican como uso prohibido y no constituyen un uso de datos por el proveedor."
    : "";

  if (matchedStrong.length > 0) {
    return {
      finding: {
        status: "found",
        riskLevel: cat.riskWhenFound,
        legalSummary: legalSummary(cat, "found"),
        evidence: strongEvidence,
        notes: notesFor("found", Array.from(new Set(matchedStrong))) + restrictionNote,
        actor: "provider",
        obligationTarget: "provider",
        clauseFunction: providerFunction,
      },
      restriction,
    };
  }

  if (matchedAmbiguous.length > 0) {
    return {
      finding: {
        status: "unclear",
        riskLevel: "unknown",
        legalSummary: legalSummary(cat, "unclear"),
        evidence: ambiguousEvidence,
        notes: notesFor("unclear", Array.from(new Set(matchedAmbiguous))) + restrictionNote,
        actor: "provider",
        obligationTarget: "provider",
        clauseFunction: providerFunction,
      },
      restriction,
    };
  }

  // No hay cláusula del proveedor; si solo había restricciones al usuario, se dice.
  return {
    finding: {
      status: "not_found",
      riskLevel: "unknown",
      legalSummary: sawRestriction
        ? `No surge del texto un uso por el proveedor vinculado a ${cat.legalConcern}.${restrictionNote}`
        : legalSummary(cat, "not_found"),
      evidence: [],
      notes: notesFor("not_found", []) + restrictionNote,
      ...NEUTRAL_DIRECTION,
    },
    restriction,
  };
}

/** Calcula el riesgo general de forma conservadora a partir de los hallazgos. */
function computeOverallRisk(findings: CategoryFinding[]): RiskLevel {
  const found = findings.filter((f) => f.status === "found");
  if (found.length === 0) return "unknown";

  const highCount = found.filter((f) => f.riskLevel === "high").length;
  const mediumCount = found.filter((f) => f.riskLevel === "medium").length;

  if (highCount >= 2) return "high";
  if (highCount >= 1 || mediumCount >= 3) return "medium";
  if (mediumCount >= 1) return "medium";
  return "low";
}

function overallLegalSummary(foundCount: number, total: number, risk: RiskLevel): string {
  return (
    `Sobre ${total} categorías jurídicas relevadas, se identificaron pasajes vinculados en ${foundCount}. ` +
    `La calificación de riesgo general (${risk}) es preliminar y se apoya en coincidencias léxicas, no en interpretación jurídica. ` +
    `El alcance de cada cláusula no surge con claridad del texto analizado y requeriría revisión legal humana.`
  );
}

// =========================================================================
// Modalidad de contratación
// =========================================================================

const SPECIFIC_MODES = Object.keys(STRONG_MODE_PHRASES) as Array<keyof typeof STRONG_MODE_PHRASES>;
const SECTION_WINDOW = 90;

/**
 * Detecta SECCIONES diferenciadas por modalidad: una frase fuerte de modalidad
 * que co-ocurre (±90 chars) con lenguaje de diferenciación. Esto distingue
 * "los clientes enterprise reciben X" (sección) de "enterprise-grade" (mención
 * al pasar). Devuelve, por modalidad, un fragmento de evidencia.
 */
function detectModeSections(original: string): Map<ContractingMode, Evidence> {
  const out = new Map<ContractingMode, Evidence>();
  const lower = original.toLowerCase();

  for (const mode of SPECIFIC_MODES) {
    for (const phrase of STRONG_MODE_PHRASES[mode]) {
      let idx = lower.indexOf(phrase);
      while (idx !== -1) {
        const start = Math.max(0, idx - SECTION_WINDOW);
        const end = Math.min(original.length, idx + phrase.length + SECTION_WINDOW);
        const window = original.slice(start, end);
        if (DIFFERENTIATION_CUE.test(window)) {
          out.set(mode, {
            quote: `… ${window.replace(/\s+/g, " ").trim()} …`,
            locationHint: `sección por modalidad: "${phrase}"`,
          });
          break;
        }
        idx = lower.indexOf(phrase, idx + phrase.length);
      }
      if (out.has(mode)) break;
    }
  }
  return out;
}

/**
 * Anota una categoría con su especificidad por modalidad. Solo `mode_specific`
 * si la evidencia de la categoría contiene una SECCIÓN diferenciada por
 * modalidad; si no, hereda el alcance del documento (`general`).
 */
function annotateCategoryModes(
  finding: BaseFinding,
  docAppliesTo: ContractingMode[],
): CategoryFinding {
  if (finding.status !== "not_found") {
    const perQuote = finding.evidence
      .map((e) => ({ e, sections: detectModeSections(e.quote) }))
      .filter((x) => x.sections.size > 0);
    if (perQuote.length > 0) {
      const modes = new Set<ContractingMode>();
      const modeEvidence: Evidence[] = [];
      for (const { e, sections } of perQuote) {
        for (const m of sections.keys()) modes.add(m);
        modeEvidence.push(e);
      }
      return {
        ...finding,
        appliesToModes: [...modes],
        modeSpecificity: "mode_specific",
        modeEvidence: modeEvidence.slice(0, 3),
      };
    }
  }
  return { ...finding, appliesToModes: docAppliesTo, modeSpecificity: "general", modeEvidence: [] };
}

/** Refina el alcance del documento y calcula confianza + fundamento. */
function resolveModeMeta(params: {
  inputScope: SourceScope;
  contractingMode: ContractingMode;
  documentType: string;
  detected: Map<ContractingMode, Evidence>;
}): { scope: SourceScope; confidence: ModeConfidence; rationale: string } {
  const { inputScope, contractingMode, documentType, detected } = params;
  const dt = documentType.toLowerCase();
  const titleSpecific = /(enterprise|business|team|api|developer|education)/.test(dt);
  const specificCount = [...detected.keys()].length;

  // Documento específico por título (Enterprise/Business/Team/API Terms).
  if (inputScope === "mode_specific" || titleSpecific) {
    return {
      scope: "mode_specific",
      confidence: titleSpecific ? "high" : "medium",
      rationale: `El documento (“${documentType}”) corresponde expresamente a la modalidad ${contractingMode}. ${
        specificCount > 0 ? "El texto referencia esa modalidad de contratación." : "La asignación proviene del documento fuente."
      }`,
    };
  }

  // Documento general que diferencia ≥2 modalidades en su texto -> mixto.
  if (contractingMode === "all" && specificCount >= 2) {
    const modes = [...detected.keys()].join(", ");
    return {
      scope: "mixed",
      confidence: "medium",
      rationale: `El documento parece general pero contiene secciones que diferencian modalidades (${modes}). Las diferencias deben revisarse cláusula por cláusula.`,
    };
  }

  if (contractingMode === "all") {
    return {
      scope: "general",
      confidence: "high",
      rationale: "El documento aplica de forma general: no surge del texto una diferenciación clara por modalidad de contratación.",
    };
  }

  if (contractingMode === "unknown") {
    return {
      scope: "unclear",
      confidence: "unknown",
      rationale: "No surge con claridad del texto ni de la fuente a qué modalidad de contratación aplica el documento.",
    };
  }

  return {
    scope: inputScope,
    confidence: specificCount > 0 ? "medium" : "low",
    rationale: `Modalidad asignada desde la fuente (${contractingMode}); el texto ${
      specificCount > 0 ? "menciona modalidades de contratación" : "no la corrobora explícitamente"
    }.`,
  };
}

// =========================================================================
// Perfil preliminar de privacidad (separado del riesgo general)
// =========================================================================

/**
 * Detecta compromiso de NO entrenamiento por parte del proveedor, distinguiendo
 * de restricciones dirigidas al usuario ("you may not ... train"), que NO son
 * un compromiso de privacidad. Sesgo conservador.
 */
// La negación debe ligarse a la FINALIDAD de entrenamiento, no a cualquier
// "does not" suelto en la oración (evita falsos positivos tipo "does not contain
// personal data ... to train" o "does not grant").
const RE_NO_TRAINING = [
  /\b(do not|does not|will not|won'?t|shall not|never|no longer)\b[^.!?]{0,40}\bto (train|improve (?:our|the) (?:models?|ai))\b/i,
  /\b(do not|does not|will not|won'?t|shall not|never)\s+train\b/i,
  /\bnot (?:be )?used to train\b/i,
  /\bwill not (?:use|be used)[^.!?]{0,30}\b(train|training)\b/i,
];

function detectTrainingStance(original: string): {
  noTraining: boolean;
  broadTraining: boolean;
  evidence: Evidence[];
} {
  const sentences = original.split(/(?<=[.!?])\s+/);
  const evidence: Evidence[] = [];
  let noTraining = false;
  let broadTraining = false;

  for (const s of sentences) {
    const low = s.toLowerCase();
    if (!/\b(train|training|model improvement|improve (our|the) (models|services))\b/.test(low)) continue;

    // Restricción dirigida al usuario ("you may not ... train"): NO es compromiso del proveedor.
    const userDirected = /\byou\b.{0,40}\b(may not|shall not|will not|agree not to|must not|are not permitted)\b|\busers?\b.{0,30}\b(may not|shall not)\b/.test(low);
    if (userDirected) continue;

    const providerSubject = /\b(we|we'll|we will|our|us|the (company|provider|service|services))\b/.test(low);
    // Afirma que SÍ entrena (uso amplio): "we may use ... to train", "within the scope ... train".
    const affirmsTraining =
      /\b(we|us|our)\b[^.!?]{0,60}\b(use|uses|using|process|develop|improve|train)\b[^.!?]{0,40}\bto (train|improve (?:our|the)? ?(?:models?|ai|services?))\b/i.test(s) ||
      /\b(within (?:the )?scope|is used|may (?:also )?use)\b[^.!?]{0,40}\b(train|training)\b/i.test(s);

    const noTrainSentence = RE_NO_TRAINING.some((re) => re.test(s));

    if (providerSubject && noTrainSentence && evidence.length < 3) {
      noTraining = true;
      evidence.push({ quote: trimQuote(s), locationHint: "compromiso de no entrenamiento" });
    } else if (providerSubject && affirmsTraining) {
      broadTraining = true;
    }
  }
  return { noTraining, broadTraining, evidence };
}

function trimQuote(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > 280 ? t.slice(0, 277) + "…" : t;
}

/** Calcula el perfil preliminar de privacidad a partir de señales con evidencia. */
function computePrivacy(
  categories: Record<string, CategoryFinding>,
  original: string,
): PrivacyProfile {
  const training = detectTrainingStance(original);
  const signals: string[] = [];
  const evidence: Evidence[] = [];

  const cat = (k: string) => categories[k];
  const isFound = (k: string) => cat(k)?.status === "found";

  const hasDPA = /\bdata processing (addendum|agreement)\b|\bdpa\b/i.test(original);

  if (training.noTraining) {
    signals.push("no_training_commitment");
    evidence.push(...training.evidence);
  }
  if (training.broadTraining || (isFound("training_use") && !training.noTraining)) {
    signals.push("broad_training_use");
    evidence.push(...(cat("training_use")?.evidence.slice(0, 1) ?? []));
  }
  if (hasDPA) signals.push("enterprise_dpa");
  if (isFound("data_retention")) signals.push("retention_controls");
  if (isFound("data_deletion")) signals.push("deletion_control");
  else signals.push("unclear_deletion");
  if (isFound("confidentiality")) signals.push("confidentiality_commitment");
  if (isFound("license_grant") && cat("license_grant")?.riskLevel === "high") signals.push("broad_license");

  const privacyFound = isFound("privacy") || isFound("data_retention") || isFound("security");

  let posture: PrivacyPosture;
  if (!privacyFound) {
    posture = "unknown";
  } else if (
    signals.includes("no_training_commitment") &&
    (signals.includes("enterprise_dpa") || signals.includes("confidentiality_commitment"))
  ) {
    posture = "strong";
  } else if (
    !signals.includes("no_training_commitment") &&
    (signals.includes("broad_training_use") ? 1 : 0) +
      (signals.includes("broad_license") ? 1 : 0) +
      (signals.includes("unclear_deletion") ? 1 : 0) >=
      2
  ) {
    posture = "weak";
  } else {
    posture = "moderate";
  }

  const POSTURE_TEXT: Record<PrivacyPosture, string> = {
    strong: "El texto fuente parece indicar protecciones relevantes (p. ej. compromiso de no entrenamiento y/o DPA o confidencialidad).",
    moderate: "Hay tratamiento de datos con algunas salvaguardas, pero no todas; perfil intermedio.",
    weak: "La redacción sugiere usos amplios de datos y/o controles poco claros de retención o eliminación.",
    unknown: "No hay evidencia suficiente para fundar un perfil preliminar de privacidad.",
  };

  return {
    posture,
    rationale: `Perfil preliminar (no es conclusión jurídica). ${POSTURE_TEXT[posture]} Requiere revisión legal humana. Señales: ${signals.join(", ") || "ninguna"}.`,
    signals: Array.from(new Set(signals)),
    evidence: evidence.slice(0, 4),
  };
}

/**
 * Punto de entrada del parser. Recibe el texto plano y los metadatos del
 * documento y devuelve un análisis estructurado y validable.
 */
export function parseLicense(params: ParseLicenseParams): LicenseAnalysis {
  const original = params.rawText;
  const lower = original.toLowerCase();

  // Modalidad: la autoridad es la fuente (registro). Defaults conservadores.
  const contractingMode: ContractingMode = params.contractingMode ?? "unknown";
  const inputScope: SourceScope = params.sourceScope ?? (contractingMode === "all" ? "general" : "unclear");
  const docAppliesTo: ContractingMode[] =
    params.appliesToModes && params.appliesToModes.length > 0
      ? params.appliesToModes
      : contractingMode === "all"
        ? []
        : contractingMode === "unknown"
          ? []
          : [contractingMode];

  const categories: Record<string, CategoryFinding> = {};
  const userRestrictions: Evidence[] = [];
  for (const cat of CATEGORIES) {
    let base: BaseFinding;
    if (cat.key === "training_use") {
      const r = analyzeDirectionalCategory(cat, original, "provider_data_use");
      base = r.finding;
      userRestrictions.push(...r.restriction);
    } else if (cat.key === "privacy") {
      const r = analyzeDirectionalCategory(cat, original, "privacy_policy");
      base = r.finding;
      userRestrictions.push(...r.restriction);
    } else {
      base = analyzeCategory(cat, original, lower);
    }
    categories[cat.key] = annotateCategoryModes(base, docAppliesTo);
  }

  // Reclasificación visible: las cláusulas que restringen al usuario (detectadas
  // al filtrar privacidad/entrenamiento) se asientan en "Contenido prohibido /
  // usos restringidos", para que el hallazgo no desaparezca, sino que cambie de
  // categoría con la dirección jurídica correcta.
  if (userRestrictions.length > 0) {
    const pcKey = "prohibited_content";
    const pc = categories[pcKey];
    const pcCat = CATEGORY_BY_KEY[pcKey];
    const merged = dedupeEvidence([...pc.evidence, ...userRestrictions]).slice(0, MAX_EVIDENCE_PER_CATEGORY);
    const note =
      "Incluye cláusulas que imponen restricciones al usuario (p. ej. prohibición de entrenar, scrapear o destilar modelos, o de violar la privacidad de terceros), reclasificadas desde categorías de privacidad/entrenamiento por su dirección jurídica (obligación a cargo del usuario).";
    categories[pcKey] = {
      ...pc,
      status: "found",
      riskLevel: pc.status === "found" ? pc.riskLevel : pcCat.riskWhenFound,
      legalSummary: pc.status === "found" ? pc.legalSummary : legalSummary(pcCat, "found"),
      evidence: merged,
      notes: `${pc.notes} ${note}`,
      actor: "user",
      obligationTarget: "user",
      clauseFunction: "prohibited_use",
    };
  }

  const detected = detectModeSections(original);
  const modeMeta = resolveModeMeta({
    inputScope,
    contractingMode,
    documentType: params.documentType,
    detected,
  });

  const privacy = computePrivacy(categories, original);

  const findings = Object.values(categories);
  const foundCount = findings.filter((f) => f.status === "found").length;
  const overallRiskLevel = computeOverallRisk(findings);
  const now = new Date().toISOString();

  return {
    id: params.id,
    providerName: params.providerName,
    productName: params.productName,
    productTier: params.productTier,
    documentType: params.documentType,
    softwareCategory: params.softwareCategory ?? "ai_provider",
    comparisonGroup: params.comparisonGroup ?? "ai",
    comparativeBaseline: params.comparativeBaseline ?? false,
    academicPurposeNotes: params.academicPurposeNotes ?? "",
    contractingMode,
    appliesToModes: docAppliesTo,
    sourceScope: modeMeta.scope,
    modeConfidence: modeMeta.confidence,
    modeRationale: modeMeta.rationale,
    sourceUrl: params.sourceUrl,
    retrievedAt: params.retrievedAt,
    rawTextPath: params.rawTextPath,
    overall: {
      legalSummary: overallLegalSummary(foundCount, findings.length, overallRiskLevel),
      overallRiskLevel,
    },
    privacy,
    categories,
    metadata: {
      createdAt: now,
      parserVersion: PARSER_VERSION,
      isMock: params.isMock ?? false,
      reviewStatus: "unreviewed",
    },
  };
}
