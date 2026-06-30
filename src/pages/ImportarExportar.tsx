import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useAreas } from '@/hooks/useAreas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, Download, FileSpreadsheet, FileDown, Loader2,
  AlertCircle, CheckCircle2, FileUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ImportRow = Record<string, any>;
type RowError = { linha: number; codigo?: string; nome?: string; erros: string[] };
type ImportResult = {
  total: number;
  inseridos: number;
  atualizados: number;
  ignorados: number;
  erros: RowError[];
};

const SETORES_VALIDOS = ['Caminhões', 'Máquinas', 'Diretoria', 'Geral'];
const SUBSETORES_VALIDOS = ['Vendas', 'Pós-venda'];

function normalize(s: string) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function findKey(row: ImportRow, ...candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const target = normalize(cand);
    const k = keys.find((kk) => normalize(kk) === target);
    if (k) return k;
  }
  return undefined;
}

function getVal(row: ImportRow, ...candidates: string[]) {
  const k = findKey(row, ...candidates);
  if (!k) return undefined;
  const v = row[k];
  return v === '' || v === null || v === undefined ? undefined : v;
}

function parseDecimal(v: any): number | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseInt0(v: any): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(String(v).replace(/\D/g, ''), 10);
  return isNaN(n) ? null : n;
}

