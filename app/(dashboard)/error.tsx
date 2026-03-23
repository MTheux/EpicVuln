"use client"

import { useEffect } from "react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="max-w-2xl w-full bg-card border border-red-500/30 rounded-xl p-8 shadow-lg">
        <h2 className="text-xl font-bold text-red-500 mb-4">Erro no Dashboard</h2>
        <div className="bg-red-500/10 rounded-lg p-4 mb-4 overflow-auto max-h-60">
          <p className="text-sm font-mono text-red-400 whitespace-pre-wrap break-all">
            {error.message}
          </p>
          {error.stack && (
            <pre className="text-xs font-mono text-muted-foreground mt-2 whitespace-pre-wrap break-all">
              {error.stack}
            </pre>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Digest: {error.digest || "N/A"}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
