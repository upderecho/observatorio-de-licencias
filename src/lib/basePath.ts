/**
 * basePath del sitio. En el export estático para GitHub Pages el sitio se sirve
 * bajo una subruta (`/observatorio-de-licencias`); en dev/build normal es "".
 *
 * `next/image` y `<Link>` prefijan el basePath solos, pero un `<img>` plano NO:
 * para assets dinámicos (p. ej. logos por proveedor) hay que prefijar a mano con
 * `withBasePath`. Misma fuente que `next.config.mjs` (NEXT_PUBLIC_STATIC_EXPORT).
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true" ? "/observatorio-de-licencias" : "";

/** Prefija una ruta de asset estático con el basePath del sitio. */
export function withBasePath(path: string): string {
  return `${BASE_PATH}/${path.replace(/^\//, "")}`;
}
