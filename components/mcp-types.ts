import type { McpToolName } from "@/lib/mcp-tools"

export type LogDirection = "request" | "response" | "error" | "info"

export interface LogEntry {
  id: string
  direction: LogDirection
  tool: McpToolName | "system"
  label: string
  payload: unknown
  timestamp: string
  /** Estimativa grosseira de tokens (~4 chars/token). */
  tokens: number
}

/** Estimativa simples de tokens a partir do tamanho do payload serializado. */
export function estimateTokens(payload: unknown): number {
  const text =
    typeof payload === "string" ? payload : JSON.stringify(payload ?? "")
  return Math.max(1, Math.ceil(text.length / 4))
}
