"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ background: "#0f0f14", color: "#fff", fontFamily: "system-ui" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ maxWidth: "600px", width: "100%", background: "#1a1a2e", border: "1px solid #ef4444", borderRadius: "12px", padding: "2rem" }}>
            <h2 style={{ color: "#ef4444", marginBottom: "1rem" }}>Erro Global</h2>
            <div style={{ background: "rgba(239,68,68,0.1)", padding: "1rem", borderRadius: "8px", marginBottom: "1rem", overflow: "auto", maxHeight: "300px" }}>
              <p style={{ fontFamily: "monospace", fontSize: "14px", color: "#f87171", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {error.message}
              </p>
              {error.stack && (
                <pre style={{ fontFamily: "monospace", fontSize: "11px", color: "#888", marginTop: "0.5rem", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {error.stack}
                </pre>
              )}
            </div>
            <button
              onClick={reset}
              style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
