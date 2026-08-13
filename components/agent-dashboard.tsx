"use client"

import { useMemo, useState } from "react"
import { Bot, Cpu, FileCheck2, Gauge, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { InputPanel } from "@/components/input-panel"
import { McpConsole } from "@/components/mcp-console"
import { estimateTokens, type LogEntry } from "@/components/mcp-types"
import type {
  McpToolName,
  ParseResumeResult,
  ScoreCandidateResult,
  GenerateHrReportResult,
} from "@/lib/mcp-tools"

const SAMPLE_RESUME = `Maria Silva Santos
maria.santos@email.com | +351 912 345 678 | Lisboa, Portugal

Engenheira de Software com 6 anos de experiência em desenvolvimento full-stack.
Especialista em TypeScript e React, com forte experiência em Node.js e Docker.
Construí pipelines de dados em Python e geri infraestrutura em AWS.

EXPERIÊNCIA
- Tech Lead na Acme Corp (2021-hoje): React, TypeScript, Node.js, Docker
- Backend Engineer na DataFlow (2019-2021): Python, SQL, AWS

FORMAÇÃO
Licenciatura em Engenharia Informática — Universidade de Lisboa`

const SAMPLE_JOB = `Procuramos um(a) Senior Full-Stack Engineer.

Requisitos obrigatórios:
- Domínio de TypeScript e React
- Experiência sólida com Node.js
- Conhecimento de Docker e AWS
- Experiência com Kubernetes é uma vantagem (Go também)`

const INITIAL_COMPLETED: Record<McpToolName, boolean> = {
  parse_resume: false,
  score_candidate: false,
  generate_hr_report: false,
}

export function AgentDashboard() {
  const [rawResume, setRawResume] = useState(SAMPLE_RESUME)
  const [jobDescription, setJobDescription] = useState(SAMPLE_JOB)

  const [resumeData, setResumeData] = useState<ParseResumeResult | null>(null)
  const [scoreData, setScoreData] = useState<ScoreCandidateResult | null>(null)
  const [reportData, setReportData] = useState<GenerateHrReportResult | null>(
    null,
  )

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loadingTool, setLoadingTool] = useState<McpToolName | null>(null)
  const [completed, setCompleted] =
    useState<Record<McpToolName, boolean>>(INITIAL_COMPLETED)

  const totalTokens = useMemo(
    () =>
      logs
        .filter((l) => l.direction === "response")
        .reduce((sum, l) => sum + l.tokens, 0),
    [logs],
  )

  function pushLog(entry: Omit<LogEntry, "id" | "timestamp" | "tokens">) {
    setLogs((prev) => [
      ...prev,
      {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString("pt-PT"),
        tokens: estimateTokens(entry.payload),
      },
    ])
  }

  async function callMcp<T>(
    tool: McpToolName,
    params: Record<string, unknown>,
    label: string,
  ): Promise<T | null> {
    setLoadingTool(tool)
    pushLog({
      direction: "request",
      tool,
      label: `→ ${tool}`,
      payload: { tool, params },
    })

    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, params }),
      })
      const data = await res.json()

      if (!res.ok) {
        pushLog({
          direction: "error",
          tool,
          label: `✕ ${tool} (${res.status})`,
          payload: data,
        })
        return null
      }

      pushLog({
        direction: "response",
        tool,
        label: `← ${label}`,
        payload: data,
      })
      return data as T
    } catch (error) {
      pushLog({
        direction: "error",
        tool,
        label: `✕ ${tool} (rede)`,
        payload: { error: error instanceof Error ? error.message : String(error) },
      })
      return null
    } finally {
      setLoadingTool(null)
    }
  }

  async function handleRunTool(tool: McpToolName) {
    if (tool === "parse_resume") {
      const result = await callMcp<ParseResumeResult>(
        "parse_resume",
        { content: rawResume, contentType: "text/plain" },
        "dados estruturados do candidato",
      )
      if (result) {
        setResumeData(result)
        setCompleted((c) => ({
          ...c,
          parse_resume: true,
          // Reset dos passos seguintes se re-executar o parse.
          score_candidate: false,
          generate_hr_report: false,
        }))
        setScoreData(null)
        setReportData(null)
      }
      return
    }

    if (tool === "score_candidate") {
      if (!resumeData) return
      const result = await callMcp<ScoreCandidateResult>(
        "score_candidate",
        { resumeData, jobDescription },
        "score de aderência calculado",
      )
      if (result) {
        setScoreData(result)
        setCompleted((c) => ({
          ...c,
          score_candidate: true,
          generate_hr_report: false,
        }))
        setReportData(null)
      }
      return
    }

    if (tool === "generate_hr_report") {
      if (!resumeData || !scoreData) return

      // "Raciocínio" da IA simulado a partir dos dados já estruturados.
      const aiDossier = buildSimulatedDossier(resumeData, scoreData)
      pushLog({
        direction: "info",
        tool: "generate_hr_report",
        label: "IA gerou o dossiê a partir do JSON (sem ver o currículo bruto)",
        payload: null,
      })

      const result = await callMcp<GenerateHrReportResult>(
        "generate_hr_report",
        {
          candidateName: resumeData.candidate_name,
          targetRole: "Senior Full-Stack Engineer",
          aiDossierContent: aiDossier,
        },
        "PDF gerado (simulado)",
      )
      if (result) {
        setReportData(result)
        setCompleted((c) => ({ ...c, generate_hr_report: true }))
      }
    }
  }

  function handleClear() {
    setLogs([])
    setResumeData(null)
    setScoreData(null)
    setReportData(null)
    setCompleted(INITIAL_COMPLETED)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/15">
            <Bot className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              HR Triage — MCP Server
            </h1>
            <p className="text-sm text-muted-foreground">
              Parsing determinístico no backend · a IA recebe só o JSON
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 font-mono text-xs">
            <Cpu className="size-3" />
            Node.js runtime
          </Badge>
          <Badge variant="secondary" className="gap-1.5 font-mono text-xs">
            <Zap className="size-3 text-primary" />
            token-efficient
          </Badge>
        </div>
      </header>

      {/* Cartão de resultados */}
      {(scoreData || reportData) && (
        <ScoreSummary scoreData={scoreData} reportData={reportData} />
      )}

      {/* Layout de duas colunas */}
      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
        <section
          aria-label="Controlos de input"
          className="rounded-xl border border-border bg-card/40 p-5"
        >
          <InputPanel
            rawResume={rawResume}
            jobDescription={jobDescription}
            onRawResumeChange={setRawResume}
            onJobDescriptionChange={setJobDescription}
            onRunTool={handleRunTool}
            loadingTool={loadingTool}
            completed={completed}
          />
        </section>

        <section aria-label="Consola MCP" className="min-h-125 lg:min-h-0">
          <McpConsole logs={logs} totalTokens={totalTokens} onClear={handleClear} />
        </section>
      </div>
    </div>
  )
}

