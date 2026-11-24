import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import AdminShell from "./AdminShell";
import { getMe, requireAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: { default: "Gestionnaire", template: "%s · Gestionnaire Yris" },
  robots: { index: false },
  // Installable sur le téléphone (« Ajouter à l'écran d'accueil ») : s'ouvre en plein écran sur le gestionnaire.
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "Yris", statusBarStyle: "black" },
};

export const viewport: Viewport = { themeColor: "#0b0b0a" };

// Gestionnaire : page à part, sans l'en-tête ni le pied de page du site.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const me = await getMe();

  return (
    <Suspense>
      <AdminShell email={me?.email ?? ""} name={me?.name ?? ""} manager={me?.role === "gérant"}>{children}</AdminShell>
    </Suspense>
  );
}
