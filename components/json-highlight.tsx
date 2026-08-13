import { Fragment } from "react"

/**
 * Realce de sintaxe minimalista para JSON — sem dependências externas.
 * Renderiza o JSON já formatado (2 espaços) com cores por tipo de token.
 */
export function JsonHighlight({ data }: { data: unknown }) {
  const json =
    typeof data === "string" ? data : JSON.stringify(data, null, 2)

  // Tokeniza strings, chaves, números, booleanos e null.
  const tokenRegex =
    /("(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

  const parts: Array<{ text: string; className: string }> = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(json)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: json.slice(lastIndex, match.index),
        className: "text-muted-foreground",
      })
    }

    const token = match[0]
    let className = "text-muted-foreground"

    if (/^"/.test(token)) {
      // Distingue chave (seguida de ":") de valor string.
      const rest = json.slice(match.index + token.length)
      className = /^\s*:/.test(rest)
        ? "text-[oklch(0.75_0.14_285)]" // chave (violeta claro)
        : "text-[oklch(0.78_0.13_160)]" // valor string (verde-água)
    } else if (/^(true|false)$/.test(token)) {
      className = "text-[oklch(0.78_0.16_90)]" // boolean (amarelo)
    } else if (token === "null") {
      className = "text-muted-foreground italic"
    } else {
      className = "text-[oklch(0.75_0.16_230)]" // número (azul)
    }

    parts.push({ text: token, className })
    lastIndex = match.index + token.length
  }

  if (lastIndex < json.length) {
    parts.push({
      text: json.slice(lastIndex),
      className: "text-muted-foreground",
    })
  }

  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
      {parts.map((part, i) => (
        <Fragment key={i}>
          <span className={part.className}>{part.text}</span>
        </Fragment>
      ))}
    </pre>
  )
}
