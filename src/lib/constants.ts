import type { AIProvider, AISettings, AppPrefs, Priority, SiteCategory, SlotKind } from "./types";

export const APP_NAME = "Orbit";
export const APP_TAGLINE = "Every goal, obligation & focus hour — in one orbit.";
export const STORAGE_KEY = "orbit-app-v1";
/** Bump to force a re-seed on next load (v5: stats start empty, no fake data). */
export const SEED_VERSION = 5;

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_LABELS_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const PRIORITIES: { value: Priority; label: string; hue: string }[] = [
  { value: "low", label: "Low", hue: "#6b7280" },
  { value: "medium", label: "Medium", hue: "#f59e0b" },
  { value: "high", label: "High", hue: "#fb7185" },
  { value: "critical", label: "Critical", hue: "#ef4444" },
];

export const GOAL_COLORS = [
  "#8b6cff",
  "#38bdf8",
  "#2dd4bf",
  "#f59e0b",
  "#fb7185",
  "#f472b6",
  "#34d399",
  "#a78bfa",
];

export const SLOT_KIND_META: Record<SlotKind, { label: string; chip: string; bar: string }> = {
  obligation: { label: "Obligation", chip: "#a78bfa", bar: "#a78bfa" },
  task: { label: "Goal work", chip: "#38bdf8", bar: "#38bdf8" },
  break: { label: "Break", chip: "#2dd4bf", bar: "#2dd4bf" },
};

export const CATEGORY_COLORS: Record<SiteCategory, string> = {
  Work: "#8b6cff",
  Learning: "#38bdf8",
  Social: "#fb7185",
  Entertainment: "#f59e0b",
  News: "#94a3b8",
  Shopping: "#f472b6",
  Other: "#64748b",
};

export const DEFAULT_PREFS: AppPrefs = {
  dayStart: "06:00",
  dayEnd: "23:00",
  deepWorkStart: "09:00",
  deepWorkEnd: "11:00",
  maxWorkHours: 7,
  breakEveryMinutes: 90,
  breakMinutes: 15,
  focusBlockMinutes: 75,
  includeLunch: true,
};

export const AI_PROVIDERS: {
  value: AIProvider;
  label: string;
  modelDefault: string;
  base: string;
}[] = [
  {
    value: "gemini",
    label: "Google Gemini",
    modelDefault: "gemini-2.5-flash",
    base: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
  {
    value: "openai",
    label: "OpenAI",
    modelDefault: "gpt-4o-mini",
    base: "https://api.openai.com/v1",
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    modelDefault: "openai/gpt-4o-mini",
    base: "https://openrouter.ai/api/v1",
  },
  {
    value: "custom",
    label: "Custom (OpenAI-compatible)",
    modelDefault: "your-model-name",
    base: "https://api.example.com/v1",
  },
];

export const DEFAULT_AI: AISettings = {
  provider: "gemini",
  model: AI_PROVIDERS[0].modelDefault,
  apiKey: "",
  baseUrl: AI_PROVIDERS[0].base,
};

export const isAIConfigured = (s: AISettings): boolean => s.apiKey.trim().length > 8;