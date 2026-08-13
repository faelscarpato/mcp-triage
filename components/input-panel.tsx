"use client"

import {
  Check,
  FileText,
  Briefcase,
  Loader2,
  ScanText,
  Calculator,
  FileOutput,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { McpToolName } from "@/lib/mcp-tools"

interface InputPanelProps {
  rawResume: string
  jobDescription: string
  onRawResumeChange: (value: string) => void
  onJobDescriptionChange: (value: string) => void
  onRunTool: (tool: McpToolName) => void
  loadingTool: McpToolName | null
  completed: Record<McpToolName, boolean>
}

interface StepConfig {
  tool: McpToolName
  n: number
  icon: typeof ScanText
  title: string
  subtitle: string
  disabled: boolean
}

export function InputPanel({
  rawResume,
  jobDescription,
  onRawResumeChange,
  onJobDescriptionChange,
  onRunTool,
  loadingTool,
  completed,
}: InputPanelProps) {
  const steps: StepConfig[] = [
    {
      tool: "parse_resume",
      n: 1,
      icon: ScanText,
      title: "Executar parse_resume",
      subtitle: "Extração determinística por regex (nome, email, skills)",
      disabled: rawResume.trim().length === 0,
    },
    {
      tool: "score_candidate",
      n: 2,
      icon: Calculator,
      title: "Executar score_candidate",
      subtitle: "Interseção/diferença de conjuntos vs. descrição da vaga",
      disabled: !completed.parse_resume || jobDescription.trim().length === 0,
    },
    {
      tool: "generate_hr_report",
      n: 3,
      icon: FileOutput,
      title: "Gerar Parecer da IA & PDF",
      subtitle: "Dossiê simulado da IA → geração de PDF (mock)",
      disabled: !completed.score_candidate,
    },
  ]

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto">
      {/* Currículo bruto */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="raw-resume"
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <FileText className="size-4 text-primary" />
          Currículo Bruto
          <span className="font-normal text-muted-foreground">(simula PDF)</span>
        </label>
        <Textarea
          id="raw-resume"
          value={rawResume}
          onChange={(e) => onRawResumeChange(e.target.value)}
          placeholder="Cola aqui o texto extraído do currículo..."
          className="min-h-40 resize-y font-mono text-xs leading-relaxed"
        />
      </div>

      {/* Descrição da vaga */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="job-description"
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <Briefcase className="size-4 text-primary" />
          Descrição da Vaga
        </label>
        <Textarea
          id="job-description"
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value)}
          placeholder="Cola aqui os requisitos da vaga..."
          className="min-h-28 resize-y font-mono text-xs leading-relaxed"
        />
      </div>

      {/* Passos sequenciais */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Raciocínio do Agente
        </p>
        {steps.map((step) => {
          const isLoading = loadingTool === step.tool
          const isDone = completed[step.tool]
          const Icon = step.icon
          const blocked = step.disabled || loadingTool !== null
          return (
            <button
              key={step.tool}
              type="button"
              onClick={() => onRunTool(step.tool)}
              disabled={blocked && !isLoading}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/60 hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border disabled:hover:bg-card"
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-md border font-mono text-sm font-semibold ${
                  isDone
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border bg-secondary text-muted-foreground"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isDone ? (
                  <Check className="size-4" />
                ) : (
                  step.n
                )}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Icon className="size-3.5 text-primary" />
                  {step.title}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {step.subtitle}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
