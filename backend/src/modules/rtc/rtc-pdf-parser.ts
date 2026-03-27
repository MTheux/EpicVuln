/**
 * RTC PDF Parser - Parses IBM RTC Epic PDFs to extract vulnerability data
 *
 * Expected PDF structure (from RTC work item print):
 * - Title: [EPICO] Pentest Unisys - Sqd X (Squad Name):Vuln Name
 * - Criticidade (Gravidade): Alta/Critica/Media/Baixa
 * - Squad: NM182 - Squad Name - SIACI
 * - Data de Criação: 27/11/2025, 16:18:29
 * - Criado Por: Nome Completo
 * - Descrição: full text
 * - Tipo de Item de Backlog: Épico
 */

interface ParsedVulnerability {
  titulo: string;
  fullTitle: string;
  criticidade: string;
  squad: string;
  responsavel: string;
  dataCriacao: string;
  descricao: string;
  tipoItem: string;
  workItemId: string;
}

function mapSeverity(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s.includes('crítica') || s.includes('critica') || s.includes('critical')) return 'CRITICA';
  if (s.includes('alta') || s.includes('high')) return 'ALTA';
  if (s.includes('média') || s.includes('media') || s.includes('medium')) return 'MEDIA';
  if (s.includes('baixa') || s.includes('low')) return 'BAIXA';
  if (s.includes('informativa') || s.includes('info')) return 'INFORMATIVA';
  return 'MEDIA';
}

function parseEpicTitleFromPdf(title: string): { vulnName: string; squad: string } {
  // "[EPICO] Pentest Unisys - Sqd Parametros (Originação e Entrada de Dados):XSS Refletido"
  const colonIdx = title.lastIndexOf(':');
  const vulnName = colonIdx > -1 ? title.substring(colonIdx + 1).trim() : title;

  const parenMatch = title.match(/\(([^)]+)\)/);
  const squad = parenMatch ? parenMatch[1].trim() : '';

  return { vulnName: vulnName || title, squad };
}

export function parseRtcPdf(text: string): ParsedVulnerability[] {
  const vulns: ParsedVulnerability[] = [];

  // Split into sections - each work item/epic in the PDF
  // Try to find work item boundaries
  const sections = splitIntoWorkItems(text);

  for (const section of sections) {
    const vuln = extractVulnFromSection(section);
    if (vuln) {
      vulns.push(vuln);
    }
  }

  // If no sections found, try parsing the entire text as one work item
  if (vulns.length === 0) {
    const vuln = extractVulnFromSection(text);
    if (vuln) {
      vulns.push(vuln);
    }
  }

  return vulns;
}

function splitIntoWorkItems(text: string): string[] {
  // Try splitting by "[EPICO]" or "[ÉPICO]" markers
  const epicPattern = /\[E[Pp][Ii][Cc][Oo]\]/g;
  const matches = [...text.matchAll(epicPattern)];

  if (matches.length > 1) {
    const sections: string[] = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index!;
      const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
      sections.push(text.substring(start, end));
    }
    return sections;
  }

  // Try splitting by "Tipo de Item de Backlog" which appears per work item
  const tipoPattern = /Tipo de Item de Backlog/g;
  const tipoMatches = [...text.matchAll(tipoPattern)];

  if (tipoMatches.length > 1) {
    // Find title patterns before each "Tipo" section
    return [text]; // Fallback to single
  }

  return [text];
}

