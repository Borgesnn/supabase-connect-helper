import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { email, code } = await req.json();
    if (!email || !code) return new Response(JSON.stringify({ error: "E-mail e código são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: row } = await supabaseAdmin.from("activation_codes")
      .select("id, expires_at, used_at")
      .eq("email", normalizedEmail)
      .eq("code", String(code).trim())
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return new Response(JSON.stringify({ error: "invalid", message: "Código inválido." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "expired", message: "Código expirado. Solicite um novo código." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Do not mark used yet — mark on complete-activation. Return short-lived token = code+email that complete-activation will re-check.
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});