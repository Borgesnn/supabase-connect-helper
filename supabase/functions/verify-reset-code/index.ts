import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;

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
    const { email, code } = await req.json();
    if (!email || !code) return json({ error: "invalid", message: "Código inválido." }, 400);
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedCode = String(code).trim().toUpperCase();
    if (!/^[A-Z0-9]{7,10}$/.test(normalizedCode)) {
      return json({ error: "invalid", message: "Código inválido." }, 400);
    }

    const { data: latest } = await supabaseAdmin.from("activation_codes")
      .select("id, code, expires_at, attempts")
      .eq("email", normalizedEmail)
      .eq("purpose", "password_reset")
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest) return json({ error: "invalid", message: "Código inválido." }, 400);

    if ((latest.attempts ?? 0) >= MAX_ATTEMPTS) {
      await supabaseAdmin.from("activation_codes")
        .update({ used_at: new Date().toISOString() }).eq("id", latest.id);
      return json({ error: "too_many_attempts", message: "Muitas tentativas. Solicite um novo código." }, 429);
    }

    if (new Date(latest.expires_at).getTime() < Date.now()) {
      return json({ error: "expired", message: "Código expirado. Solicite um novo código." }, 400);
    }

    if (String(latest.code).toUpperCase() !== normalizedCode) {
      await supabaseAdmin.from("activation_codes")
        .update({ attempts: (latest.attempts ?? 0) + 1 }).eq("id", latest.id);
      return json({ error: "invalid", message: "Código inválido." }, 400);
    }

    return json({ success: true });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
