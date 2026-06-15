import { UploadOrPasteForm } from "@/components/UploadOrPasteForm";
import { PageContainer } from "@/components/PageContainer";

export const metadata = { title: "Cargar licencia — UP-Law-AILO" };

export default function UploadPage() {
  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cargar licencia</h1>
        <p className="text-slate-600">
          Pegá el texto de una licencia, EULA, términos de uso o política de privacidad. Se guardará
          el texto original, se ejecutará el parser determinístico y se generará un JSON en disco.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <UploadOrPasteForm />
      </div>

      </div>
    </PageContainer>
  );
}
