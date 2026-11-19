import type { Account, ClientNote, ClientRecord } from "@/lib/clients";
import { createClient } from "@/lib/supabase/server";

export async function getClientRecords() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("*");
  if (error) console.error("Clients :", error.message);
  return (data ?? []) as ClientRecord[];
}

export async function getClientRecord(email: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("*").eq("email", email).maybeSingle();
  return (data as ClientRecord | null) ?? null;
}

export async function getAccounts() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_accounts");
  if (error) console.error("Comptes :", error.message);
  return (data ?? []) as Account[];
}

export async function getClientNotes(email: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notes")
    .select("*")
    .eq("client_email", email)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) console.error("Notes client :", error.message);
  return (data ?? []) as ClientNote[];
}
