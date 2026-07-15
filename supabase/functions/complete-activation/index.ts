import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { email, code, password } = await req.json();
    if (!email || !code || !password) return new Response(JSON.stringify({ error: "Dados incompletos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const normalizedEmail = String(email).trim().toLowerCase();

    const pwError = validatePassword(password);
    if (pwError) return new Response(JSON.stringify({ error: pwError }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Validate + consume the code atomically-ish
    const { data: row } = await supabaseAdmin.from("activation_codes")
      .select("id, expires_at, used_at")
      .eq("email", normalizedEmail)
      .eq("code", String(code).trim())
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return new Response(JSON.stringify({ error: "Código inválido." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Código expirado. Solicite um novo código." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = usersList?.users?.find((u) => (u.email || "").toLowerCase() === normalizedEmail);
    if (!authUser) return new Response(JSON.stringify({ error: "Conta não encontrada." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: profile } = await supabaseAdmin.from("profiles").select("status").eq("id", authUser.id).single();
    if (!profile || profile.status === "bloqueado") return new Response(JSON.stringify({ error: "Conta indisponível." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (profile.status === "ativo") return new Response(JSON.stringify({ error: "Esta conta já foi ativada." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password });
    if (updateErr) return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await supabaseAdmin.from("profiles").update({ status: "ativo", activated_at: new Date().toISOString() }).eq("id", authUser.id);
    await supabaseAdmin.from("activation_codes").update({ used_at: new Date().toISOString() }).eq("id", row.id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});