/**
 * Contexto editorial por proveedor.
 *
 * Un párrafo de orientación que antecede al análisis jurídico del expediente.
 * Está fundado ESTRICTAMENTE en los documentos del corpus (qué documentos hay,
 * su alcance, qué modalidades cubren, qué tan difícil fue localizarlos y qué
 * implican las posturas detectadas). No afirma hechos externos (jurisprudencia,
 * litigios) ni constituye asesoramiento legal: es una nota de lectura.
 *
 * La clave es el providerId (ver providerKey en src/lib/derive).
 */

export const PROVIDER_CONTEXT: Record<string, string> = {
  // --- Fijos arriba: Anthropic, OpenAI, xAI ---
  anthropic:
    "Anthropic separa con claridad las condiciones según cómo se contrata: un Terms of Service de consumo " +
    "(planes gratuito, Pro y Team), unos Commercial Terms propios para uso comercial, empresarial y por API, " +
    "una Acceptable Use Policy transversal y una Privacy Policy general. Esa separación es una ventaja para el " +
    "lector, porque permite saber qué documento rige cada modalidad en lugar de inferirlo. El corpus detecta " +
    "señales de privacidad débiles en los documentos de consumo, de modo que los compromisos más protectores " +
    "tienden a vivir en la vía comercial, no en la cuenta individual: conviene leer el documento que corresponde " +
    "a la modalidad efectivamente usada.",
  openai:
    "OpenAI publica para ChatGPT tres documentos localizables —Terms of Use, Privacy Policy y Usage Policies— que " +
    "cubren desde el plan gratuito hasta Enterprise sin un texto separado para cada modalidad. Las diferencias " +
    "entre planes (por ejemplo, el tratamiento de datos para entrenamiento) surgen dentro de esos mismos documentos " +
    "y de los términos empresariales, no siempre en el cuerpo principal. La postura de privacidad detectada es " +
    "intermedia; por eso importa leer no solo los términos generales sino las condiciones específicas del plan " +
    "contratado, donde suelen alojarse los compromisos de no-entrenamiento o de tratamiento empresarial.",
  xai:
    "xAI rige Grok con dos documentos generales —Terms of Service y Privacy Policy— que abarcan el uso gratuito, " +
    "de pago y por API sin distinguir cada modalidad en textos separados. Grok está además estrechamente ligado a " +
    "la plataforma X, cuyo propio marco contractual y de datos conviene leer en paralelo (ver el expediente de X). " +
    "Las señales de privacidad detectadas van de moderadas a débiles según el documento, lo que hace recomendable " +
    "revisar específicamente el uso de datos para entrenamiento antes de cargar información sensible.",

  // --- Resto, alfabético ---
  adobe:
    "El marco de Firefly no es un texto exclusivo del producto: se apoya en las condiciones generales de Adobe " +
    "(Adobe General Terms y la Privacy Policy corporativa), por lo que el corpus lo registra con alcance mixto " +
    "—parte general, parte específica—. Los dos documentos disponibles cubren del plan gratuito al empresarial sin " +
    "un texto separado por modalidad. Para uso profesional o empresarial suelen aplicar condiciones adicionales no " +
    "contenidas en estos textos de consumo.",
  "amazon-web-services":
    "AWS Bedrock se contrata dentro del paraguas contractual general de AWS: las condiciones específicas del " +
    "servicio viven dentro del AWS Service Terms y la Acceptable Use Policy, complementadas por una Privacy Notice. " +
    "No hay una modalidad gratuita de consumo; el uso es por API y empresarial, lo que implica contratación entre " +
    "empresas (habitualmente con acuerdos de tratamiento de datos no reflejados aquí). Leer Bedrock exige situarse " +
    "en ese marco corporativo más amplio, no en un Terms of Service de producto aislado.",
  apple:
    "Encontrar el texto que rige un producto Apple es, en sí mismo, difícil: Apple no ofrece un único contrato de " +
    "servicio, sino un conjunto fragmentado —Media Services Terms, condiciones de iCloud, licencias de software y " +
    "la Privacy Policy— repartido en distintas páginas y formatos. De ese conjunto, el corpus solo pudo fijar de " +
    "forma estable las Apple Media Services Terms; el resto figura como paquete jurídico pendiente de captura. Esa " +
    "dispersión es relevante: al usar un dispositivo Apple se aceptan, por adhesión, varios documentos a la vez, y " +
    "saber cuál aplica a cada función no es trivial. El expediente debe leerse como parcial, y la dificultad misma " +
    "para localizar el texto es una señal a tener en cuenta.",
  cohere:
    "Cohere expone dos documentos generales y localizables —Terms of Use y Privacy Policy— para su familia Command " +
    "y su API, aplicables del uso gratuito al empresarial. El corpus detecta una postura de privacidad fuerte en la " +
    "política de privacidad junto a un riesgo contractual alto en los términos: una combinación frecuente en " +
    "proveedores orientados a desarrolladores, donde la protección de datos convive con límites amplios de " +
    "responsabilidad. Para uso empresarial suelen sumarse condiciones comerciales específicas no incluidas en estos textos.",
  databricks:
    "Databricks Mosaic AI es una plataforma empresarial: lo que rige el uso es, ante todo, el acuerdo comercial " +
    "maestro entre la empresa cliente y Databricks, que no es un documento público de adhesión. El corpus solo pudo " +
    "fijar de forma estable la Acceptable Use Policy y la Privacy Notice; el grueso de las obligaciones contractuales " +
    "queda fuera de estos textos. Por eso este expediente debe leerse como parcial: orienta sobre uso aceptable y " +
    "datos, pero no sustituye la revisión del contrato empresarial aplicable.",
  elevenlabs:
    "ElevenLabs publica dos documentos localizables —Terms of Service y Privacy Policy— que cubren del plan gratuito " +
    "al empresarial. Al tratarse de síntesis de voz, el punto sensible no es solo el texto ingresado sino las muestras " +
    "de voz y su tratamiento, materia que conviene rastrear específicamente dentro de estos documentos. La postura de " +
    "privacidad detectada es moderada; para uso comercial pueden aplicar condiciones adicionales.",
  github:
    "GitHub Copilot no se rige por un texto único: combina los términos generales de GitHub con condiciones " +
    "específicas de Copilot, de ahí el alcance mixto que registra el corpus. Los dos documentos disponibles abarcan " +
    "desde la cuenta individual hasta Business y Enterprise, modalidades cuyo tratamiento de datos y de fragmentos de " +
    "código difiere de forma relevante. Conviene verificar qué condiciones de Copilot aplican al plan propio, en " +
    "especial respecto del uso de código para entrenamiento o sugerencias.",
  google:
    "El marco de Gemini se construye por capas: los términos generales de Google, una Privacy Policy corporativa y " +
    "políticas específicas de IA generativa, de ahí su alcance mixto. Los documentos capturados corresponden al uso " +
    "de consumo (gratuito e individual); las modalidades empresariales (Workspace, Vertex AI) se rigen por otros " +
    "contratos no incluidos aquí. Como ocurre con otros productos de Google, no hay un Terms of Service único de " +
    "producto: conviene leer el conjunto y no asumir que las condiciones de una modalidad valen para otra.",
  "hugging-face":
    "Hugging Face Hub aloja modelos y datasets de terceros, por lo que su marco combina los términos de la plataforma " +
    "con las licencias propias de cada modelo o dataset alojado —algo que estos dos documentos generales no agotan—. " +
    "Los textos cubren del uso gratuito al empresarial. Al leerlos hay que recordar que, además de las condiciones de " +
    "la plataforma, cada artefacto descargado puede traer su propia licencia, que es la que gobierna su uso.",
  ibm:
    "De watsonx el corpus solo pudo fijar de forma estable una Privacy Statement: es una plataforma empresarial cuyo " +
    "uso se rige por contratos comerciales (IBM Client Relationship Agreement y términos de servicio específicos) que " +
    "no son documentos públicos de adhesión. Este expediente es, por tanto, parcial: informa sobre el tratamiento de " +
    "datos, pero no sustituye la revisión del acuerdo empresarial que efectivamente gobierna el servicio.",
  linkedin:
    "LinkedIn se incorpora como software cotidiano de referencia, no como proveedor de IA en sentido estricto: sirve " +
    "para comparar qué riesgos son propios de la IA y cuáles ya existían en plataformas tradicionales. Su User " +
    "Agreement y su Privacy Policy son generales y aplican a toda la base de usuarios. El punto de interés actual es " +
    "que esos mismos textos habilitan el uso de datos del perfil y de la actividad para funciones de IA y para " +
    "entrenamiento, materia que conviene leer con atención.",
  meta:
    "A diferencia de los servicios alojados, lo que rige aquí no es un Terms of Service de servicio sino una licencia " +
    "de modelo: la Llama Community License, que regula la descarga y el uso de los pesos del modelo. Eso cambia el " +
    "análisis: importan las restricciones de uso, los umbrales de escala a partir de los cuales se exige licencia " +
    "adicional y las condiciones de marca, más que el tratamiento de datos de una cuenta. El corpus la clasifica como " +
    "licencia open source con riesgo contractual alto por esas restricciones.",
  microsoft:
    "Microsoft reúne dos productos —Copilot y Microsoft 365— bajo un marco común: el Microsoft Services Agreement y " +
    "las Privacy Statements corporativas, de ahí el alcance mixto. Estos documentos rigen el uso de consumo; las " +
    "modalidades empresariales (licenciamiento por volumen, Microsoft 365 para empresas) se gobiernan por contratos " +
    "distintos no incluidos aquí. Para una organización, leer solo el acuerdo de servicios de consumo puede inducir a " +
    "error: las condiciones empresariales y sus compromisos de datos son otras.",
  midjourney:
    "Midjourney publica dos documentos localizables —Terms of Service y Privacy Policy— para sus planes gratuito y de " +
    "pago. En generación de imágenes, los puntos sensibles son la titularidad de las imágenes producidas y los " +
    "derechos que el servicio se reserva sobre ellas, que difieren entre el uso gratuito y el de pago: conviene leer " +
    "esa distinción dentro de los términos antes de un uso comercial.",
  replit:
    "Replit publica dos documentos generales —Terms of Service y Privacy Policy— que cubren las cuentas gratuita, de " +
    "pago y de equipo. Al ser un entorno de desarrollo con IA, el punto a rastrear es el tratamiento del código y de " +
    "los prompts (almacenamiento, uso para mejorar el servicio o entrenamiento), que estos textos regulan de forma " +
    "transversal. Para uso de equipo o profesional pueden aplicar condiciones adicionales.",
  runway:
    "Runway publica dos documentos localizables —Terms of Use y Privacy Policy— para sus planes gratuito, de pago y " +
    "empresarial. Como herramienta de video e imagen generativa, conviene rastrear en ellos la titularidad de las " +
    "salidas y el uso del contenido subido para entrenar o mejorar modelos. La postura de privacidad detectada varía " +
    "según el documento; para uso comercial suelen aplicar condiciones adicionales.",
  "stability-ai":
    "Stability AI combina dos modos de uso: el servicio y la API, por un lado, y modelos descargables bajo licencias " +
    "propias, por otro. Los dos documentos capturados —Terms of Use y Privacy Policy— rigen el servicio; el uso de " +
    "los modelos descargados se gobierna además por sus respectivas licencias, no contenidas aquí. Leer Stability " +
    "exige distinguir entre usar su plataforma y desplegar sus modelos por cuenta propia.",
  x:
    "X se incorpora como plataforma cotidiana de referencia y, a la vez, es relevante para la IA: sus propios " +
    "términos habilitan el uso de los contenidos públicos de la plataforma para entrenar modelos —incluido Grok, de " +
    "xAI—. El Terms of Service y la Privacy Policy son generales y aplican a toda la base de usuarios; el corpus " +
    "detecta señales de privacidad de intermedias a débiles según el documento. Conviene leerlos junto con el " +
    "expediente de xAI/Grok para entender el flujo de datos entre ambos.",
};

/** Devuelve el contexto editorial del proveedor, o null si no hay nota cargada. */
export function getProviderContext(providerId: string): string | null {
  return PROVIDER_CONTEXT[providerId] ?? null;
}
