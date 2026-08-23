"use client";

import { useRef, useState } from "react";
import { Download, Upload, Trash2, KeyRound, SlidersHorizontal, Database, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { AI_PROVIDERS } from "@/lib/constants";
import type { AIProvider } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, TextInput, Select } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Controls";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";

export default function SettingsPage() {
  const prefs = useStore((s) => s.prefs);
  const settings = useStore((s) => s.settings);
  const updatePrefs = useStore((s) => s.updatePrefs);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const importJson = useStore((s) => s.importJson);
  const pushToast = useStore((s) => s.pushToast);

  const fileRef = useRef<HTMLInputElement>(null);
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState<boolean | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const providerMeta = AI_PROVIDERS.find((p) => p.value === settings.provider) ?? AI_PROVIDERS[0];

  const exportData = () => {
    const state = useStore.getState();
    const payload = {
      exportedAt: new Date().toISOString(),
      goals: state.goals,
      obligations: state.obligations,
      weeks: state.weeks,
      sessions: state.sessions,
      siteStats: state.siteStats,
      prefs: state.prefs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orbit-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Exported", "Your Orbit data was downloaded as JSON.");
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    if (importJson(text)) {
      toast("Imported", "Your data was restored into this browser.");
    } else {
      toast("Import failed", "That file doesn't look like an Orbit export.", "error");
    }
  };

  const testAI = async () => {
    setTesting(true);
    setTestOk(null);
    try {
            const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings,
          messages: [{ role: "user", content: "Reply with exactly: OK" }],
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setTestOk(true);
      pushToast({ title: "AI connection works", tone: "success" });
    } catch (e) {
      setTestOk(false);
      pushToast({ title: "AI test failed", message: String(e), tone: "error" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] font-medium uppercase tracking-widest text-iris-soft">Control room</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Bring your own AI key — everything stays in this browser.
        </p>
      </div>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-iris-soft" /> AI provider
            </span>
          }
          subtitle="Any OpenAI-compatible endpoint. Without a key, Orbit uses its built-in rules engine."
          right={
            testOk === true ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
              </span>
            ) : testOk === false ? (
              <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300">
                Failing
              </span>
            ) : null
          }
        />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider">
              <Select
                value={settings.provider}
                onChange={(e) => {
                  const p = AI_PROVIDERS.find((x) => x.value === (e.target.value as AIProvider))!;
                  updateSettings({ provider: p.value, model: p.modelDefault, baseUrl: p.base, apiKey: "" });
                  setTestOk(null);
                }}
              >
                {AI_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Model" hint={`e.g. ${providerMeta.modelDefault || "your-model-name"}`}>
              <TextInput
                value={settings.model}
                placeholder={providerMeta.modelDefault}
                onChange={(e) => updateSettings({ model: e.target.value })}
              />
            </Field>
                        <Field
              label="API key"
              hint={
                settings.provider === "gemini"
                  ? "Free keys at aistudio.google.com/apikey — stored only in this browser."
                  : settings.provider === "openrouter"
                    ? "Keys at openrouter.ai/keys — stored only in this browser."
                    : "Stored only in this browser's local storage."
              }
            >
              <TextInput
                type="password"
                value={settings.apiKey}
                placeholder={settings.provider === "gemini" ? "AIza…" : "sk-…"}
                onChange={(e) => {
                  updateSettings({ apiKey: e.target.value });
                  setTestOk(null);
                }}
              />
            </Field>
            {settings.provider === "custom" ? (
              <Field label="Base URL">
                <TextInput
                  value={settings.baseUrl}
                  placeholder="https://api.example.com/v1"
                  onChange={(e) => updateSettings({ baseUrl: e.target.value })}
                />
              </Field>
            ) : null}
          </div>
          <div className="mt-4">
            <Button variant="subtle" size="sm" loading={testing} onClick={testAI} disabled={!settings.apiKey}>
              Test connection
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-sky-300" /> Scheduling preferences
            </span>
          }
          subtitle="These drive the planner and the Day Health score."
        />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Day starts">
              <TextInput type="time" value={prefs.dayStart} onChange={(e) => updatePrefs({ dayStart: e.target.value })} />
            </Field>
            <Field label="Day ends">
              <TextInput type="time" value={prefs.dayEnd} onChange={(e) => updatePrefs({ dayEnd: e.target.value })} />
            </Field>
            <Field label="Max work hours / day">
              <TextInput
                type="number"
                min={1}
                max={16}
                value={prefs.maxWorkHours}
                onChange={(e) => updatePrefs({ maxWorkHours: Math.max(1, Math.min(16, Number(e.target.value) || 7)) })}
              />
            </Field>
            <Field label="Deep work from">
              <TextInput type="time" value={prefs.deepWorkStart} onChange={(e) => updatePrefs({ deepWorkStart: e.target.value })} />
            </Field>
            <Field label="Deep work until">
              <TextInput type="time" value={prefs.deepWorkEnd} onChange={(e) => updatePrefs({ deepWorkEnd: e.target.value })} />
            </Field>
            <Field label="Focus block length (min)">
              <TextInput
                type="number"
                min={25}
                max={180}
                step={5}
                value={prefs.focusBlockMinutes}
                onChange={(e) => updatePrefs({ focusBlockMinutes: Number(e.target.value) || 75 })}
              />
            </Field>
            <Field label="Break every (min)">
              <TextInput
                type="number"
                min={30}
                max={240}
                step={15}
                value={prefs.breakEveryMinutes}
                onChange={(e) => updatePrefs({ breakEveryMinutes: Number(e.target.value) || 90 })}
              />
            </Field>
            <Field label="Break length (min)">
              <TextInput
                type="number"
                min={5}
                max={60}
                step={5}
                value={prefs.breakMinutes}
                onChange={(e) => updatePrefs({ breakMinutes: Number(e.target.value) || 15 })}
              />
            </Field>
            <div className="flex items-end pb-1.5">
              <Toggle
                checked={prefs.includeLunch}
                onChange={(v) => updatePrefs({ includeLunch: v })}
                label="Auto-insert lunch around 12:30"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Database className="h-4 w-4 text-teal-300" /> Data
            </span>
          }
          subtitle="Local-first: export a backup, restore it anywhere."
        />
        <CardBody>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="subtle" size="sm" onClick={exportData} icon={<Download className="h-4 w-4" />}>
              Export JSON
            </Button>
            <Button variant="subtle" size="sm" onClick={() => fileRef.current?.click()} icon={<Upload className="h-4 w-4" />}>
              Import JSON
            </Button>
                        <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void onImportFile(e.target.files?.[0])}
            />
            <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmReset(true)}>
              Reset everything
            </Button>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset everything?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetAll();
                setConfirmReset(false);
                toast("Reset done", "Orbit is a blank slate again.", "warn");
              }}
            >
              Yes, wipe my data
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted">
          This clears goals, obligations, schedules, sessions and site stats from this browser. Your AI key is kept.
          Consider exporting a backup first.
        </p>
      </Modal>
    </div>
  );
}