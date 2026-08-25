import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NUM = "23456789";
const ALL = ALPHA + NUM;

function generateCode(): string {
  const bytes = new Uint8Array(7);
  crypto.getRandomValues(bytes);
  const chars = [
    ALPHA[bytes[0] % ALPHA.length],
    ALPHA[bytes[1] % ALPHA.length],
    NUM[bytes[2] % NUM.length],
  ];
  for (let i = 3; i < 7; i++) chars.push(ALL[bytes[i] % ALL.length]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const GENERIC = {
  success: true,
  message: "Se o e-mail estiver cadastrado, você receberá um código de recuperação.",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { email } = await req.json();
    if (!email || typeof email !== "string") return json(GENERIC);
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) return json(GENERIC);

    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = usersList?.users?.find((u) => (u.email || "").toLowerCase() === normalizedEmail);
    if (!authUser) return json(GENERIC);

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("status").eq("id", authUser.id).maybeSingle();
    // Only active accounts may reset. Never reveal the reason.
    if (!profile || profile.status !== "ativo") return json(GENERIC);

    // Invalidate previous unused reset codes
    await supabaseAdmin.from("activation_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("email", normalizedEmail).eq("purpose", "password_reset").is("used_at", null);

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertError } = await supabaseAdmin.from("activation_codes")
      .insert({ email: normalizedEmail, code, expires_at: expiresAt, purpose: "password_reset" });
    if (insertError) return json(GENERIC);

    let sent = false;
    try {
      const { error: sendError } = await supabaseAdmin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "password-reset-code",
          recipientEmail: normalizedEmail,
          idempotencyKey: `reset-${normalizedEmail}-${Date.now()}`,
          templateData: { code, minutes: 10 },
        },
      });
      if (!sendError) sent = true;
    } catch (_) { /* email infra not configured yet */ }

    return json({ ...GENERIC, sent, dev_code: sent ? undefined : code, expires_in_minutes: 10 });
  } catch (_error) {
    return json(GENERIC);
  }
});
