# Logos de proveedores

Los archivos de logo van aquí como `public/logos/<providerId>.svg` (SVG preferido).
El `providerId` es el id del proveedor en `data/sources/providers.json` (y el que
deriva la app vía `providerKey`). Si no existe el archivo, la interfaz muestra un
monograma con las iniciales del proveedor.

## Reglas

- **No recolorear** los SVG: se muestran tal cual (los logos tienen color de marca).
- Para una ruta distinta a la convención, declarar `logoPath` en el proveedor del
  registro (`data/sources/providers.json`).

## Aviso legal

Los logos son **marcas de sus respectivos titulares** y se incluyen aquí con fines
de **identificación nominativa** (referencia académica), no de respaldo ni
afiliación. **No** están cubiertos por la licencia BSD del código de este
repositorio (igual que los contenidos de `data/`). Si sos titular de una marca y
querés que se retire o reemplace su logo, abrí un issue.
