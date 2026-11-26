"use client";

import { useState, useTransition } from "react";
import { UserRound } from "lucide-react";
import { assignOrder } from "../actions";

// Qui s'occupe de la commande : un prénom de l'équipe, ou personne.
export default function AssignSelect({ id, value, people }: { id: string; value: string | null; people: string[] }) {
  const [current, setCurrent] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const options = value && !people.includes(value) ? [...people, value] : people;

  return (
    <label className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-1 text-[12.5px]">
      <UserRound size={13} className="text-muted" aria-hidden />
      <span className="text-muted">Pour</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const who = e.target.value;
          const before = current;
          setCurrent(who);
          setError(null);
          start(async () => {
            const res = await assignOrder(id, who);
            if (res.status === "error") {
              setCurrent(before);
              setError(res.message ?? "Erreur");
            }
          });
        }}
        className="bg-transparent font-medium text-fg outline-none"
        aria-label="Qui s'occupe de la commande"
      >
        <option value="">Personne</option>
        {options.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      {error && <span className="text-red-300">{error}</span>}
    </label>
  );
}
