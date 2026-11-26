"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function MfaChallenge() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) return;
    setPending(true);
    setError(null);
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp.find((f) => f.status === "verified");
    if (!factor) {
      setPending(false);
      return setError("Aucune appli d'authentification n'est reliée à ce compte.");
    }
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.replace(/\s/g, "") });
    if (verifyError) {
      setPending(false);
      setCode("");
      return setError("Code incorrect ou expiré. Réessayez avec le code suivant.");
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={verify} className="mt-8 space-y-4">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, "").slice(0, 7))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        required
        placeholder="123 456"
        aria-label="Code à 6 chiffres"
        className="w-full rounded-lg border border-line-strong bg-panel-2 px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] text-fg outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
      />
      <button
        type="submit"
        disabled={pending || code.replace(/\s/g, "").length !== 6}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fg px-5 py-3 text-sm font-medium text-bg disabled:opacity-50"
      >
        {pending ? <LoaderCircle size={15} className="animate-spin" aria-hidden /> : <ShieldCheck size={15} aria-hidden />}
        Vérifier
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