function extractVulnFromSection(section: string): ParsedVulnerability | null {
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);

  // Extract title - look for [EPICO] pattern or first significant line
  let fullTitle = '';
  let titulo = '';
  let squad = '';

  for (const line of lines) {
    if (/\[E[Pp][Ii][Cc][Oo]\]/.test(line)) {
      fullTitle = line;
      const parsed = parseEpicTitleFromPdf(line);
      titulo = parsed.vulnName;
      squad = parsed.squad;
      break;
    }
  }

  // If no [EPICO] tag, look for a title-like pattern
  if (!fullTitle) {
    for (const line of lines) {
      if (line.length > 20 && (line.includes('Pentest') || line.includes('Vuln') || line.includes('XSS') || line.includes('SQL') || line.includes('CSRF') || line.includes('Injection'))) {
        fullTitle = line;
        titulo = line;
        break;
      }
    }
  }

  if (!fullTitle && !titulo) {
    // Use first long line as title
    const firstLong = lines.find(l => l.length > 15);
    if (firstLong) {
      fullTitle = firstLong;
      titulo = firstLong;
    }
  }

  // Extract fields using patterns
  const criticidade = extractField(section, [
    /Gravidade[:\s]*([^\n]+)/i,
    /Criticidade[:\s]*([^\n]+)/i,
    /Severity[:\s]*([^\n]+)/i,
    /Prioridade[:\s]*([^\n]+)/i,
  ]);

  const squadField = extractField(section, [
    /Squad[:\s]*([^\n]+)/i,
    /Equipe[:\s]*([^\n]+)/i,
    /Team[:\s]*([^\n]+)/i,
    /Arquivado Em[:\s]*([^\n]+)/i,
    /Filed Against[:\s]*([^\n]+)/i,
  ]);

  if (squadField && !squad) {
    squad = squadField;
  }

  const responsavel = extractField(section, [
    /Criado [Pp]or[:\s]*([^\n]+)/i,
    /Created [Bb]y[:\s]*([^\n]+)/i,
    /Proprietário[:\s]*([^\n]+)/i,
    /Owner[:\s]*([^\n]+)/i,
    /Responsável[:\s]*([^\n]+)/i,
  ]);

  let dataCriacao = extractField(section, [
    /Data\s*de\s*[Cc]ria[çc][ãa][oõ][:\s]*([^\n]+)/i,
    /Data\s*de[Cc]ria[çc][ãa]o[:\s]*([^\n]+)/i,
    /Cria[çc][ãa]o[:\s]*(\d{2}\/\d{2}\/\d{4}[^\n]*)/i,
    /Created[:\s]*([^\n]+)/i,
    /Criado em[:\s]*([^\n]+)/i,
  ]);

  // Fallback: find any date pattern near "Cria" text
  if (!dataCriacao) {
    const criaIdx = section.search(/[Cc]ria[çc]/);
    if (criaIdx > -1) {
      const nearby = section.substring(criaIdx, criaIdx + 100);
      const dateMatch = nearby.match(/(\d{2}\/\d{2}\/\d{4}(?:,?\s*\d{2}:\d{2}(?::\d{2})?)?)/);
      if (dateMatch) dataCriacao = dateMatch[1];
    }
  }

  // Last resort: find first date in the section
  if (!dataCriacao) {
    const anyDate = section.match(/(\d{2}\/\d{2}\/\d{4}(?:,?\s*\d{2}:\d{2}(?::\d{2})?)?)/);
    if (anyDate) dataCriacao = anyDate[1];
  }

  const tipoItem = extractField(section, [
    /Tipo de Item de Backlog[:\s]*([^\n]+)/i,
    /Work Item Type[:\s]*([^\n]+)/i,
    /Tipo[:\s]*([^\n]+)/i,
  ]);

  // Extract work item ID
  const workItemId = extractField(section, [
    /(?:Work ?Item|Item)\s*(?:#|ID|:)\s*(\d+)/i,
    /(\d{6,})/,  // 6+ digit number likely a work item ID
  ]);

  // Extract description - everything after "Descrição" or "Description"
  let descricao = '';
  const descMatch = section.match(/Descri[çc][aã]o[:\s]*([\s\S]*?)(?=(?:Gravidade|Criticidade|Squad|Equipe|Tipo de Item|Criado|Links|Discuss|$))/i);
  if (descMatch) {
    descricao = descMatch[1].trim().substring(0, 5000); // Limit to 5000 chars
  }

  // Need at least a title to be valid
  if (!titulo && !fullTitle) return null;

  return {
    titulo: titulo || fullTitle,
    fullTitle: fullTitle || titulo,
    criticidade: mapSeverity(criticidade || 'media'),
    squad: squad || 'Sem Squad',
    responsavel: responsavel || '',
    dataCriacao: dataCriacao || '',
    descricao: descricao || `Vulnerabilidade importada do RTC: ${fullTitle || titulo}`,
    tipoItem: tipoItem || 'Épico',
    workItemId: workItemId || '',
  };
}

function extractField(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}
