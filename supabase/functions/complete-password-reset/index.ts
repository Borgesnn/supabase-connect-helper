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

function validatePassword(pw: string): string | null {
  if (typeof pw !== "string" || pw.length < 8) return "A senha deve ter no mínimo 8 caracteres";
  if (!/[A-Z]/.test(pw)) return "A senha deve conter uma letra maiúscula";
  if (!/[a-z]/.test(pw)) return "A senha deve conter uma letra minúscula";
  if (!/[0-9]/.test(pw)) return "A senha deve conter um número";
  if (!/[^A-Za-z0-9]/.test(pw)) return "A senha deve conter um caractere especial";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { email, code, password } = await req.json();
    if (!email || !code || !password) return json({ error: "Dados incompletos" }, 400);

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedCode = String(code).trim().toUpperCase();
    if (!/^[A-Z0-9]{7,10}$/.test(normalizedCode)) return json({ error: "Código inválido." }, 400);

    const pwError = validatePassword(password);
    if (pwError) return json({ error: pwError }, 400);

    const { data: latest } = await supabaseAdmin.from("activation_codes")
      .select("id, code, expires_at, attempts")
      .eq("email", normalizedEmail)
      .eq("purpose", "password_reset")
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest) return json({ error: "Código inválido." }, 400);
    if ((latest.attempts ?? 0) >= MAX_ATTEMPTS) {
      await supabaseAdmin.from("activation_codes")
        .update({ used_at: new Date().toISOString() }).eq("id", latest.id);
      return json({ error: "Muitas tentativas. Solicite um novo código." }, 429);
    }
    if (new Date(latest.expires_at).getTime() < Date.now()) {
      return json({ error: "Código expirado. Solicite um novo código." }, 400);
    }
    if (String(latest.code).toUpperCase() !== normalizedCode) {
      await supabaseAdmin.from("activation_codes")
        .update({ attempts: (latest.attempts ?? 0) + 1 }).eq("id", latest.id);
      return json({ error: "Código inválido." }, 400);
    }

    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = usersList?.users?.find((u) => (u.email || "").toLowerCase() === normalizedEmail);
    if (!authUser) return json({ error: "Não foi possível alterar a senha." }, 400);

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("status").eq("id", authUser.id).maybeSingle();
    if (!profile || profile.status !== "ativo") return json({ error: "Conta indisponível." }, 403);

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password });
    if (updateErr) return json({ error: updateErr.message }, 500);

    // Consume this code and invalidate every other pending recovery code for the account
    await supabaseAdmin.from("activation_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("email", normalizedEmail)
      .eq("purpose", "password_reset")
      .is("used_at", null);

    return json({ success: true });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
