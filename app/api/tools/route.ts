import { type NextRequest, NextResponse } from "next/server"
import {
  generateHrReport,
  parseResume,
  scoreCandidate,
  type McpToolName,
} from "@/lib/mcp-tools"

/**
 * Endpoint REST simples usado APENAS pelo dashboard de simulação do frontend.
 *
 * Contrato: POST { "tool": "nome_da_ferramenta", "params": {} }
 *
 * O servidor MCP real (protocolo JSON-RPC) vive em /api/mcp. Esta rota é uma
 * conveniência para a UI mostrar o fluxo de dados sem ter de falar JSON-RPC,
 * mas reutiliza exatamente a mesma lógica determinística de lib/mcp-tools.
 */

interface ToolsRequestBody {
  tool: McpToolName
  params: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  let body: ToolsRequestBody

  try {
    body = (await request.json()) as ToolsRequestBody
  } catch {
    return NextResponse.json(
      { error: "Corpo do pedido inválido. Esperado JSON." },
      { status: 400 },
    )
  }

  const { tool, params } = body ?? {}

  if (!tool) {
    return NextResponse.json({ error: 'Campo "tool" em falta.' }, { status: 400 })
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
        // biome-ignore lint/suspicious/noExplicitAny: params vêm do contrato genérico
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
