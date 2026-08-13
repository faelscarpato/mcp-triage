import { type NextRequest, NextResponse } from "next/server"
import {
  generateHrReport,
  parseResume,
  scoreCandidate,
  type McpToolName,
} from "@/lib/mcp-tools"

/**
 * Servidor MCP (Model Context Protocol) para triagem de RH.
 *
 * Contrato: POST { "tool": "nome_da_ferramenta", "params": {} }
 *
 * Toda a computação é determinística (regex + teoria de conjuntos).
 * A IA nunca vê o texto bruto — só recebe o JSON estruturado devolvido aqui.
 */

interface McpRequestBody {
  tool: McpToolName
  params: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  let body: McpRequestBody

  try {
    body = (await request.json()) as McpRequestBody
  } catch {
    return NextResponse.json(
      { error: "Corpo do pedido inválido. Esperado JSON." },
      { status: 400 },
    )
  }

  const { tool, params } = body ?? {}

  if (!tool) {
    return NextResponse.json(
      { error: 'Campo "tool" em falta.' },
      { status: 400 },
    )
  }

  try {
    switch (tool) {
      case "parse_resume": {
        const result = parseResume({
          content: String((params?.content as string) ?? ""),
          contentType: params?.contentType as string | undefined,
        })
        return NextResponse.json(result)
      }

      case "score_candidate": {
        // biome-ignore lint/suspicious/noExplicitAny: params vêm do contrato MCP genérico
        const result = scoreCandidate({
          resumeData: params?.resumeData as any,
          jobDescription: String((params?.jobDescription as string) ?? ""),
        })
        return NextResponse.json(result)
      }

      case "generate_hr_report": {
        const result = generateHrReport({
          candidateName: String((params?.candidateName as string) ?? ""),
          targetRole: String((params?.targetRole as string) ?? ""),
          aiDossierContent: String((params?.aiDossierContent as string) ?? ""),
        })
        return NextResponse.json(result)
      }

      default:
        return NextResponse.json(
          { error: `Ferramenta desconhecida: "${tool}".` },
          { status: 404 },
        )
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro interno ao executar a ferramenta.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

/** Descoberta de capacidades — útil para clientes MCP. */
export async function GET() {
  return NextResponse.json({
    server: "hr-triage-mcp",
    protocol: "mcp/http-json",
    tools: [
      {
        name: "parse_resume",
        description:
          "Extrai nome, email e skills de um currículo bruto via regex determinístico.",
        params: ["content", "contentType"],
      },
      {
        name: "score_candidate",
        description:
          "Calcula aderência candidato/vaga via interseção e diferença de conjuntos.",
        params: ["resumeData", "jobDescription"],
      },
      {
        name: "generate_hr_report",
        description: "Gera (simula) um parecer de RH em PDF a partir do dossiê da IA.",
        params: ["candidateName", "targetRole", "aiDossierContent"],
      },
    ],
  })
}
