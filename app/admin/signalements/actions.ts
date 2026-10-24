"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function setReportStatus(id: string, status: "nouveau" | "traité") {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  const { error } = await supabase.from("reports").update({ status }).eq("id", id);
  if (error) console.error("Admin signalement :", error.message);
  revalidatePath("/admin", "layout");
}
