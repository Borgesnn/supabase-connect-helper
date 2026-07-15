import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Check, X, Eye, EyeOff } from 'lucide-react';
import cdmLogo from '@/assets/cdm-logo.png';

type Step = 'email' | 'code' | 'password';

function validatePw(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

export default function CadastreSe() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const pwChecks = validatePw(password);
  const pwAllOk = Object.values(pwChecks).every(Boolean);
  const pwMatches = password && password === confirmPassword;

  async function requestCode(isResend = false) {
    if (!email) return toast({ title: 'Informe o e-mail', variant: 'destructive' });
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-activation-code', { body: { email: email.trim().toLowerCase() } });
      if (error) {
        const ctx = (error as any).context;
        const body = ctx ? await ctx.text() : error.message;
        let msg = 'Erro ao solicitar código';
        try { msg = JSON.parse(body).message || JSON.parse(body).error || msg; } catch {}
        toast({ title: msg, variant: 'destructive' });
        return;
      }
      if (data?.dev_code) {
        toast({ title: 'Código gerado (modo dev)', description: `Domínio de e-mail não configurado. Código: ${data.dev_code}`, duration: 15000 });
      } else {
        toast({ title: isResend ? 'Novo código enviado' : 'Código enviado', description: `Verifique seu e-mail (${email}).` });
      }
      setStep('code');
    } finally { setLoading(false); }
  }

  async function verifyCode() {
    if (!code) return toast({ title: 'Informe o código', variant: 'destructive' });
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-activation-code', { body: { email: email.trim().toLowerCase(), code: code.trim() } });
      if (error || !data?.success) {
        const ctx = (error as any)?.context;
        const body = ctx ? await ctx.text() : (error?.message || 'Código inválido');
        let msg = 'Código inválido';
        try { msg = JSON.parse(body).message || JSON.parse(body).error || msg; } catch { msg = body; }
        toast({ title: msg, variant: 'destructive' });
        return;
      }
      setStep('password');
    } finally { setLoading(false); }
  }

  async function completeActivation() {
    if (!pwAllOk) return toast({ title: 'A senha não atende aos requisitos', variant: 'destructive' });
    if (!pwMatches) return toast({ title: 'As senhas não conferem', variant: 'destructive' });
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('complete-activation', { body: { email: email.trim().toLowerCase(), code: code.trim(), password } });
      if (error || !data?.success) {
        const ctx = (error as any)?.context;
        const body = ctx ? await ctx.text() : (error?.message || 'Erro');
        let msg = 'Erro ao ativar conta';
        try { msg = JSON.parse(body).error || msg; } catch { msg = body; }
        toast({ title: msg, variant: 'destructive' });
        return;
      }
      toast({ title: 'Conta ativada!', description: 'Você já pode fazer login com sua senha.' });
      navigate('/auth');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-primary p-4">
      <Card className="w-full max-w-md animate-fade-in shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center shadow-lg overflow-hidden p-3">
            <img src={cdmLogo} alt="CDM" className="w-full h-full object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Cadastre-se</CardTitle>
            <CardDescription>
              {step === 'email' && 'Informe seu e-mail autorizado pelo administrador'}
              {step === 'code' && 'Digite o código de verificação enviado ao seu e-mail'}
              {step === 'password' && 'Crie sua senha para ativar a conta'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'email' && (
            <>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button className="w-full gradient-primary" onClick={() => requestCode(false)} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Enviar código
              </Button>
            </>
          )}

          {step === 'code' && (
            <>
              <div className="space-y-2">
                <Label>Código de verificação</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex: A7X9Q2B" maxLength={10} className="tracking-widest text-center font-mono text-lg" />
                <p className="text-xs text-muted-foreground">Válido por 10 minutos. Enviado para {email}.</p>
              </div>
              <Button className="w-full gradient-primary" onClick={verifyCode} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirmar código
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => requestCode(true)} disabled={loading}>
                Reenviar código
              </Button>
            </>
          )}

          {step === 'password' && (
            <>
              <div className="space-y-2">
                <Label>Nova senha</Label>
                <div className="relative">
                  <Input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirmar senha</Label>
                <Input type={showPw ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <ul className="text-xs space-y-1">
                {[
                  ['length', 'Mínimo 8 caracteres'],
                  ['upper', 'Uma letra maiúscula'],
                  ['lower', 'Uma letra minúscula'],
                  ['number', 'Um número'],
                  ['special', 'Um caractere especial'],
                ].map(([k, label]) => {
                  const ok = (pwChecks as any)[k];
                  return (
                    <li key={k as string} className={`flex items-center gap-2 ${ok ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {label}
                    </li>
                  );
                })}
                {confirmPassword && (
                  <li className={`flex items-center gap-2 ${pwMatches ? 'text-green-600' : 'text-destructive'}`}>
                    {pwMatches ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    Senhas coincidem
                  </li>
                )}
              </ul>
              <Button className="w-full gradient-primary" onClick={completeActivation} disabled={loading || !pwAllOk || !pwMatches}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Ativar conta
              </Button>
            </>
          )}

          <Link to="/auth" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground pt-2">
            <ArrowLeft className="w-3 h-3" /> Voltar para login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}