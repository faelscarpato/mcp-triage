import { createMcpHandler } from "mcp-handler"
import { z } from "zod"
import {
  KNOWN_SKILLS,
  generateHrReport,
  parseResume,
  scoreCandidate,
} from "@/lib/mcp-tools"

/**
 * Servidor MCP (Model Context Protocol) REAL para triagem de RH.
 *
 * Este endpoint fala o protocolo MCP nativo (JSON-RPC via Streamable HTTP)
 * através do adaptador oficial `mcp-handler` da Vercel. Qualquer cliente MCP
 * — Claude, Cursor, Windsurf, VS Code, etc. — pode instalar este servidor
 * apontando para a URL pública:
 *
 *   https://<o-teu-dominio>/api/mcp
 *
 * Toda a computação é 100% determinística (regex + teoria de conjuntos): a IA
 * nunca vê o texto bruto do currículo, apenas o JSON estruturado devolvido.
 */

const handler = createMcpHandler(
  (server) => {
    // -----------------------------------------------------------------
    // Tool A: parse_resume
    // -----------------------------------------------------------------
    server.registerTool(
      "parse_resume",
      {
        title: "Analisar currículo",
        description:
          "Extrai nome, email e skills de um currículo em texto bruto usando regex determinístico. " +
          "Não usa IA — devolve JSON estruturado e compacto para poupar tokens. " +
          `Skills reconhecidas: ${KNOWN_SKILLS.join(", ")}.`,
        inputSchema: z.object({
          content: z
            .string()
            .describe("Texto bruto completo do currículo (ex.: conteúdo de um PDF)."),
          contentType: z
            .string()
            .optional()
            .describe('Tipo de conteúdo, ex.: "text/plain". Opcional.'),
        }),
      },
      async ({ content, contentType }) => {
        const result = parseResume({ content, contentType })
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        }
      },
    )

    // -----------------------------------------------------------------
    // Tool B: score_candidate
    // -----------------------------------------------------------------
    server.registerTool(
      "score_candidate",
      {
        title: "Pontuar candidato",
        description:
          "Calcula a aderência entre um candidato e uma vaga via teoria de conjuntos " +
          "(interseção = skills correspondentes, diferença = skills em falta). " +
          "Devolve match_score (0-100), matched_keywords, missing_keywords e um resumo.",
        inputSchema: z.object({
          resumeData: z
            .object({
              candidate_name: z.string().optional(),
              email: z.string().optional(),
              skills: z.array(z.string()).describe("Skills do candidato."),
              raw_text_length: z.number().optional(),
            })
            .describe("Resultado devolvido por parse_resume."),
          jobDescription: z
            .string()
            .describe("Descrição da vaga em texto livre."),
        }),
      },
      async ({ resumeData, jobDescription }) => {
        const result = scoreCandidate({
          resumeData: {
            candidate_name: resumeData.candidate_name ?? "",
            email: resumeData.email ?? "",
            skills: resumeData.skills ?? [],
            raw_text_length: resumeData.raw_text_length ?? 0,
          },
          jobDescription,
        })
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        }
      },
    )

    // -----------------------------------------------------------------
    // Tool C: generate_hr_report
    // -----------------------------------------------------------------
    server.registerTool(
      "generate_hr_report",
      {
        title: "Gerar parecer de RH",
        description:
          "Gera um parecer de triagem de RH formatado a partir do dossiê produzido pela IA. " +
          "Devolve status, uma URL do relatório e o conteúdo já formatado.",
        inputSchema: z.object({
          candidateName: z.string().describe("Nome do candidato."),
          targetRole: z.string().describe("Cargo/vaga alvo."),
          aiDossierContent: z
            .string()
            .describe("Parecer/dossiê em texto produzido pela IA."),
        }),
      },
      async ({ candidateName, targetRole, aiDossierContent }) => {
        const result = generateHrReport({
          candidateName,
          targetRole,
          aiDossierContent,
        })
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        }
      },
    )
  },
  {
    serverInfo: {
      name: "hr-triage-mcp",
      version: "1.0.0",
    },
  },
)

export { handler as GET, handler as POST, handler as DELETE }
