import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Package, Building2, Save, Trophy, Table2 } from 'lucide-react';
import { FornecedorAutocomplete, FornecedorOption } from '@/components/FornecedorAutocomplete';

export interface ItemRow {
  id: string;
  nome: string;
  descricao: string;
  quantidade: string;
  unidade: string;
  observacoes: string;
  ordem: number;
  _new?: boolean;
}

export interface FornRow {
  id: string;
  fornecedor_id: string | null;
  fornecedor_nome: string;
  frete: number;
  instalacao: number;
  outros_custos: number;
  desconto: number;
  prazo_dias: string;
  observacoes: string;
  ordem: number;
  _new?: boolean;
}

export const fmtBRL = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Input monetário: digita apenas dígitos, exibe R$ formatado, começa em 0,00 */
function MoneyInput({
  value,
  onChange,
  disabled,
  className,
}: { value: number; onChange: (v: number) => void; disabled?: boolean; className?: string }) {
  const display = (Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">R$</span>
      <Input
        inputMode="numeric"
        disabled={disabled}
        className={`pl-8 text-right ${className ?? ''}`}
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          onChange(digits ? parseInt(digits, 10) / 100 : 0);
        }}
      />
    </div>
  );
}

const uid = () => `new-${crypto.randomUUID()}`;
const num = (v: string) => {
  const n = parseFloat((v || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

interface Props {
  cotacaoId: string;
  canManage: boolean;
  fornecedores: FornecedorOption[];
  onNovoFornecedor?: () => void;
  onAprovado?: () => void;
}

export function CotacaoComparativo({ cotacaoId, canManage, fornecedores, onNovoFornecedor, onAprovado }: Props) {
  const [itens, setItens] = useState<ItemRow[]>([]);
  const [forns, setForns] = useState<FornRow[]>([]);
  const [precos, setPrecos] = useState<Record<string, number>>({}); // `${fornRowId}|${itemRowId}` -> valor
  const [removedItens, setRemovedItens] = useState<string[]>([]);
  const [removedForns, setRemovedForns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [iRes, fRes] = await Promise.all([
      supabase.from('cotacao_itens').select('*').eq('cotacao_id', cotacaoId).order('ordem'),
      supabase.from('cotacao_fornecedores').select('*').eq('cotacao_id', cotacaoId).order('ordem'),
    ]);
    const itemRows: ItemRow[] = (iRes.data ?? []).map((i: any) => ({
      id: i.id,
      nome: i.nome ?? '',
      descricao: i.descricao ?? '',
      quantidade: String(i.quantidade ?? 1),
      unidade: i.unidade ?? 'un',
      observacoes: i.observacoes ?? '',
      ordem: i.ordem ?? 0,
    }));
    const fornRows: FornRow[] = (fRes.data ?? []).map((f: any) => ({
      id: f.id,
      fornecedor_id: f.fornecedor_id,
      fornecedor_nome: f.fornecedor_nome ?? '',
      frete: Number(f.frete ?? 0),
      instalacao: Number(f.instalacao ?? 0),
      outros_custos: Number(f.outros_custos ?? 0),
      desconto: Number(f.desconto ?? 0),
      prazo_dias: f.prazo_dias != null ? String(f.prazo_dias) : '',
      observacoes: f.observacoes ?? '',
      ordem: f.ordem ?? 0,
    }));
    const map: Record<string, number> = {};
    if (fornRows.length) {
      const { data: pData } = await supabase
        .from('cotacao_precos')
        .select('*')
        .in('cotacao_fornecedor_id', fornRows.map((f) => f.id));
      (pData ?? []).forEach((p: any) => {
        map[`${p.cotacao_fornecedor_id}|${p.item_id}`] = Number(p.valor_unitario ?? 0);
      });
    }
    setItens(itemRows);
    setForns(fornRows);
    setPrecos(map);
    setRemovedItens([]);
    setRemovedForns([]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [cotacaoId]);

  const addItem = () =>
    setItens((prev) => [
      ...prev,
      { id: uid(), nome: '', descricao: '', quantidade: '1', unidade: 'un', observacoes: '', ordem: prev.length, _new: true },
    ]);

  const removeItem = (id: string) => {
    if (!id.startsWith('new-')) setRemovedItens((p) => [...p, id]);
    setItens((prev) => prev.filter((i) => i.id !== id));
  };

  const addForn = () =>
    setForns((prev) => [
      ...prev,
      {
        id: uid(), fornecedor_id: null, fornecedor_nome: '', frete: 0, instalacao: 0,
        outros_custos: 0, desconto: 0, prazo_dias: '', observacoes: '', ordem: prev.length, _new: true,
      },
    ]);

  const removeForn = (id: string) => {
    if (!id.startsWith('new-')) setRemovedForns((p) => [...p, id]);
    setForns((prev) => prev.filter((f) => f.id !== id));
  };

  const setPreco = (fid: string, iid: string, v: number) =>
    setPrecos((p) => ({ ...p, [`${fid}|${iid}`]: v }));

  const totals = useMemo(() => {
    const res: Record<string, { subtotal: number; total: number }> = {};
    forns.forEach((f) => {
      const subtotal = itens.reduce(
        (acc, i) => acc + num(i.quantidade) * (precos[`${f.id}|${i.id}`] ?? 0),
        0,
      );
      res[f.id] = {
        subtotal,
        total: subtotal + f.frete + f.instalacao + f.outros_custos - f.desconto,
      };
    });
    return res;
  }, [forns, itens, precos]);

  /** Menor preço unitário por item (apenas valores > 0) */
  const menorPorItem = useMemo(() => {
    const res: Record<string, number> = {};
    itens.forEach((i) => {
      const vals = forns
        .map((f) => precos[`${f.id}|${i.id}`] ?? 0)
        .filter((v) => v > 0);
      if (vals.length) res[i.id] = Math.min(...vals);
    });
    return res;
  }, [itens, forns, precos]);

  /** Ranking por VALOR TOTAL (menor primeiro), só propostas com algum valor */
  const ranking = useMemo(() => {
    return forns
      .filter((f) => (totals[f.id]?.total ?? 0) > 0 && f.fornecedor_nome.trim())
      .map((f) => ({ id: f.id, nome: f.fornecedor_nome, total: totals[f.id]!.total }))
      .sort((a, b) => a.total - b.total);
  }, [forns, totals]);

  const economia = ranking.length >= 2 ? ranking[1].total - ranking[0].total : null;

  /* ---------- Aprovação / escolha do fornecedor ---------- */
  const [aprovFornId, setAprovFornId] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [aprov, setAprov] = useState<any>(null);
  const [aprovando, setAprovando] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await (supabase.from('cotacoes') as any)
        .select('fornecedor_escolhido_id,fornecedor_escolhido_nome,valor_escolhido,ranking_escolhido,diferenca_primeiro,justificativa_escolha,data_escolha')
        .eq('id', cotacaoId).maybeSingle();
      if (cancel || !data) return;
      setAprov(data.fornecedor_escolhido_nome ? data : null);
      setJustificativa(data.justificativa_escolha ?? '');
    })();
    return () => { cancel = true; };
  }, [cotacaoId]);

  const escolhaPos = ranking.findIndex((r) => r.id === aprovFornId);
  const escolha = escolhaPos >= 0 ? ranking[escolhaPos] : null;

  const handleAprovar = async () => {
    if (!escolha) { toast.error('Selecione o fornecedor escolhido'); return; }
    if (escolhaPos > 0 && justificativa.trim().length < 20) {
      toast.error('Ao não escolher o 1º colocado, a justificativa é obrigatória (mínimo 20 caracteres)');
      return;
    }
    const forn = forns.find((f) => f.id === escolha.id);
    setAprovando(true);
    const payload = {
      fornecedor_escolhido_id: forn?.fornecedor_id ?? null,
      fornecedor_escolhido_nome: escolha.nome,
      valor_escolhido: escolha.total,
      ranking_escolhido: escolhaPos + 1,
      diferenca_primeiro: escolha.total - ranking[0].total,
      justificativa_escolha: justificativa.trim() || null,
      data_escolha: new Date().toISOString(),
      status: 'aprovada',
    };
    const { error } = await (supabase.from('cotacoes') as any).update(payload).eq('id', cotacaoId);
    setAprovando(false);
    if (error) { toast.error('Erro ao registrar a escolha'); return; }
    setAprov(payload);
    toast.success('Fornecedor escolhido registrado e cotação aprovada');
    onAprovado?.();
  };

  const handleSave = async () => {
    if (itens.some((i) => !i.nome.trim())) { toast.error('Informe o nome de todos os itens'); return; }
    if (forns.some((f) => !f.fornecedor_nome.trim())) { toast.error('Selecione o fornecedor em todas as propostas'); return; }
    const ids = forns.map((f) => f.fornecedor_id).filter(Boolean) as string[];
    if (new Set(ids).size !== ids.length) {
      toast.error('Cada proposta deve ser de um fornecedor diferente');
      return;
    }
    setSaving(true);
    try {
      if (removedItens.length) await supabase.from('cotacao_itens').delete().in('id', removedItens);
      if (removedForns.length) await supabase.from('cotacao_fornecedores').delete().in('id', removedForns);

      const itemIdMap: Record<string, string> = {};
      for (const [idx, i] of itens.entries()) {
        const payload = {
          cotacao_id: cotacaoId,
          nome: i.nome.trim(),
          descricao: i.descricao || null,
          quantidade: num(i.quantidade) || 1,
          unidade: i.unidade || 'un',
          observacoes: i.observacoes || null,
          ordem: idx,
        };
        if (i.id.startsWith('new-')) {
          const { data, error } = await supabase.from('cotacao_itens').insert(payload).select('id').single();
          if (error) throw error;
          itemIdMap[i.id] = data!.id;
        } else {
          const { error } = await supabase.from('cotacao_itens').update(payload).eq('id', i.id);
          if (error) throw error;
          itemIdMap[i.id] = i.id;
        }
      }

      const fornIdMap: Record<string, string> = {};
      for (const [idx, f] of forns.entries()) {
        const payload = {
          cotacao_id: cotacaoId,
          fornecedor_id: f.fornecedor_id,
          fornecedor_nome: f.fornecedor_nome.trim(),
          frete: f.frete, instalacao: f.instalacao,
          outros_custos: f.outros_custos, desconto: f.desconto,
          prazo_dias: f.prazo_dias ? parseInt(f.prazo_dias, 10) : null,
          observacoes: f.observacoes || null,
          ordem: idx,
        };
        if (f.id.startsWith('new-')) {
          const { data, error } = await supabase.from('cotacao_fornecedores').insert(payload).select('id').single();
          if (error) throw error;
          fornIdMap[f.id] = data!.id;
        } else {
          const { error } = await supabase.from('cotacao_fornecedores').update(payload).eq('id', f.id);
          if (error) throw error;
          fornIdMap[f.id] = f.id;
        }
      }

      const rows = forns.flatMap((f) =>
        itens.map((i) => ({
          cotacao_fornecedor_id: fornIdMap[f.id],
          item_id: itemIdMap[i.id],
          valor_unitario: precos[`${f.id}|${i.id}`] ?? 0,
        })),
      );
      if (rows.length) {
        const { error } = await supabase
          .from('cotacao_precos')
          .upsert(rows, { onConflict: 'cotacao_fornecedor_id,item_id' });
        if (error) throw error;
      }

      toast.success('Comparativo salvo');
      await load();
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar comparativo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando comparativo...</p>;

  const meta = Math.max(3, forns.length);

  return (
    <div className="space-y-6">
      {/* ITENS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Package className="w-4 h-4" /> Itens da cotação ({itens.length})
          </h3>
          {canManage && (
            <Button size="sm" variant="outline" onClick={addItem}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar item
            </Button>
          )}
        </div>
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-md">
            Nenhum item adicionado
          </p>
        ) : (
          <div className="space-y-3">
            {itens.map((i, idx) => (
              <div key={i.id} className="p-3 border border-border rounded-lg bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Item {idx + 1}</Badge>
                  {canManage && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeItem(i.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs">Nome *</Label>
                    <Input disabled={!canManage} value={i.nome}
                      onChange={(e) => setItens((p) => p.map((x) => x.id === i.id ? { ...x, nome: e.target.value } : x))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantidade</Label>
                    <Input disabled={!canManage} inputMode="decimal" value={i.quantidade}
                      onChange={(e) => setItens((p) => p.map((x) => x.id === i.id ? { ...x, quantidade: e.target.value.replace(/[^\d.,]/g, '') } : x))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unidade</Label>
                    <Input disabled={!canManage} value={i.unidade} placeholder="un, cx, m²"
                      onChange={(e) => setItens((p) => p.map((x) => x.id === i.id ? { ...x, unidade: e.target.value } : x))} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs">Descrição</Label>
                    <Input disabled={!canManage} value={i.descricao}
                      onChange={(e) => setItens((p) => p.map((x) => x.id === i.id ? { ...x, descricao: e.target.value } : x))} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs">Observações</Label>
                    <Input disabled={!canManage} value={i.observacoes}
                      onChange={(e) => setItens((p) => p.map((x) => x.id === i.id ? { ...x, observacoes: e.target.value } : x))} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FORNECEDORES */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Fornecedores
            <Badge variant="outline" className={forns.length >= 3
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}>
              {forns.length}/{meta}
            </Badge>
          </h3>
          {canManage && (
            <div className="flex gap-2">
              {onNovoFornecedor && (
                <Button size="sm" variant="outline" onClick={onNovoFornecedor}>+ Cadastrar</Button>
              )}
              <Button size="sm" variant="outline" onClick={addForn}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar fornecedor
              </Button>
            </div>
          )}
        </div>
        {forns.length < 3 && (
          <p className="text-xs text-amber-600">
            Recomendado no mínimo 3 fornecedores para comparação. Faltam {3 - forns.length}.
          </p>
        )}

        {forns.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-md">
            Nenhum fornecedor adicionado
          </p>
        ) : (
          <div className="space-y-4">
            {forns.map((f, idx) => {
              const t = totals[f.id] ?? { subtotal: 0, total: 0 };
              return (
                <div key={f.id} className="border border-border rounded-lg bg-card overflow-hidden">
                  <div className="p-3 bg-muted/40 flex items-end gap-3 flex-wrap">
                    <div className="flex-1 min-w-[220px] space-y-1.5">
                      <Label className="text-xs">Fornecedor {idx + 1} *</Label>
                      <FornecedorAutocomplete
                        fornecedores={fornecedores}
                        mode="select"
                        disabled={!canManage}
                        value={f.fornecedor_id ?? ''}
                        onSelect={(fo) => setForns((p) => p.map((x) => x.id === f.id
                          ? { ...x, fornecedor_id: fo.id, fornecedor_nome: fo.nome } : x))}
                        onClear={() => setForns((p) => p.map((x) => x.id === f.id
                          ? { ...x, fornecedor_id: null, fornecedor_nome: '' } : x))}
                      />
                    </div>
                    <div className="w-32 space-y-1.5">
                      <Label className="text-xs">Prazo (dias)</Label>
                      <Input disabled={!canManage} inputMode="numeric" value={f.prazo_dias}
                        onChange={(e) => setForns((p) => p.map((x) => x.id === f.id ? { ...x, prazo_dias: e.target.value.replace(/\D/g, '') } : x))} />
                    </div>
                    {canManage && (
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => removeForn(f.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="p-3 space-y-3">
                    {itens.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Adicione itens para informar os valores.</p>
                    ) : (
                      <div className="space-y-2">
                        {itens.map((i) => {
                          const unit = precos[`${f.id}|${i.id}`] ?? 0;
                          const qtd = num(i.quantidade);
                          const isMenor = unit > 0 && menorPorItem[i.id] === unit;
                          return (
                            <div key={i.id} className={`grid grid-cols-12 items-center gap-2 rounded-md px-1 py-1 ${isMenor ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30' : ''}`}>
                              <div className="col-span-12 sm:col-span-5 text-sm truncate flex items-center gap-2">
                                <span className="truncate">{i.nome || <span className="text-muted-foreground">Item sem nome</span>}</span>
                                <span className="text-xs text-muted-foreground">{qtd} {i.unidade}</span>
                                {isMenor && (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                    menor preço
                                  </Badge>
                                )}
                              </div>
                              <div className="col-span-7 sm:col-span-4">
                                <MoneyInput disabled={!canManage} value={unit} onChange={(v) => setPreco(f.id, i.id, v)} />
                              </div>
                              <div className={`col-span-5 sm:col-span-3 text-sm text-right font-medium ${isMenor ? 'text-emerald-600' : ''}`}>
                                {fmtBRL(qtd * unit)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Frete</Label>
                        <MoneyInput disabled={!canManage} value={f.frete}
                          onChange={(v) => setForns((p) => p.map((x) => x.id === f.id ? { ...x, frete: v } : x))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Instalação</Label>
                        <MoneyInput disabled={!canManage} value={f.instalacao}
                          onChange={(v) => setForns((p) => p.map((x) => x.id === f.id ? { ...x, instalacao: v } : x))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Outros custos</Label>
                        <MoneyInput disabled={!canManage} value={f.outros_custos}
                          onChange={(v) => setForns((p) => p.map((x) => x.id === f.id ? { ...x, outros_custos: v } : x))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Desconto</Label>
                        <MoneyInput disabled={!canManage} value={f.desconto}
                          onChange={(v) => setForns((p) => p.map((x) => x.id === f.id ? { ...x, desconto: v } : x))} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Observações do fornecedor</Label>
                      <Textarea rows={2} disabled={!canManage} value={f.observacoes}
                        onChange={(e) => setForns((p) => p.map((x) => x.id === f.id ? { ...x, observacoes: e.target.value } : x))} />
                    </div>

                    <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal dos produtos</span><span>{fmtBRL(t.subtotal)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{fmtBRL(f.frete)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Instalação</span><span>{fmtBRL(f.instalacao)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Outros custos</span><span>{fmtBRL(f.outros_custos)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Desconto</span><span>- {fmtBRL(f.desconto)}</span></div>
                      <div className="flex justify-between pt-2 border-t border-border font-semibold text-base">
                        <span>Valor total</span><span>{fmtBRL(t.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* TABELA COMPARATIVA */}
      {itens.length > 0 && forns.length >= 2 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Table2 className="w-4 h-4" /> Tabela comparativa
          </h3>
          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left p-3 font-semibold sticky left-0 bg-muted/50 min-w-[160px]">Item</th>
                    {forns.map((f) => {
                      const pos = ranking.findIndex((r) => r.id === f.id);
                      const first = pos === 0;
                      return (
                        <th key={f.id} className={`text-right p-3 font-semibold min-w-[130px] ${first ? 'bg-emerald-500/10 text-emerald-700' : ''}`}>
                          <span className="block truncate">{f.fornecedor_nome || `Fornecedor ${f.ordem + 1}`}</span>
                          {pos >= 0 && (
                            <span className={`text-[10px] font-normal ${first ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                              {pos + 1}º colocado
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {itens.map((i) => (
                    <tr key={i.id}>
                      <td className="p-3 sticky left-0 bg-card">
                        <span className="font-medium">{i.nome || 'Item sem nome'}</span>
                        <span className="block text-xs text-muted-foreground">{num(i.quantidade)} {i.unidade}</span>
                      </td>
                      {forns.map((f) => {
                        const unit = precos[`${f.id}|${i.id}`] ?? 0;
                        const isMenor = unit > 0 && menorPorItem[i.id] === unit;
                        return (
                          <td key={f.id} className={`p-3 text-right ${isMenor ? 'bg-emerald-500/10' : ''}`}>
                            <span className={`font-medium ${isMenor ? 'text-emerald-600' : ''}`}>{fmtBRL(unit)}</span>
                            {isMenor && <span className="block text-[10px] text-emerald-600 font-medium">menor preço</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {(() => {
                    const sumRow = (label: string, get: (f: FornRow) => number, opts?: { strong?: boolean; negate?: boolean; highlightMin?: boolean }) => {
                      const vals = forns.map(get);
                      const min = opts?.highlightMin ? Math.min(...vals.filter((v) => v > 0)) : null;
                      return (
                        <tr key={label} className="bg-muted/20">
                          <td className="p-3 font-medium sticky left-0 bg-muted/20">{label}</td>
                          {forns.map((f, idx) => {
                            const v = vals[idx];
                            const isMin = min != null && v === min && v > 0;
                            return (
                              <td key={f.id} className={`p-3 text-right ${opts?.strong ? 'font-semibold' : ''} ${isMin ? 'text-emerald-600' : ''}`}>
                                {opts?.negate && v > 0 ? `- ${fmtBRL(v)}` : fmtBRL(v)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    };
                    return (
                      <>
                        {sumRow('Produtos', (f) => totals[f.id]?.subtotal ?? 0, { strong: true, highlightMin: true })}
                        {sumRow('Frete', (f) => f.frete)}
                        {sumRow('Instalação', (f) => f.instalacao)}
                        {sumRow('Outros custos', (f) => f.outros_custos)}
                        {sumRow('Desconto', (f) => f.desconto, { negate: true })}
                      </>
                    );
                  })()}
                  <tr className="border-t-2 border-border">
                    <td className="p-3 font-bold sticky left-0 bg-card">TOTAL</td>
                    {forns.map((f) => {
                      const t = totals[f.id]?.total ?? 0;
                      const pos = ranking.findIndex((r) => r.id === f.id);
                      const first = pos === 0;
                      return (
                        <td key={f.id} className={`p-3 text-right font-bold ${first ? 'bg-emerald-500/10 text-emerald-700' : ''}`}>
                          {fmtBRL(t)}
                          {!first && pos > 0 && ranking.length > 0 && t > 0 && (
                            <span className="block text-[10px] font-normal text-muted-foreground">
                              + {fmtBRL(t - ranking[0].total)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {ranking.length >= 2 && (
                    <tr className="bg-muted/30">
                      <td className="p-3 font-semibold uppercase text-xs tracking-wide sticky left-0 bg-muted/30">Ranking</td>
                      {forns.map((f) => {
                        const pos = ranking.findIndex((r) => r.id === f.id);
                        const first = pos === 0;
                        return (
                          <td key={f.id} className="p-3 text-right">
                            {pos >= 0 ? (
                              <Badge variant={first ? 'default' : 'secondary'} className={first ? '' : ''}>{pos + 1}º</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O menor preço de cada item está em verde, mas o vencedor é definido pelo menor valor total da proposta.
          </p>
        </section>
      )}

      {/* RANKING */}
      {ranking.length >= 2 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Ranking de propostas
          </h3>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Melhor proposta</p>
            <p className="text-lg font-bold mt-1">1º {ranking[0].nome}</p>
            <p className="text-2xl font-bold text-emerald-600">{fmtBRL(ranking[0].total)}</p>
            {economia != null && (
              <p className="text-sm text-muted-foreground mt-2">
                Economia em relação ao 2º colocado:{' '}
                <span className="font-semibold text-emerald-600">{fmtBRL(economia)}</span>
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
            {ranking.map((r, idx) => (
              <div key={r.id} className={`flex items-center justify-between gap-3 p-3 ${idx === 0 ? 'bg-emerald-500/5' : ''}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant={idx === 0 ? 'default' : 'secondary'}>{idx + 1}º</Badge>
                  <span className="text-sm font-medium truncate">{r.nome}</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold ${idx === 0 ? 'text-emerald-600' : ''}`}>{fmtBRL(r.total)}</span>
                  {idx > 0 && (
                    <span className="block text-xs text-muted-foreground">
                      + {fmtBRL(r.total - ranking[0].total)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {ranking.length < 3 && (
            <p className="text-xs text-amber-600">
              Ranking parcial: preencha os valores de pelo menos 3 fornecedores para a comparação completa.
            </p>
          )}
        </section>
      )}

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar comparativo'}
          </Button>
        </div>
      )}
    </div>
  );
}
