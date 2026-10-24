import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Tant que les variables Supabase ne sont pas définies, le site marche sans comptes.
export const authEnabled = Boolean(url && key);

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(url!, key!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un composant serveur : le proxy se charge de rafraîchir la session.
        }
      },
    },
  });
}

export async function getUser() {
  if (!authEnabled) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// N'accepte que les chemins internes, pour éviter les redirections vers un autre site.
export function safeNext(next: unknown, fallback = "/compte") {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}
