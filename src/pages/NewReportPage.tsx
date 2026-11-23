import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ClipboardPaste, CircleCheck, FileText, FileUp, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import { Icon } from '../components/Icon';
import { ErrorBox, PageHeader, Tabs } from '../components/ui';

export function NewReportPage() {
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError('');
    setFile(event.target.files?.[0] ?? null);
  };

  const submitFile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!file) {
      setError('Selecciona un archivo .eml.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.eml')) {
      setError('El archivo debe tener extensión .eml.');
      return;
    }
    setBusy(true);
    try {
      const report = await api.uploadReport(file);
      navigate(`/reports/${report.id}`);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const submitText = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const report = await api.pasteReport(text);
      navigate(`/reports/${report.id}`);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Analizar correo sospechoso"
        description="Envía un archivo original para revisar señales y obtener evidencias."
      />

      <ErrorBox message={error} />

      <Tabs
        label="Formas de enviar un correo"
        items={[
          {
            id: 'archivo',
            label: 'Subir archivo .eml',
            content: (
              <form className="form-stack" onSubmit={submitFile}>
                <div className="field">
                  <span id="eml-file-hint" className="visually-hidden">
                    Selecciona un archivo .eml para analizarlo.
                  </span>
                  <label htmlFor="eml-file" className="dropzone">
                    <Icon as={UploadCloud} size={26} />
                    <strong>Arrastra tu archivo .eml aquí</strong>
                    <span>o selecciónalo desde tu equipo</span>
                    <span className="btn btn-outline btn-small">Explorar archivos</span>
                    <input
                      id="eml-file"
                      name="file"
                      type="file"
                      accept=".eml,message/rfc822"
                      aria-describedby="eml-file-hint"
                      className="file-input"
                      required
                      onChange={handleFileChange}
                    />
                  </label>
                  {file && (
                    <div className="file-row">
                      <Icon as={FileText} size={20} />
                      <span>
                        <strong>{file.name}</strong>
                        <span className="file-name"> · archivo listo</span>
                      </span>
                      <Icon as={CircleCheck} size={18} />
                    </div>
                  )}
                </div>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  <Icon as={FileUp} /> {busy ? 'Enviando…' : 'Analizar archivo'}
                </button>
              </form>
            ),
          },
          {
            id: 'texto',
            label: 'Pegar mensaje original',
            content: (
              <form className="form-stack" onSubmit={submitText}>
                <div className="field">
                  <label htmlFor="paste-text">Contenido del mensaje</label>
                  <span id="paste-text-hint" className="hint">
                    Hasta 200 000 caracteres. El contenido se trata como texto hostil y se escapa.
                  </span>
                  <textarea
                    id="paste-text"
                    name="text"
                    rows={14}
                    maxLength={200000}
                    aria-describedby="paste-text-hint"
                    required
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  <Icon as={ClipboardPaste} /> {busy ? 'Enviando…' : 'Analizar texto'}
                </button>
              </form>
            ),
          },
        ]}
      />

      <p className="security-note">
        Los enlaces se muestran desactivados (por ejemplo <code>hxxp://dominio[.]com</code>) y
        nunca se visitan. El HTML del correo se sanea en la API y se incrusta sin permisos.
      </p>
    </>
  );
}
