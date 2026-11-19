// Atelier : imprimantes, file d'impression et planning estimé. Types et calculs sans dépendance serveur.

export const printerModels = [
  "Bambu Lab A1 mini",
  "Bambu Lab A1",
  "Bambu Lab P1P",
  "Bambu Lab P1S",
  "Bambu Lab P2S",
  "Bambu Lab X1C",
  "Bambu Lab X1E",
  "Bambu Lab H2D",
  "Autre",
] as const;

export type Printer = {
  id: string;
  name: string;
  model: string;
  status: "active" | "maintenance" | "hors service";
  hours_total: number;
  hours_at_maintenance: number;
  maintenance_every_hours: number;
  last_maintenance_at: string | null;
  notes: string | null;
  created_at: string;
};

export type PrintJob = {
  id: string;
  order_id: string | null;
  printer_id: string | null;
  title: string;
  material: string | null;
  grams: number;
  hours: number;
  quantity: number;
  status: "à faire" | "en cours" | "terminé" | "raté";
  position: number;
  started_at: string | null;
  finished_at: string | null;
  failure_reason: string | null;
  grams_lost: number | null;
  spool_id: string | null;
  report_id: string | null;
  created_at: string;
};

// Durée totale d'une impression (heures par pièce × quantité), en millisecondes.
export const jobDurationMs = (j: Pick<PrintJob, "hours" | "quantity">) => Number(j.hours) * j.quantity * 3_600_000;

// Heures avant la prochaine maintenance (négatif = en retard).
export const hoursUntilMaintenance = (p: Printer) =>
  p.maintenance_every_hours - (Number(p.hours_total) - Number(p.hours_at_maintenance));

export type Slot = { start: Date; end: Date };

// Planning estimé d'une imprimante : l'impression en cours, puis la file, l'une après l'autre.
export function planPrinter(jobs: PrintJob[], now = new Date()): Map<string, Slot> {
  const slots = new Map<string, Slot>();
  let cursor = now.getTime();
  const running = jobs.find((j) => j.status === "en cours");
  if (running) {
    const start = running.started_at ? new Date(running.started_at).getTime() : cursor;
    const end = Math.max(start + jobDurationMs(running), cursor);
    slots.set(running.id, { start: new Date(start), end: new Date(end) });
    cursor = end;
  }
  for (const j of jobs.filter((j) => j.status === "à faire").sort((a, b) => a.position - b.position)) {
    const end = cursor + jobDurationMs(j);
    slots.set(j.id, { start: new Date(cursor), end: new Date(end) });
    cursor = end;
  }
  return slots;
}

// Avancement estimé d'une impression en cours (0 à 1).
export function progress(j: PrintJob, now = new Date()) {
  if (j.status !== "en cours" || !j.started_at) return 0;
  const total = jobDurationMs(j);
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, (now.getTime() - new Date(j.started_at).getTime()) / total));
}

export function formatHours(h: number) {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  if (hh === 0) return `${mm} min`;
  return mm ? `${hh} h ${String(mm).padStart(2, "0")}` : `${hh} h`;
}
