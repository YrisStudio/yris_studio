import PageHeader from "../PageHeader";
import ProjectsBoard, { type Project } from "./ProjectsBoard";
import { getAssignees, requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Projets" };

// Les gros chantiers hors commandes : salon, partenariat garage, nouvelle gamme…
export default async function ProjectsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data }, people] = await Promise.all([
    supabase.from("projects").select("*").order("position").order("created_at"),
    getAssignees(),
  ]);
  const projects = (data ?? []) as Project[];
  const open = projects.filter((p) => p.status !== "terminé").length;
  return (
    <div>
      <PageHeader title="Projets" description={`${open} en cours ou en idée · glisser une carte pour changer son étape`} />
      <ProjectsBoard projects={projects} people={people} />
    </div>
  );
}
