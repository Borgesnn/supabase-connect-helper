/**
 * Lista centralizada de setores do CDM.
 * Alterar aqui reflete em todos os campos de setor do sistema.
 */
export const SETORES = [
  'DHO',
  'DIRETORIA',
  'VENDAS (TRUCKS)',
  'VENDAS (MAQ)',
  'PÓS-VENDAS (TRUCKS)',
  'PÓS-VENDAS (MAQ)',
  'MARKETING',
  'CELULA ATIVA',
  'CONTABILIDADE',
  'FINANCEIRO',
] as const;

export type Setor = (typeof SETORES)[number];

export function isSetorPadrao(value?: string | null): boolean {
  return !!value && (SETORES as readonly string[]).includes(value);
}

/**
 * Combina a lista padrão com setores históricos (registros antigos),
 * preservando a integridade dos dados existentes.
 */
export function setoresComLegado(legados: (string | null | undefined)[]): string[] {
  const extras = Array.from(
    new Set(legados.filter((s): s is string => !!s && !isSetorPadrao(s)))
  ).sort();
  return [...SETORES, ...extras];
}
