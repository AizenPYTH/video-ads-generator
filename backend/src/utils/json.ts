/**
 * Best-effort JSON recovery for model output.
 *
 * Every step is attempted in order and the first one that parses wins, so a
 * response that was already valid is never touched. Nothing here invents
 * content: the repairs only close what was left open or remove punctuation
 * JSON does not allow.
 *
 * Truncation is the exception and is deliberately *not* silently repaired
 * into a smaller result - see `parseModelJson`'s `truncated` flag. A cut-off
 * storyboard that parses is worse than one that fails loudly, because it
 * quietly loses scenes the user paid for.
 */

export interface RepairOutcome {
  value: unknown;
  /** Which step succeeded, for logs. `none` means it parsed as-is. */
  repair:
    | "none"
    | "extracted"
    | "trailing-commas"
    | "missing-commas"
    | "quoted-keys"
    | "closed";
  /** Set when brackets had to be closed, i.e. the text was cut off. */
  truncated: boolean;
}

/** Strips markdown fences and any prose around the JSON payload. */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/);
  const body = (fenced?.[1] ?? text).trim();
  const start = body.search(/[[{]/);
  if (start === -1) return body;
  // Deliberately not trimmed to the last closing brace: on a truncated
  // response that cuts *more* off and turns one broken object into an
  // array that ends mid-element.
  return body.slice(start);
}

/** Removes `,` that sits directly before `}` or `]`, outside of strings. */
function stripTrailingCommas(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;
    if (inString) {
      out += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }
    if (char === ",") {
      const rest = text.slice(index + 1);
      const next = rest.match(/^\s*([}\]])/);
      if (next) continue; // drop the comma, keep the closer
    }
    out += char;
  }
  return out;
}

/** `}{` and `][` with nothing between them are a forgotten comma. */
function insertMissingCommas(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;
    out += char;
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "}" || char === "]") {
      const next = text.slice(index + 1).match(/^\s*([[{])/);
      if (next) out += ",";
    }
  }
  return out;
}

/**
 * Cuts back to the last closing bracket, which removes prose the model added
 * after the payload. Tried *after* the untrimmed text, because on a truncated
 * response this throws away a partial element rather than recovering it.
 */
function trimToLastCloser(text: string): string {
  const lastBrace = text.lastIndexOf("}");
  const lastBracket = text.lastIndexOf("]");
  const end = Math.max(lastBrace, lastBracket);
  return end === -1 ? text : text.slice(0, end + 1);
}

/** `{key: 1}` and `{'key': 1}` are not JSON; quote the keys properly. */
function quoteKeys(text: string): string {
  return text
    .replace(/([{,]\s*)'([^'\n]+)'(\s*:)/g, '$1"$2"$3')
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3');
}

interface Closed {
  text: string;
  changed: boolean;
}

/**
 * Closes a payload that stops mid-structure: terminates an open string, drops
 * the dangling partial value, then appends the missing brackets in order.
 */
function closeUnterminated(text: string): Closed {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  /** Index just past the last position where the document was well-formed. */
  let safeEnd = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') {
        inString = false;
        safeEnd = index + 1;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{" || char === "[") {
      stack.push(char === "{" ? "}" : "]");
      safeEnd = index + 1;
    } else if (char === "}" || char === "]") {
      stack.pop();
      safeEnd = index + 1;
    } else if (/[\d}\]eln]/.test(char)) {
      // digits and the tails of true/false/null are complete values
      safeEnd = index + 1;
    }
  }

  if (!inString && stack.length === 0) return { text, changed: false };

  let body = text.slice(0, safeEnd).replace(/[,:\s]+$/, "");
  // A key with no value cannot be closed into anything meaningful.
  body = body.replace(/,\s*"[^"]*"\s*$/, "");
  const closers = [...stack].reverse().join("");
  return { text: body + closers, changed: true };
}

function attempt(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Parses model output, repairing what can be repaired. Throws only when
 * nothing recognisable is left.
 */
export function parseModelJson(raw: string): RepairOutcome {
  const asIs = attempt(raw);
  if (asIs !== undefined) return { value: asIs, repair: "none", truncated: false };

  const extracted = extractJson(raw);
  const trimmed = trimToLastCloser(extracted);
  const steps: Array<[RepairOutcome["repair"], string]> = [
    ["extracted", extracted],
    ["extracted", trimmed],
    ["trailing-commas", stripTrailingCommas(extracted)],
    ["trailing-commas", stripTrailingCommas(trimmed)],
    ["missing-commas", insertMissingCommas(stripTrailingCommas(trimmed))],
    ["quoted-keys", quoteKeys(stripTrailingCommas(trimmed))],
  ];

  for (const [repair, candidate] of steps) {
    const value = attempt(candidate);
    if (value !== undefined) return { value, repair, truncated: false };
  }

  // Last resort: the payload was cut off mid-structure.
  const closed = closeUnterminated(stripTrailingCommas(extracted));
  if (closed.changed) {
    const value = attempt(closed.text);
    if (value !== undefined) {
      return { value, repair: "closed", truncated: true };
    }
  }

  throw new SyntaxError(
    `Could not parse model output as JSON (${raw.length} chars, no repair worked)`,
  );
}
