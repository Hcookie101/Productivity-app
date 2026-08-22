import { format } from "date-fns";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

let counter = 0;

/** tiny unique id generator */
export function uid(prefix = "id"): string {
  counter += 1;
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}${counter}`;
}

/** extract a JSON value (object or array) out of a possibly-fenced LLM response */
export function parseJsonBlock<T = unknown>(text: string): T | null {
  if (!text) return null;
  const t = text.trim();
  // strip markdown fences
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : t;
  // find outermost balanced { or [
  let start = -1;
  let end = -1;
  const chars: Record<string, string> = { "{": "}", "[": "]" };
  for (let i = 0; i < candidate.length; i++) {
    const c = candidate[i];
    if (c === "{" || c === "[") {
      start = i;
      const close = chars[c];
      let depth = 1;
      for (let j = i + 1; j < candidate.length; j++) {
        if (candidate[j] === c) depth += 1;
        else if (candidate[j] === close) {
          depth -= 1;
          if (depth === 0) {
            end = j;
            break;
          }
        }
      }
      break;
    }
  }
  if (start === -1 || end === -1) return null;
  const json = candidate.slice(start, end + 1);
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function formatDateISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export function prettyList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} & ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, & ${items[items.length - 1]}`;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}