function ScoreSummary({
  scoreData,
  reportData,
}: {
  scoreData: ScoreCandidateResult | null
  reportData: GenerateHrReportResult | null
}) {
  const score = scoreData?.match_score ?? 0
  const scoreColor =
    score >= 80
      ? "text-[oklch(0.78_0.13_160)]"
      : score >= 50
        ? "text-[oklch(0.78_0.16_90)]"
        : "text-destructive"

  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card/40 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
      {scoreData && (
        <>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-secondary px-5 py-3">
              <Gauge className={`mb-1 size-4 ${scoreColor}`} />
              <span className={`font-mono text-3xl font-bold ${scoreColor}`}>
                {score}%
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                match score
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground">{scoreData.analysis_summary}</p>
            <div className="flex flex-wrap gap-1.5">
              {scoreData.matched_keywords.map((k) => (
                <Badge
                  key={k}
                  className="border-transparent bg-[oklch(0.7_0.16_160/0.18)] font-mono text-xs text-[oklch(0.8_0.13_160)]"
                >
                  ✓ {k}
                </Badge>
              ))}
              {scoreData.missing_keywords.map((k) => (
                <Badge
                  key={k}
                  variant="outline"
                  className="border-destructive/40 font-mono text-xs text-destructive"
                >
                  ✕ {k}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}
      {reportData && (
        <div className="sm:col-span-2">
          <a
            href={reportData.url}
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-xs text-primary transition-colors hover:bg-primary/20"
          >
            <FileCheck2 className="size-4" />
            {reportData.url}
            <span className="text-muted-foreground">(PDF simulado)</span>
          </a>
        </div>
      )}
    </div>
  )
}

/** Simula o texto que um LLM produziria — mas a partir só do JSON estruturado. */
function buildSimulatedDossier(
  resume: ParseResumeResult,
  score: ScoreCandidateResult,
): string {
  const recommendation =
    score.match_score >= 80
      ? "RECOMENDADO para avançar para entrevista técnica."
      : score.match_score >= 50
        ? "RECOMENDADO COM RESERVAS — validar as skills em falta em entrevista."
        : "NÃO RECOMENDADO para esta vaga no estado atual."

  return [
    `Candidato: ${resume.candidate_name} (${resume.email})`,
    `Aderência à vaga: ${score.match_score}%`,
    "",
    `Skills correspondentes: ${score.matched_keywords.join(", ") || "nenhuma"}`,
    `Skills em falta: ${score.missing_keywords.join(", ") || "nenhuma"}`,
    "",
    `Análise: ${score.analysis_summary}`,
    "",
    `Recomendação: ${recommendation}`,
  ].join("\n")
}
