"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck, ShieldOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; friendly_name?: string; status: string; created_at: string };

// Double authentification de la personne connectée : appli Google Authenticator, Authy, 1Password…
export default function MfaSetup() {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());

  const load = useCallback(
    () => supabase?.auth.mfa.listFactors().then(({ data }) => setFactors((data?.all ?? []) as Factor[])),
    [supabase],
  );

  useEffect(() => {
    // Lecture des facteurs au chargement ; la mise à jour arrive dans la promesse.
    supabase?.auth.mfa.listFactors().then(({ data }) => setFactors((data?.all ?? []) as Factor[]));
  }, [supabase]);

  async function start() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    // Une tentative précédente non terminée bloquerait la nouvelle : on la retire.
    for (const f of factors ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error: e } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Yris ${new Date().toLocaleDateString("fr-FR")}` });
    setBusy(false);
    if (e || !data) return setError("Impossible de démarrer : " + (e?.message ?? "erreur"));
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !enrolling) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolling.id, code: code.replace(/\s/g, "") });
    setBusy(false);
    if (err) return setError("Code incorrect. Vérifiez l'heure du téléphone et réessayez.");
    setEnrolling(null);
    setCode("");
    load();
  }

  async function remove(id: string) {
    if (!supabase || !confirm("Désactiver la double authentification ? La connexion ne demandera plus de code.")) return;
    setBusy(true);
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (err) return setError("Impossible de désactiver : reconnectez-vous puis réessayez.");
    load();
  }

  const verified = (factors ?? []).filter((f) => f.status === "verified");

  if (factors === null) return <LoaderCircle size={16} className="animate-spin text-muted" aria-label="Chargement" />;

  return (
    <div className="space-y-3 text-[13px]">
      {verified.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck size={16} className="text-accent" aria-hidden />
          <span>Activée sur votre compte. Le gestionnaire demande un code à chaque connexion.</span>
          <button type="button" disabled={busy} onClick={() => remove(verified[0].id)} className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-red-300">
            <ShieldOff size={13} aria-hidden /> Désactiver
          </button>
        </div>
      ) : enrolling ? (
        <form onSubmit={confirmCode} className="grid gap-4 sm:grid-cols-[180px_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR code fourni par Supabase */}
          <img src={enrolling.qr} alt="QR code à scanner" className="size-[180px] rounded-md bg-white p-2" />
          <div className="space-y-2">
            <p>1. Dans votre appli d&apos;authentification (Google Authenticator, Authy…), ajoutez un compte en scannant ce QR code.</p>
            <p className="text-muted">
              Pas de QR ? Clé à saisir : <span className="select-all break-all font-mono text-fg">{enrolling.secret}</span>
            </p>
            <p>2. Saisissez le code à 6 chiffres affiché :</p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, "").slice(0, 7))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123 456"
                aria-label="Code à 6 chiffres"
                className="w-32 rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-center font-mono text-base tracking-widest outline-none focus:border-accent"
              />
              <button type="submit" disabled={busy || code.replace(/\s/g, "").length !== 6} className="rounded-md bg-fg px-3 py-1.5 text-[12.5px] font-medium text-bg disabled:opacity-50">
                Activer
              </button>
              <button type="button" onClick={() => setEnrolling(null)} className="text-[12.5px] text-muted hover:text-fg">
                Annuler
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted">Pas activée. Avec elle, un mot de passe volé ne suffit plus pour entrer dans le gestionnaire.</span>
          <button type="button" disabled={busy} onClick={start} className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[12.5px] hover:border-line-strong">
            {busy ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <ShieldCheck size={13} aria-hidden />} Activer
          </button>
        </div>
      )}
      {error && <p className="text-[12px] text-red-300">{error}</p>}
    </div>
  );
}
