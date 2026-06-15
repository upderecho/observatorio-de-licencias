import {
  Globe2,
  IdCard,
  LockKeyhole,
  Scale,
  Gavel,
  GraduationCap,
  Building2,
  Server,
  GitCompare,
  Laptop,
  Mail,
  Smartphone,
  Columns3,
  FileSearch,
  type LucideIcon,
} from "lucide-react";

/**
 * Iconografía sobria (lucide, stroke fino) para ayudar a escanear escenarios y
 * comparaciones. Los íconos son DECORATIVOS (aria-hidden): el texto sigue siendo
 * la fuente de significado. No se usan como señal jurídica (no afirman seguridad,
 * aprobación ni certificación).
 */

/** Ícono por id de escenario de uso jurídico. */
export const SCENARIO_ICON: Record<string, LucideIcon> = {
  public_information: Globe2,
  personal_data: IdCard,
  confidential_business_information: LockKeyhole,
  client_confidential_information: Scale,
  attorney_client_privilege: Gavel,
  academic_research: GraduationCap,
  internal_legal_ops: Building2,
  enterprise_api_use: Server,
  // académicos / navegación
  compare_ai_with_traditional_software: GitCompare,
  lawyer_daily_software_stack: Laptop,
  latin_america_legal_education: GraduationCap,
  provider_comparison: Columns3,
  source_audit: FileSearch,
};

/** Ícono por acceso de comparación académica de la home (por título). */
export const ACADEMIC_ICON: Record<string, LucideIcon> = {
  "IA vs software tradicional": GitCompare,
  "Software cotidiano del abogado": Laptop,
  "Correo, productividad y redes sociales": Mail,
  "Ecosistemas móviles: Android y Apple": Smartphone,
};

/**
 * Contenedor sobrio para el ícono de una card (institucional, no lúdico).
 * `icon` decorativo; el título de la card aporta el significado.
 */
export function CardIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}