export default function ImportarExportar() {
  const { user } = useAuth();
  const { canManage, loading: roleLoading } = useUserRole();
  const { areas } = useAreas();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const [exporting, setExporting] = useState(false);

  // ============== TEMPLATE ==============
  const handleDownloadTemplate = () => {
    const headers = [
      'codigo', 'nome', 'categoria', 'setor', 'subsetor',
      'quantidade', 'estoque_minimo', 'valor_compra',
      'localizacao', 'fornecedor', 'descricao', 'imagem_url',
    ];
    const sample = [{
      codigo: 'BR001',
      nome: 'Caneta Personalizada',
      categoria: 'Escritório',
      setor: 'Geral',
      subsetor: '',
      quantidade: 100,
      estoque_minimo: 10,
      valor_compra: '2,50',
      localizacao: 'Estante A1',
      fornecedor: 'Fornecedor Exemplo',
      descricao: 'Caneta esferográfica azul',
      imagem_url: '',
    }];
    const ws = XLSX.utils.json_to_sheet(sample, { header: headers });
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Brindes');

    // Sheet de instruções
    const instr = [
      ['Campo', 'Obrigatório', 'Observações'],
      ['codigo', 'Sim', 'Identificador único do brinde. Usado para evitar duplicidade e atualizar.'],
      ['nome', 'Sim', 'Nome do brinde'],
      ['categoria', 'Não', 'Será criada se não existir'],
      ['setor', 'Não', `Um de: ${SETORES_VALIDOS.join(', ')} (padrão: Geral)`],
      ['subsetor', 'Não', `Apenas para Caminhões/Máquinas: ${SUBSETORES_VALIDOS.join(', ')}`],
      ['quantidade', 'Não', 'Inteiro >= 0 (padrão 0)'],
      ['estoque_minimo', 'Não', 'Inteiro >= 0 (padrão 0)'],
      ['valor_compra', 'Não', 'Decimal. Aceita vírgula ou ponto'],
      ['localizacao', 'Não', 'Texto livre'],
      ['fornecedor', 'Não', 'Texto livre'],
      ['descricao', 'Não', 'Texto livre'],
      ['imagem_url', 'Não', 'URL pública da imagem (opcional)'],
    ];
    const wsI = XLSX.utils.aoa_to_sheet(instr);
    wsI['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsI, 'Instruções');

    XLSX.writeFile(wb, 'modelo_importacao_brindes.xlsx');
  };

  // ============== IMPORT ==============
  const parseFile = async (f: File): Promise<ImportRow[]> => {
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: '' });
  };

  const handleImport = async () => {
    if (!file || !user) return;
    setImporting(true);
    setResult(null);

    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        toast({ title: 'Arquivo vazio', variant: 'destructive' });
        setImporting(false);
        return;
      }

      // Carrega referências
      const [{ data: catData }, { data: prodData }] = await Promise.all([
        supabase.from('categorias').select('id, nome'),
        supabase.from('produtos').select('id, codigo'),
      ]);
      const categoriasMap = new Map<string, string>(
        (catData || []).map((c: any) => [normalize(c.nome), c.id]),
      );
      const produtosMap = new Map<string, string>(
        (prodData || []).map((p: any) => [normalize(p.codigo), p.id]),
      );

      // Mapas de áreas
      const setoresMap = new Map<string, { id: string; nome: string }>();
      const subsetoresPorSetor = new Map<string, Map<string, string>>();
      areas.filter((a) => a.parent_id === null).forEach((s) => {
        setoresMap.set(normalize(s.nome), { id: s.id, nome: s.nome });
      });
      areas.filter((a) => a.parent_id !== null).forEach((sub) => {
        if (!subsetoresPorSetor.has(sub.parent_id!))
          subsetoresPorSetor.set(sub.parent_id!, new Map());
        subsetoresPorSetor.get(sub.parent_id!)!.set(normalize(sub.nome), sub.id);
      });

      const erros: RowError[] = [];
      let inseridos = 0;
      let atualizados = 0;
      let ignorados = 0;
      const codigosVistos = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const linha = i + 2; // header é a linha 1
        const rowErrs: string[] = [];

        const codigo = (getVal(row, 'codigo', 'código', 'code') ?? '').toString().trim();
        const nome = (getVal(row, 'nome', 'name', 'brinde') ?? '').toString().trim();

        if (!codigo) rowErrs.push('codigo é obrigatório');
        if (!nome) rowErrs.push('nome é obrigatório');

        if (codigo && codigosVistos.has(normalize(codigo))) {
          rowErrs.push(`código "${codigo}" duplicado na planilha`);
        }

        const quantidade = parseInt0(getVal(row, 'quantidade', 'qtd', 'estoque')) ?? 0;
        if (quantidade < 0) rowErrs.push('quantidade não pode ser negativa');

        const estoqueMin = parseInt0(getVal(row, 'estoque_minimo', 'estoque mínimo', 'minimo')) ?? 0;
        if (estoqueMin < 0) rowErrs.push('estoque_minimo não pode ser negativo');

        const valorCompraRaw = getVal(row, 'valor_compra', 'valor de compra', 'custo', 'preço');
        const valorCompra = valorCompraRaw === undefined ? null : parseDecimal(valorCompraRaw);
        if (valorCompraRaw !== undefined && valorCompra === null) {
          rowErrs.push('valor_compra inválido');
        }

        const setorNome = (getVal(row, 'setor') ?? 'Geral').toString().trim();
        const setor = setoresMap.get(normalize(setorNome));
        if (!setor) rowErrs.push(`setor "${setorNome}" não encontrado`);

        const subsetorNome = (getVal(row, 'subsetor', 'sub-setor') ?? '').toString().trim();
        let subsetorId: string | null = null;
        if (setor && subsetorNome) {
          const subs = subsetoresPorSetor.get(setor.id);
          subsetorId = subs?.get(normalize(subsetorNome)) ?? null;
          if (!subsetorId) {
            rowErrs.push(`subsetor "${subsetorNome}" não pertence a "${setor.nome}"`);
          }
        }
        if (setor && (setor.nome === 'Caminhões' || setor.nome === 'Máquinas') && !subsetorNome) {
          rowErrs.push(`subsetor é obrigatório para o setor "${setor.nome}"`);
        }

        if (rowErrs.length > 0) {
          erros.push({ linha, codigo, nome, erros: rowErrs });
          ignorados++;
          if (codigo) codigosVistos.add(normalize(codigo));
          continue;
        }

        codigosVistos.add(normalize(codigo));

        // Categoria (cria se não existir)
        const categoriaNome = (getVal(row, 'categoria') ?? '').toString().trim();
        let categoriaId: string | null = null;
        if (categoriaNome) {
          const existing = categoriasMap.get(normalize(categoriaNome));
          if (existing) {
            categoriaId = existing;
          } else {
            const { data: novaCat, error: catErr } = await supabase
              .from('categorias')
              .insert([{ nome: categoriaNome }])
              .select('id')
              .single();
            if (catErr) {
              erros.push({ linha, codigo, nome, erros: [`erro ao criar categoria: ${catErr.message}`] });
              ignorados++;
              continue;
            }
            categoriaId = novaCat!.id;
            categoriasMap.set(normalize(categoriaNome), categoriaId);
          }
        }

        const payload: any = {
          codigo,
          nome,
          categoria_id: categoriaId,
          quantidade,
          estoque_minimo: estoqueMin,
          valor_compra: valorCompra,
          localizacao: (getVal(row, 'localizacao', 'localização', 'local') ?? null) || null,
          fornecedor: (getVal(row, 'fornecedor') ?? null) || null,
          descricao: (getVal(row, 'descricao', 'descrição', 'description') ?? null) || null,
          imagem_url: (getVal(row, 'imagem_url', 'imagem', 'image') ?? null) || null,
        };
        Object.keys(payload).forEach((k) => {
          if (payload[k] === undefined) delete payload[k];
        });

        const existingId = produtosMap.get(normalize(codigo));
        let produtoId: string | undefined = existingId;
        try {
          if (existingId) {
            const { error } = await supabase.from('produtos').update(payload).eq('id', existingId);
            if (error) throw error;
            atualizados++;
          } else {
            const { data: created, error } = await supabase
              .from('produtos').insert([payload]).select('id').single();
            if (error) throw error;
            produtoId = created!.id;
            produtosMap.set(normalize(codigo), produtoId!);
            inseridos++;
          }

          // Sincroniza setor/subsetor
          if (produtoId && setor) {
            await supabase.from('produto_areas').delete().eq('produto_id', produtoId);
            const linkIds = [setor.id];
            if (subsetorId) linkIds.push(subsetorId);
            await supabase.from('produto_areas').insert(
              linkIds.map((area_id) => ({ produto_id: produtoId!, area_id })),
            );
          }
        } catch (e: any) {
          erros.push({ linha, codigo, nome, erros: [e.message || 'erro ao salvar'] });
          ignorados++;
        }
      }

      setResult({ total: rows.length, inseridos, atualizados, ignorados, erros });
      toast({
        title: 'Importação concluída',
        description: `${inseridos} novos, ${atualizados} atualizados, ${ignorados} com erro`,
      });
    } catch (e: any) {
      toast({
        title: 'Erro ao importar',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  // ============== EXPORT ==============
  const buildAreaIndex = () => {
    const byId = new Map<string, { nome: string; parent_id: string | null }>();
    areas.forEach((a) => byId.set(a.id, { nome: a.nome, parent_id: a.parent_id }));
    return byId;
  };

  const getProdutoSetorSubsetor = (produtoAreas: any[], byId: Map<string, any>) => {
    let setor = '';
    let subsetor = '';
    for (const pa of produtoAreas || []) {
      const a = byId.get(pa.area_id);
      if (!a) continue;
      if (a.parent_id === null) setor = setor || a.nome;
      else {
        subsetor = subsetor || a.nome;
        const parent = byId.get(a.parent_id);
        if (parent && !setor) setor = parent.nome;
      }
    }
    return { setor, subsetor };
  };

  const handleExport = async (formato: 'xlsx' | 'csv') => {
    setExporting(true);
    try {
      // Brindes — catálogo completo
      const { data: produtos, error: pErr } = await supabase
        .from('produtos')
        .select('*, categorias(nome), produto_areas(area_id)')
        .order('nome');
      if (pErr) throw pErr;

      const byId = buildAreaIndex();

      const brindesData = (produtos || []).map((p: any) => {
        const { setor, subsetor } = getProdutoSetorSubsetor(p.produto_areas, byId);
        return {
          codigo: p.codigo,
          nome: p.nome,
          categoria: p.categorias?.nome || '',
          setor,
          subsetor,
          quantidade: p.quantidade,
          estoque_minimo: p.estoque_minimo,
          valor_compra: Number(p.valor_compra || 0),
          valor_total_estoque: Number(p.valor_compra || 0) * (p.quantidade || 0),
          localizacao: p.localizacao || '',
          fornecedor: p.fornecedor || '',
          descricao: p.descricao || '',
          data_cadastro: p.created_at
            ? format(new Date(p.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
          imagem_url: p.imagem_url || '',
          _produto_id: p.id,
          _setor: setor,
          _subsetor: subsetor,
        };
      });

      // Movimentações — todas
      const { data: movs, error: mErr } = await supabase
        .from('movimentacoes')
        .select('*, produtos(nome, codigo, valor_compra)')
        .order('created_at', { ascending: false });
      if (mErr) throw mErr;

      // Pedidos / Solicitações — todas
      const { data: pedidos, error: pedErr } = await supabase
        .from('pedidos')
        .select('*, produtos(nome, codigo)')
        .order('created_at', { ascending: false });
      if (pedErr) throw pedErr;

      // Carrega perfis envolvidos em movimentações e pedidos
      const userIds = Array.from(new Set([
        ...(movs || []).map((m: any) => m.usuario_id).filter(Boolean),
        ...(pedidos || []).map((p: any) => p.solicitante_id).filter(Boolean),
      ]));
      const profilesMap = new Map<string, { nome: string; sobrenome: string | null }>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, nome, sobrenome')
          .in('id', userIds);
        (profs || []).forEach((p: any) =>
          profilesMap.set(p.id, { nome: p.nome, sobrenome: p.sobrenome }),
        );
      }

      const movsData = (movs || []).map((m: any) => {
        const valor = Number(m.produtos?.valor_compra || 0);
        const prof = profilesMap.get(m.usuario_id);
        return {
          data: format(new Date(m.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          brinde: m.produtos?.nome || '',
          codigo: m.produtos?.codigo || '',
          tipo: m.tipo,
          quantidade: m.quantidade,
          valor_compra: valor,
          valor_total: valor * m.quantidade,
          setor: m.setor || '',
          observacao: m.observacao || '',
          usuario: prof ? `${prof.nome || ''} ${prof.sobrenome || ''}`.trim() : '',
        };
      });

      const pedidosData = (pedidos || []).map((p: any) => {
        const prof = profilesMap.get(p.solicitante_id);
        return {
          data: format(new Date(p.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          brinde: p.produtos?.nome || '',
          codigo: p.produtos?.codigo || '',
          quantidade: p.quantidade,
          status: p.status,
          prioridade: p.prioridade,
          solicitante: prof ? `${prof.nome || ''} ${prof.sobrenome || ''}`.trim() : '',
          motivo: p.motivo || '',
          data_aprovacao: p.data_aprovacao
            ? format(new Date(p.data_aprovacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })
            : '',
        };
      });

      // Limpa campos internos
      const brindesExport = brindesData.map(({ _produto_id, _setor, _subsetor, ...rest }) => rest);

      const stamp = format(new Date(), 'yyyy-MM-dd_HHmm');
      if (formato === 'xlsx') {
        const wb = XLSX.utils.book_new();
        const wsB = XLSX.utils.json_to_sheet(brindesExport);
        const wsM = XLSX.utils.json_to_sheet(movsData);
        const wsP = XLSX.utils.json_to_sheet(pedidosData);
        XLSX.utils.book_append_sheet(wb, wsB, 'Brindes');
        XLSX.utils.book_append_sheet(wb, wsM, 'Movimentações');
        XLSX.utils.book_append_sheet(wb, wsP, 'Solicitações');
        XLSX.writeFile(wb, `estoque_${stamp}.xlsx`);
      } else {
        const csvSheets: [string, any[]][] = [
          ['brindes', brindesExport],
          ['movimentacoes', movsData],
          ['solicitacoes', pedidosData],
        ];
        for (const [name, data] of csvSheets) {
          const ws = XLSX.utils.json_to_sheet(data);
          const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
          // BOM para compatibilidade Excel
          const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${name}_${stamp}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }

      toast({
        title: 'Exportação concluída',
        description: `${brindesExport.length} brindes, ${movsData.length} movimentações, ${pedidosData.length} solicitações`,
      });
    } catch (e: any) {
      toast({
        title: 'Erro ao exportar',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold">Importar / Exportar</h1>
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Acesso negado</AlertTitle>
          <AlertDescription>
            Apenas administradores e editores podem importar ou exportar dados.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Importar / Exportar</h1>
        <p className="text-muted-foreground mt-1">
          Importe brindes em massa via planilha ou exporte os dados do estoque
        </p>
      </div>

      {/* IMPORTAÇÃO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-primary" />
            Importar Brindes
          </CardTitle>
          <CardDescription>
            Envie um arquivo .xlsx ou .csv. Brindes existentes (mesmo código) serão atualizados; novos serão criados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Baixar modelo padrão
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-2">
              <Label htmlFor="file-import">Arquivo (.xlsx ou .csv)</Label>
              <Input
                id="file-import"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setResult(null);
                }}
              />
            </div>
            <Button onClick={handleImport} disabled={!file || importing} className="gradient-primary">
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Importar
            </Button>
          </div>

          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total de linhas</p>
                  <p className="text-2xl font-bold">{result.total}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Inseridos</p>
                  <p className="text-2xl font-bold text-success">{result.inseridos}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Atualizados</p>
                  <p className="text-2xl font-bold text-primary">{result.atualizados}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Com erro</p>
                  <p className="text-2xl font-bold text-destructive">{result.ignorados}</p>
                </CardContent></Card>
              </div>

              {result.erros.length > 0 ? (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertTitle>Linhas com erro</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 max-h-64 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Linha</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Erros</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.erros.map((er, i) => (
                            <TableRow key={i}>
                              <TableCell>{er.linha}</TableCell>
                              <TableCell>{er.codigo || '-'}</TableCell>
                              <TableCell>{er.nome || '-'}</TableCell>
                              <TableCell>
                                {er.erros.map((e, j) => (
                                  <Badge key={j} variant="destructive" className="mr-1 mb-1">{e}</Badge>
                                ))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CheckCircle2 className="w-4 h-4" />
                  <AlertTitle>Importação realizada com sucesso</AlertTitle>
                  <AlertDescription>
                    Todos os registros foram processados sem erros.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* EXPORTAÇÃO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" />
            Exportar dados do estoque
          </CardTitle>
          <CardDescription>
            Exporte todos os brindes, movimentações e solicitações em Excel ou CSV.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => handleExport('xlsx')} disabled={exporting} className="gradient-primary">
              {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
              Exportar Excel (.xlsx)
            </Button>
            <Button onClick={() => handleExport('csv')} disabled={exporting} variant="outline">
              {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}