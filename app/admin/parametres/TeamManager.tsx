"use client";

import { useActionState, useState, useTransition } from "react";
import { LoaderCircle, MailPlus, UserMinus, X } from "lucide-react";
import { addMember, cancelInvite, removeMember, setMemberRole, type SettingsState } from "./actions";
import { roleMeta, roles, type Invite, type Member } from "@/lib/team";

const field =
  "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition placeholder:text-muted/50 focus:border-accent sm:text-[13px]";
const select =
  "rounded-md border border-line bg-bg/60 px-2 py-1 text-base text-fg outline-none focus:border-accent disabled:opacity-60 sm:text-[12.5px]";

// Qui a accès au gestionnaire, avec quel rôle ; ajout d'un membre par son email.
export default function TeamManager({ team, invites, meId }: { team: Member[]; invites: Invite[]; meId: string }) {
  const [state, add, adding] = useActionState<SettingsState, FormData>(addMember, { status: "idle" });
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<SettingsState | null>(null);

  const run = (fn: () => Promise<SettingsState>, ask?: string) => {
    if (ask && !confirm(ask)) return;
    start(async () => setMessage(await fn()));
  };
  const shown = message ?? state;

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line rounded-md border border-line">
        {team.map((m) => {
          const me = m.userId === meId;
          return (
            <li key={m.userId} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded bg-accent text-[12px] font-semibold text-on-accent">
                {m.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">
                  {m.name} {me && <span className="font-normal text-muted">(toi)</span>}
                </p>
                <p className="truncate text-[12px] text-muted">{m.email}</p>
              </div>
              {me ? (
                <span className="rounded bg-fg/[0.06] px-2 py-1 text-[12px] text-fg/85">{roleMeta[m.role].label}</span>
              ) : (
                <>
                  <label className="sr-only" htmlFor={`role-${m.userId}`}>
                    Rôle de {m.name}
                  </label>
                  <select
                    id={`role-${m.userId}`}
                    value={m.role}
                    disabled={pending}
                    onChange={(e) => run(() => setMemberRole(m.userId, e.target.value))}
                    className={select}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {roleMeta[r].label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => removeMember(m.userId), `Retirer l'accès au gestionnaire à ${m.name} ?\n\nSon compte client reste sur le site.`)}
                    title="Retirer l'accès"
                    aria-label={`Retirer l'accès de ${m.name}`}
                    className="p-1.5 text-muted hover:text-red-300 disabled:opacity-50"
                  >
                    <UserMinus size={15} />
                  </button>
                </>
              )}
            </li>
          );
        })}
        {invites.map((i) => (
          <li key={i.email} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded border border-dashed border-line text-[12px] text-muted">
              {i.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">
                {i.name} <span className="ml-1 rounded bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-normal text-amber-300">Invité</span>
              </p>
              <p className="truncate text-[12px] text-muted">{i.email} · doit créer et confirmer son compte sur le site</p>
            </div>
            <span className="rounded bg-fg/[0.06] px-2 py-1 text-[12px] text-fg/85">{roleMeta[i.role].label}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => cancelInvite(i.email), `Annuler l'invitation de ${i.name} ?`)}
              title="Annuler l'invitation"
              aria-label={`Annuler l'invitation de ${i.name}`}
              className="p-1.5 text-muted hover:text-red-300 disabled:opacity-50"
            >
              <X size={15} />
            </button>
          </li>
        ))}
      </ul>

      <form action={add} onSubmit={() => setMessage(null)} className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto_auto] sm:items-end">
        <div>
          <label htmlFor="tm-name" className="mb-1 block text-[12px] text-fg/85">
            Prénom
          </label>
          <input id="tm-name" name="name" required maxLength={40} placeholder="Johann" className={field} />
        </div>
        <div>
          <label htmlFor="tm-email" className="mb-1 block text-[12px] text-fg/85">
            Email de son compte
          </label>
          <input id="tm-email" name="email" type="email" required placeholder="prenom@yris-studio.com" className={field} />
        </div>
        <div>
          <label htmlFor="tm-role" className="mb-1 block text-[12px] text-fg/85">
            Rôle
          </label>
          <select id="tm-role" name="role" defaultValue="gérant" className={`${select} w-full py-1.5`}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleMeta[r].label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-[13px] font-medium text-on-accent transition hover:brightness-110 disabled:opacity-60"
        >
          {adding ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <MailPlus size={13} aria-hidden />}
          Ajouter
        </button>
      </form>

      <div className="flex flex-wrap items-start gap-x-6 gap-y-1 text-[11.5px] text-muted">
        {roles.map((r) => (
          <p key={r}>
            <span className="text-fg/85">{roleMeta[r].label}</span> : {roleMeta[r].hint}
          </p>
        ))}
      </div>

      {shown.message && (
        <p role="status" className={`text-[12.5px] ${shown.status === "error" ? "text-red-300" : "text-accent"}`}>
          {shown.message}
        </p>
      )}
    </div>
  );
}
