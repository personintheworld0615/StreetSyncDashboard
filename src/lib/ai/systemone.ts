import { REPORT_QUESTIONS } from "@/lib/ai/questions";

export type SystemOneAnswer = {
  type?: string;
  choice?: string;
  score?: number;
  noul?: number;
  confidence?: number;
  answer_confidence?: number;
  probabilities?: Record<string, number>;
  low_confidence?: boolean;
};

export type SystemOneResponse = {
  answers?: Record<string, SystemOneAnswer>;
  model?: string;
  routing?: { model?: string };
  usage?: { input_tokens?: number; output_tokens?: number; cost?: number };
  error?: string | { message?: string };
};

const OPENROUTER_DECISIONS = "https://openrouter.ai/api/alpha/decisions";

export function isSystemOneConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export async function predictSystemOne(
  state: unknown,
  questions: Record<string, unknown> = REPORT_QUESTIONS
): Promise<SystemOneResponse> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new Error("systemone_not_configured");
  }

  const model =
    process.env.OPENROUTER_JEV_MODEL?.trim() || "typesafe/jev-1.13";

  const res = await fetch(OPENROUTER_DECISIONS, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://streetsync.app",
      "X-Title": "StreetSync Municipal Ops",
    },
    body: JSON.stringify({
      model,
      state,
      questions,
    }),
  });

  const body = (await res.json().catch(() => null)) as SystemOneResponse | null;
  if (!res.ok) {
    const err = body?.error;
    const msg =
      typeof err === "string"
        ? err
        : err?.message || `Jev request failed (${res.status})`;
    throw new Error(msg);
  }
  return body ?? {};
}

export function answerConfidence(answer?: SystemOneAnswer) {
  if (!answer) return 0;
  const raw = answer.answer_confidence ?? answer.confidence;
  if (typeof raw === "number" && Number.isFinite(raw)) return clamp01(raw);
  if (typeof answer.noul === "number") {
    return clamp01(Math.max(answer.noul, 1 - answer.noul));
  }
  if (answer.probabilities) {
    const vals = Object.values(answer.probabilities);
    if (vals.length) return clamp01(Math.max(...vals));
  }
  return 0;
}

export function choiceValue(answer: SystemOneAnswer | undefined, fallback: string) {
  return (answer?.choice || fallback).trim() || fallback;
}

export function noulValue(answer?: SystemOneAnswer) {
  if (typeof answer?.noul === "number" && Number.isFinite(answer.noul)) {
    return clamp01(answer.noul);
  }
  return 0;
}

export function scoreLevel(answer?: SystemOneAnswer): 0 | 1 | 2 {
  const raw = answer?.score;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  if (raw >= 1.5) return 2;
  if (raw >= 0.5) return 1;
  return 0;
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
