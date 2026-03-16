import { z } from 'zod';

const criticidadeEnum = z.enum([
  'EXTREMA',
  'CRITICA',
  'ALTA',
  'MEDIA',
  'BAIXA',
  'INFORMATIVA',
]);

const statusEnum = z.enum([
  'NOVO',
  'ABERTO',
  'EM_BACKLOG',
  'EM_CORRECAO',
  'EM_RETESTE',
  'MITIGADO',
  'CONCLUIDO',
  'RISCO_ACEITO',
  'FECHADO',
]);

const origemEnum = z.enum([
  'PENTEST',
  'DAST',
  'SAST',
  'SCA',
  'BUG_BOUNTY',
  'MANUAL',
  'MONITORAMENTO',
  'CODE_REVIEW',
]);

export const createVulnerabilitySchema = z.object({
  titulo: z.string({ required_error: 'Titulo e obrigatorio.' }).min(1, 'Titulo e obrigatorio.'),
  descricaoExecutiva: z
    .string({ required_error: 'Descricao executiva e obrigatoria.' })
    .min(1, 'Descricao executiva e obrigatoria.'),
  descricaoTecnica: z
    .string({ required_error: 'Descricao tecnica e obrigatoria.' })
    .min(1, 'Descricao tecnica e obrigatoria.'),
  criticidade: criticidadeEnum,
  status: statusEnum.default('NOVO'),
  scoreCvss: z.number().min(0).max(10).optional(),
  vetorCvss: z.string().optional(),
  cwe: z.string().optional(),
  owaspCategory: z.string().optional(),
  origem: origemEnum,
  squad: z.string({ required_error: 'Squad e obrigatorio.' }).min(1, 'Squad e obrigatorio.'),
  responsavel: z.string().optional(),
  gestor: z.string().optional(),
  sistema: z.string({ required_error: 'Sistema e obrigatorio.' }).min(1, 'Sistema e obrigatorio.'),
  ativo: z.string({ required_error: 'Ativo e obrigatorio.' }).min(1, 'Ativo e obrigatorio.'),
  componente: z.string().optional(),
  ambiente: z.string().optional(),
  endpoint: z.string().optional(),
  metodoHttp: z.string().optional(),
  parametroAfetado: z.string().optional(),
  evidenciaTextual: z.string().optional(),
  recomendacao: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  reincidencia: z.number().int().min(0).optional().default(0),
  sla: z.string().datetime({ offset: true }).optional().or(z.string().date().optional()),
  jiraKey: z.string().optional(),
});

export const updateVulnerabilitySchema = createVulnerabilitySchema.partial();

export const filterSchema = z.object({
  criticidade: criticidadeEnum.optional(),
  status: statusEnum.optional(),
  squad: z.string().optional(),
  origem: origemEnum.optional(),
  owaspCategory: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().default('dataCriacao'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateVulnerabilityInput = z.infer<typeof createVulnerabilitySchema>;
export type UpdateVulnerabilityInput = z.infer<typeof updateVulnerabilitySchema>;
export type FilterInput = z.infer<typeof filterSchema>;
