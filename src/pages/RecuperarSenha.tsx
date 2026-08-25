import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Check, X, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import cdmLogo from '@/assets/cdm-logo.png';

type Step = 'email' | 'code' | 'password' | 'done';

function validatePw(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

async function parseError(error: unknown, fallback: string) {
  const ctx = (error as any)?.context;
  let msg = fallback;
  try {
    const body = ctx ? await ctx.text() : (error as any)?.message;
    if (body) {
      try {
        const parsed = JSON.parse(body);
        msg = parsed.message || parsed.error || fallback;
      } catch {
        msg = body;
      }
    }
  } catch { /* keep fallback */ }
  return msg;
}

export default function RecuperarSenha() {
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
  const pwMatches = !!password && password === confirmPassword;

  async function requestCode(isResend = false) {
    if (!email.trim()) return toast({ title: 'Informe o e-mail', variant: 'destructive' });
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-password-reset', {
        body: { email: email.trim().toLowerCase() },
      });
      if (error) {
        toast({ title: await parseError(error, 'Erro ao solicitar código'), variant: 'destructive' });
        return;
      }
      if (data?.dev_code) {
        toast({
          title: 'Código gerado (modo dev)',
          description: `Domínio de e-mail não configurado. Código: ${data.dev_code}`,
          duration: 15000,
        });
      } else {
        toast({
          title: isResend ? 'Novo código enviado' : 'Código enviado',
          description: 'Se o e-mail estiver cadastrado, você receberá um código de recuperação.',
        });
      }
      setCode('');
      setStep('code');
    } finally { setLoading(false); }
  }

  async function verifyCode() {
    if (!code.trim()) return toast({ title: 'Informe o código', variant: 'destructive' });
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-reset-code', {
        body: { email: email.trim().toLowerCase(), code: code.trim() },
      });
      if (error || !data?.success) {
        toast({ title: await parseError(error, 'Código inválido'), variant: 'destructive' });
        return;
      }
      setStep('password');
    } finally { setLoading(false); }
  }

  async function completeReset() {
    if (!pwAllOk) return toast({ title: 'A senha não atende aos requisitos', variant: 'destructive' });
    if (!pwMatches) return toast({ title: 'As senhas não conferem', variant: 'destructive' });
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('complete-password-reset', {
        body: { email: email.trim().toLowerCase(), code: code.trim(), password },
      });
      if (error || !data?.success) {
        toast({ title: await parseError(error, 'Erro ao alterar a senha'), variant: 'destructive' });
        return;
      }
      await supabase.auth.signOut();
      setPassword('');
      setConfirmPassword('');
      setCode('');
      setStep('done');
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
            <CardTitle className="text-2xl font-bold">
              {step === 'done' ? 'Senha alterada com sucesso!' : 'Recuperar senha'}
            </CardTitle>
            <CardDescription>
              {step === 'email' && 'Informe o e-mail cadastrado no CDM para receber um código de verificação.'}
              {step === 'code' && 'Digite o código de verificação enviado ao seu e-mail.'}
              {step === 'password' && 'Crie sua nova senha de acesso.'}
              {step === 'done' && 'Agora você pode acessar o CDM utilizando sua nova senha.'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'email' && (
            <>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
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
                <Label>Código de confirmação</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: A7X9Q2B"
                  maxLength={10}
                  className="tracking-widest text-center font-mono text-lg"
                />
                <p className="text-xs text-muted-foreground">Válido por 10 minutos.</p>
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
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirmar nova senha</Label>
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
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
              <Button
                className="w-full gradient-primary"
                onClick={completeReset}
                disabled={loading || !pwAllOk || !pwMatches}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Alterar senha
              </Button>
            </>
          )}

          {step === 'done' && (
            <>
              <div className="flex justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <Button className="w-full gradient-primary" onClick={() => navigate('/auth')}>
                Voltar para o Login
              </Button>
            </>
          )}

          {step !== 'done' && (
            <Link to="/auth" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground pt-2">
              <ArrowLeft className="w-3 h-3" /> Voltar para login
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
