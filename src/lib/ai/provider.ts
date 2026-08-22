import type { AISettings } from "../types";
import { AI_PROVIDERS } from "../constants";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

function providerDefaults(p: AISettings["provider"]) {
  return AI_PROVIDERS.find((x) => x.value === p) ?? AI_PROVIDERS[0];
}

export function aiConfigured(settings: AISettings): boolean {
  return settings.apiKey.trim().length > 8;
}

function endpoint(settings: AISettings) {
  const def = providerDefaults(settings.provider);
  const base = (settings.baseUrl || def.base).replace(/\/+$/, "");
  const model = settings.model.trim() || def.modelDefault;
  return { url: `${base}/chat/completions`, model, key: settings.apiKey.trim() };
}

/** Call an OpenAI-compatible chat completions endpoint with a sane timeout. */
export async function chatRaw(
  settings: AISettings,
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<string> {
  // Prefer the local proxy route (helps providers that restrict CORS).
  if (typeof window !== "undefined") {
    try {
      const proxied = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings,
          messages,
          temperature: opts.temperature ?? 0.4,
          maxTokens: opts.maxTokens ?? 2200,
        }),
      });
      if (proxied.ok) {
        const data = (await proxied.json()) as { content?: string };
        if (data.content) return data.content;
      }
    } catch {
      // fall through to the direct call
    }
  }
  const { url, model, key } = endpoint(settings);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 2200,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status}): ${detail.slice(0, 220)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI returned an empty response");
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

/** Safer JSON round trip: ask for JSON, then parse it ourselves. */
export async function chatJSON<T>(
  settings: AISettings,
  system: string,
  user: string,
  opts: ChatOptions = {}
): Promise<T | null> {
  const raw = await chatRaw(
    settings,
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    opts
  );
  try {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : raw;
    const start = candidate.indexOf("{");
    const endIdx = candidate.lastIndexOf("}");
    if (start === -1 || endIdx === -1) return null;
    return JSON.parse(candidate.slice(start, endIdx + 1)) as T;
  } catch {
    return null;
  }
}