import type { Metadata } from "next";
import { Suspense } from "react";
import AdminShell from "./AdminShell";
import { requireAdmin } from "@/lib/admin";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "Gestionnaire", template: "%s · Gestionnaire Yris" },
  robots: { index: false },
};

// Gestionnaire : page à part, sans l'en-tête ni le pied de page du site.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const user = await getUser();

  return (
    <Suspense>
      <AdminShell email={user?.email ?? ""}>{children}</AdminShell>
    </Suspense>
  );
}
