import { NextResponse } from "next/server";

export const maxDuration = 120;

interface ChatBody {
  settings?: {
    provider?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
  };
  messages?: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const settings = body.settings;
  if (!settings || !settings.apiKey || settings.apiKey.trim().length < 8) {
    return NextResponse.json({ error: "No API key configured" }, { status: 400 });
  }
  const messages = Array.isArray(body.messages) && body.messages.length ? body.messages : null;
  if (!messages) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

    const baseUrl = (settings.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = settings.model?.trim() || "gpt-4o-mini";

  // Thinking-style models (e.g. Gemini) can spend the whole output budget on
  // internal reasoning before emitting any text — keep a sane floor so the
  // response is never truncated to nothing.
  const requested = Number(body.maxTokens);
  const maxTokens =
    Number.isFinite(requested) && requested > 0
      ? Math.max(1024, Math.min(8192, Math.round(requested)))
      : 2200;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: body.temperature ?? 0.4,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    return NextResponse.json({ error: `Network error: ${(e as Error).message}` }, { status: 502 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Upstream ${res.status}: ${detail.slice(0, 300)}` },
      { status: res.status }
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null }; text?: string | null; finish_reason?: string }[];
  };
  const choice = data?.choices?.[0];
  const content =
    typeof choice?.message?.content === "string" && choice.message.content.trim().length > 0
      ? choice.message.content
      : typeof choice?.text === "string" && choice.text.trim().length > 0
        ? choice.text
        : null;
  if (!content) {
    return NextResponse.json(
      {
        error: `Empty upstream response (finish_reason: ${choice?.finish_reason ?? "unknown"}). If this keeps happening, check the model name in Settings.`,
      },
      { status: 502 }
    );
  }
  return NextResponse.json({ content });
}