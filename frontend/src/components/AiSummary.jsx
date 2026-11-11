import { useRef, useState } from 'react';

function AiSummary({ request, summary, onGenerate }) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef(null);

  const saved = request.ai_summary;
  const status = summary?.status ?? (saved ? 'success' : 'idle');
  const loading = status === 'loading';
  const hasText = Boolean(saved);
  const isStale = hasText && new Date(request.updated_at) > new Date(saved.generated_at);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(saved.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: dejamos el texto seleccionado para copiar a mano
      textRef.current?.select();
    }
  }

  return (
    <section className="ai-summary" aria-live="polite">
      <header className="ai-summary-header">
        <h4>✨ Resumen con IA</h4>
        <button type="button" onClick={() => onGenerate(request.id)} disabled={loading}>
          {loading ? 'Generando…' : hasText ? 'Regenerar' : 'Generar resumen'}
        </button>
      </header>

      {status === 'idle' && (
        <p className="ai-hint">Resume el recorrido de esta solicitud a partir de su historial.</p>
      )}
      {loading && (
        <p className="ai-hint">Generando… puedes cerrar esta ventana, te avisamos cuando esté listo.</p>
      )}
      {status === 'error' && (
        <p className="ai-error">{summary.message}</p>
      )}

      {hasText && (
        <>
          <textarea ref={textRef} className="ai-text" value={saved.text} readOnly rows={4} />
          <footer className="ai-footer">
            <small>
              Generado a las {new Date(saved.generated_at).toLocaleTimeString()}
              {isStale && ' · la solicitud cambió desde entonces'}
            </small>
            <button type="button" onClick={handleCopy}>{copied ? 'Copiado ✓' : 'Copiar'}</button>
          </footer>
        </>
      )}
    </section>
  );
}

export default AiSummary;