import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  CircleCheck,
  ClipboardPaste,
  FileText,
  FileUp,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
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

      <section className="card">
        <h2>Privacidad del análisis</h2>
        <p className="hint">
          El reporte se conserva hasta 7 días. Si la consulta externa de reputación está habilitada,
          se puede enviar a VirusTotal una URL normalizada sin parámetros ni fragmento, pero su ruta
          aún podría contener información sensible. No se envían el asunto, el cuerpo ni los nombres
          de los adjuntos a esa fuente. Los enlaces del correo no se visitan.
        </p>
      </section>

      <div className="analyze-stepbar">
        <Tabs
          label="Formas de enviar un correo"
          items={[
            {
              id: 'archivo',
              label: 'Subir archivo .eml',
              content: (
                <form className="analyze-stack" onSubmit={submitFile}>
                  <section className="card analyze-card">
                    <h2>Archivo original del correo</h2>
                    <p className="hint">
                      Importa un mensaje .eml exportado desde tu proveedor. El contenido no se ejecuta.
                    </p>

                    <label htmlFor="eml-file" className="dropzone">
                      <Icon as={UploadCloud} size={28} />
                      <strong>Arrastra tu archivo .eml aquí</strong>
                      <span>o selecciónalo desde tu equipo</span>
                      <span className="btn btn-outline btn-small">Explorar archivos</span>
                      <input
                        id="eml-file"
                        name="file"
                        type="file"
                        accept=".eml,message/rfc822"
                        className="file-input"
                        required
                        onChange={handleFileChange}
                      />
                    </label>

                    <p className="dropzone-help">
                      Formato admitido: .eml · Evita incluir datos personales innecesarios
                    </p>

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
                  </section>

                  <section className="card protected-card">
                    <Icon as={ShieldCheck} size={22} />
                    <div>
                      <h3>Análisis protegido</h3>
                      <p className="hint">
                        No se visitan enlaces ni se ejecutan adjuntos. Los reportes se conservan
                        durante un periodo limitado.
                      </p>
                    </div>
                  </section>

                  <div className="analyze-actions">
                    {file && (
                      <button type="button" className="btn btn-outline" onClick={() => setFile(null)}>
                        Quitar archivo
                      </button>
                    )}
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                      <Icon as={FileUp} /> {busy ? 'Analizando…' : 'Analizar correo ↗'}
                    </button>
                  </div>
                </form>
              ),
            },
            {
              id: 'texto',
              label: 'Pegar mensaje original',
              content: (
                <form className="analyze-stack" onSubmit={submitText}>
                  <section className="card analyze-card">
                    <h2>Contenido del mensaje</h2>
                    <p className="hint">
                      Incluye remitente, destinatario, asunto y encabezados originales cuando sea posible.
                    </p>
                    <textarea
                      id="paste-text"
                      name="text"
                      rows={14}
                      maxLength={200000}
                      aria-label="Contenido del mensaje"
                      required
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                    />
                    <p className="dropzone-help">
                      El enlace se muestra como texto no interactivo.
                    </p>
                  </section>

                  <section className="card protected-card">
                    <Icon as={ClipboardPaste} size={22} />
                    <div>
                      <h3>Antes de analizar</h3>
                      <p className="hint">
                        Pega el texto original sin editar los encabezados. Esta opción puede aportar
                        menos evidencias que un archivo .eml.
                      </p>
                    </div>
                  </section>

                  <div className="analyze-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setText('')}
                      disabled={!text}
                    >
                      Limpiar contenido
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                      <Icon as={ClipboardPaste} /> {busy ? 'Analizando…' : 'Analizar mensaje ↗'}
                    </button>
                  </div>
                </form>
              ),
            },
          ]}
        />
        <span className="step-meta">01 / 02 · Entrada de correo</span>
      </div>
    </>
  );
}
