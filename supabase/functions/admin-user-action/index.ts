import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// action: "block" | "unblock" | "deactivate" | "reactivate"
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roleData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id).single();
    if (roleData?.role !== "admin") return new Response(JSON.stringify({ error: "Apenas administradores" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { user_id, action } = await req.json();
    if (!user_id || !action) return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (user_id === caller.id) return new Response(JSON.stringify({ error: "Você não pode alterar seu próprio status" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let newStatus: string;
    switch (action) {
      case "block": newStatus = "bloqueado"; break;
      case "unblock": newStatus = "ativo"; break;
      case "deactivate": newStatus = "aguardando_ativacao"; break;
      case "reactivate": newStatus = "ativo"; break;
      default: return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const patch: Record<string, unknown> = { status: newStatus };
    if (newStatus === "aguardando_ativacao") patch.activated_at = null;
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", user_id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ success: true, status: newStatus }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});