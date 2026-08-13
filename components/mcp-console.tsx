"use client"

import { useEffect, useRef } from "react"
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  Terminal,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { JsonHighlight } from "@/components/json-highlight"
import type { LogEntry } from "@/components/mcp-types"

const DIRECTION_META: Record<
  LogEntry["direction"],
  { icon: typeof Info; color: string; tag: string }
> = {
  request: {
    icon: ArrowUpRight,
    color: "text-[oklch(0.75_0.14_285)]",
    tag: "REQ",
  },
  response: {
    icon: ArrowDownLeft,
    color: "text-[oklch(0.78_0.13_160)]",
    tag: "RES",
  },
  error: { icon: AlertTriangle, color: "text-destructive", tag: "ERR" },
  info: { icon: Info, color: "text-muted-foreground", tag: "SYS" },
}

interface McpConsoleProps {
  logs: LogEntry[]
  totalTokens: number
  onClear: () => void
}

export function McpConsole({ logs, totalTokens, onClear }: McpConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [logs])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-[oklch(0.13_0.01_285)] shadow-xl">
      {/* Barra de título tipo terminal */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-[oklch(0.18_0.014_285)] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-3 rounded-full bg-[oklch(0.65_0.2_20)]" />
            <span className="size-3 rounded-full bg-[oklch(0.78_0.16_90)]" />
            <span className="size-3 rounded-full bg-[oklch(0.7_0.16_160)]" />
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Terminal className="size-3.5" />
            <span>mcp://hr-triage — memória do agente</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7 gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="size-3.5" />
          limpar
        </Button>
      </div>

      {/* Corpo dos logs */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs"
      >
        {logs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Terminal className="size-8 opacity-40" />
            <p className="max-w-xs text-balance leading-relaxed">
              A consola está vazia. Executa os passos à esquerda para ver o
              fluxo de dados estruturados que o Agente LLM recebe.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {logs.map((entry) => {
              const meta = DIRECTION_META[entry.direction]
              const Icon = meta.icon
              return (
                <li key={entry.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`size-3.5 shrink-0 ${meta.color}`} />
                    <span className={`font-semibold ${meta.color}`}>
                      [{meta.tag}]
                    </span>
                    <span className="text-foreground">{entry.label}</span>
                    <span className="text-muted-foreground/60">
                      {entry.timestamp}
                    </span>
                    <span className="ml-auto rounded bg-[oklch(0.24_0.013_285)] px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      ~{entry.tokens} tok
                    </span>
                  </div>
                  {entry.direction !== "info" && (
                    <div className="ml-5 rounded-lg border border-border/60 bg-[oklch(0.16_0.012_285)] p-3">
                      <JsonHighlight data={entry.payload} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Rodapé com contador de tokens */}
      <div className="flex items-center justify-between border-t border-border bg-[oklch(0.18_0.014_285)] px-4 py-2 font-mono text-[11px] text-muted-foreground">
        <span>{logs.length} eventos</span>
        <span>
          contexto entregue à IA:{" "}
          <span className="text-[oklch(0.75_0.14_285)]">~{totalTokens} tokens</span>
        </span>
      </div>
    </div>
  )
}
