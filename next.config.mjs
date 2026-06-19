/** @type {import('next').NextConfig} */

// Modo export estático para GitHub Pages. Se activa con NEXT_PUBLIC_STATIC_EXPORT=true
// (lo setea el workflow deploy-pages y el script scripts/build-static.sh).
// En dev y en el build normal de CI este flag está ausente: la app sigue siendo
// la misma app server-rendered de siempre.
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

// El sitio se sirve bajo https://upderechoia.github.io/observatorio-de-licencias/
// por lo que necesita basePath. Fuente ÚNICA del basePath (no usar
// configure-pages con static_site_generator: next, o se duplicaría).
const basePath = isStaticExport ? "/observatorio-de-licencias" : "";

const nextConfig = {
  reactStrictMode: true,
  ...(isStaticExport
    ? {
        output: "export",
        basePath,
        // GitHub Pages sirve mejor las rutas anidadas (p.ej. /analysis/<id>/source)
        // como directorios con index.html.
        trailingSlash: true,
        // El export estático no puede usar el optimizador de imágenes de Next.
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
