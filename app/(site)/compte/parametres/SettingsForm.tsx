"use client";

import { startTransition, useActionState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import type { SettingsState } from "./actions";

export const field =
  "w-full rounded-lg border border-line-strong bg-panel-2 px-3.5 py-2.5 text-[15px] text-fg outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/15";
export const label = "mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-muted";

// Un bloc de réglage : titre, description, champs, et message de retour.
export default function SettingsForm({
  action,
  title,
  description,
  submitLabel,
  resetOnSuccess = false,
  children,
}: {
  action: (prev: SettingsState, formData: FormData) => Promise<SettingsState>;
  title: string;
  description: string;
  submitLabel: string;
  resetOnSuccess?: boolean;
  children: React.ReactNode;
}) {
  const [state, run, pending] = useActionState<SettingsState, FormData>(action, { status: "idle" });

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      await run(fd);
      if (resetOnSuccess) form.reset();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid gap-6 rounded-2xl border border-line bg-panel p-6 sm:p-8 md:grid-cols-[1fr_1.4fr] md:gap-10"
    >
      <div>
        <h2 className="text-lg font-medium tracking-tight">{title}</h2>
        <p className="mt-1.5 text-sm text-muted">{description}</p>
      </div>
      <div className="space-y-4">
        {children}

        {state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
              state.status === "error"
                ? "border border-red-500/30 bg-red-500/10 text-red-600"
                : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
            }`}
          >
            {state.status === "success" && <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden />}
            {state.message}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-fg px-5 py-2.5 text-sm font-medium text-bg transition hover:opacity-85 disabled:opacity-60"
          >
            {pending && <LoaderCircle size={15} className="animate-spin" aria-hidden />}
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
