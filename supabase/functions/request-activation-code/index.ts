import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const alpha = "abcdefghijkmnpqrstuvwxyz";
const NUM = "23456789";
const ALL = ALPHA + alpha + NUM;

function generateCode(): string {
  const bytes = new Uint8Array(7);
  crypto.getRandomValues(bytes);
  // Ensure at least 1 upper, 1 lower, 1 digit
  const chars = [
    ALPHA[bytes[0] % ALPHA.length],
    alpha[bytes[1] % alpha.length],
    NUM[bytes[2] % NUM.length],
  ];
  for (let i = 3; i < 7; i++) chars.push(ALL[bytes[i] % ALL.length]);
  // shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "E-mail inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email in auth.users via admin listing (paginated); use a direct query via profiles + auth.users mapping.
    // Use listUsers filter (available in supabase-js v2)
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = usersList?.users?.find((u) => (u.email || "").toLowerCase() === normalizedEmail);

    if (!authUser) {
      return new Response(JSON.stringify({ error: "not_authorized", message: "Este e-mail não possui autorização para acessar o sistema. Entre em contato com o administrador." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabaseAdmin.from("profiles").select("status").eq("id", authUser.id).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "not_authorized", message: "Este e-mail não possui autorização para acessar o sistema. Entre em contato com o administrador." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (profile.status === "bloqueado") {
      return new Response(JSON.stringify({ error: "blocked", message: "Esta conta está bloqueada. Entre em contato com o administrador." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (profile.status === "ativo") {
      return new Response(JSON.stringify({ error: "already_activated", message: "Esta conta já foi ativada. Utilize a tela de login." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Invalidate previous unused codes for this email
    await supabaseAdmin.from("activation_codes").update({ used_at: new Date().toISOString() }).eq("email", normalizedEmail).is("used_at", null);

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertError } = await supabaseAdmin.from("activation_codes").insert({ email: normalizedEmail, code, expires_at: expiresAt });
    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try sending via transactional email; if not available, return dev_code so frontend can display it.
    let sent = false;
    try {
      const { error: sendError } = await supabaseAdmin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "activation-code",
          recipientEmail: normalizedEmail,
          idempotencyKey: `activation-${normalizedEmail}-${Date.now()}`,
          templateData: { code, minutes: 10 },
        },
      });
      if (!sendError) sent = true;
    } catch (_) { /* email infra not configured yet */ }

    return new Response(JSON.stringify({ success: true, sent, dev_code: sent ? undefined : code, expires_in_minutes: 10 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});