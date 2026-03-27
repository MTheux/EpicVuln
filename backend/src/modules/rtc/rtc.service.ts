import { prisma } from '../../app';

// ---- Unisys Epic Title Parser ----

/**
 * Parse an Unisys RTC Epic title to extract vulnerability name and squad.
 * Input:  "[EPICO] Pentest Unisys - Sqd Parametros (Originação e Entrada de Dados):XSS Refletido"
 * Output: { vulnName: "XSS Refletido", squad: "Originação e Entrada de Dados", fullTitle: <original> }
 */
function parseEpicTitle(title: string): { vulnName: string; squad: string; fullTitle: string } {
    const colonIdx = title.lastIndexOf(':');
    const vulnName = colonIdx > -1 ? title.substring(colonIdx + 1).trim() : title;

    const parenMatch = title.match(/\(([^)]+)\)/);
    const squad = parenMatch ? parenMatch[1] : 'Sem Squad';

    return { vulnName, squad, fullTitle: title };
}

/**
 * Map RTC severity to Criticidade enum, handling both English and Portuguese names.
 */
function mapRtcSeverity(severity: string): string {
    const s = severity?.toLowerCase() || '';
    if (s.includes('extreme') || s.includes('extrema')) return 'CRITICA';
    if (s.includes('critical') || s.includes('critica') || s.includes('crítica')) return 'CRITICA';
    if (s.includes('high') || s.includes('alta')) return 'ALTA';
    if (s.includes('medium') || s.includes('media') || s.includes('média')) return 'MEDIA';
    if (s.includes('low') || s.includes('baixa')) return 'BAIXA';
    return '';
}

// RTC Status -> EpicVuln Status
const STATUS_MAP: Record<string, string> = {
    'New': 'NOVO',
    'In Progress': 'EM_CORRECAO',
    'Resolved': 'EM_RETESTE',
    'Verified': 'CONCLUIDO',
    'Closed': 'FECHADO',
    'Reopened': 'ABERTO',
    'Invalid': 'RISCO_ACEITO',
};

// RTC Priority/Severity -> Criticidade
const SEVERITY_MAP: Record<string, string> = {
    'Critical': 'CRITICA',
    'Major': 'CRITICA',
    'Normal': 'ALTA',
    'Minor': 'MEDIA',
    'Trivial': 'BAIXA',
    'Blocker': 'CRITICA',
};

interface RtcSession {
    cookies: string;
    baseUrl: string;
}

export class RtcService {
    // ---- Settings Management ----

    async getSettings() {
        const url = await prisma.systemSettings.findUnique({ where: { key: 'RTC_URL' } });
        const username = await prisma.systemSettings.findUnique({ where: { key: 'RTC_USERNAME' } });
        const password = await prisma.systemSettings.findUnique({ where: { key: 'RTC_PASSWORD' } });
        const projects = await prisma.systemSettings.findUnique({ where: { key: 'RTC_PROJECTS' } });

        return {
            url: url?.value || '',
            username: username?.value || '',
            password: password?.value ? '********' : '',
            projects: projects?.value || ''
        };
    }

    async saveSettings(data: { url: string; username: string; password?: string; projects: string }) {
        const { url, username, password, projects } = data;

        await this.upsertSetting('RTC_URL', url);
        await this.upsertSetting('RTC_USERNAME', username);
        if (password && password !== '********') await this.upsertSetting('RTC_PASSWORD', password);
        await this.upsertSetting('RTC_PROJECTS', projects);

        return { success: true, message: 'Configuracoes do RTC atualizadas com sucesso.' };
    }

    private async upsertSetting(key: string, value: string) {
        if (!value) return;
        await prisma.systemSettings.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
    }

    // ---- RTC Authentication ----

    /**
     * Authenticate with IBM RTC using form-based auth, falling back to Basic Auth.
     * RTC uses form-based authentication that posts to /authenticated/identity.
     * On success, the server returns session cookies (JSESSIONID, etc.) for subsequent requests.
     */
    private async authenticate(): Promise<RtcSession> {
        const urlSetting = await prisma.systemSettings.findUnique({ where: { key: 'RTC_URL' } });
        const usernameSetting = await prisma.systemSettings.findUnique({ where: { key: 'RTC_USERNAME' } });
        const passwordSetting = await prisma.systemSettings.findUnique({ where: { key: 'RTC_PASSWORD' } });

        const baseUrl = urlSetting?.value?.replace(/\/$/, '');
        const username = usernameSetting?.value;
        const password = passwordSetting?.value;

        if (!baseUrl || !username || !password) {
            throw new Error('Integracao com o RTC nao esta completamente configurada.');
        }

        // Step 1: Try form-based authentication (standard for RTC/Jazz)
        try {
            const session = await this.formBasedAuth(baseUrl, username, password);
            if (session) return session;
        } catch (err) {
            console.warn('[RTC] Form-based auth failed, falling back to Basic Auth:', err);
        }

        // Step 2: Fallback to Basic Auth
        const basicAuth = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
        return { cookies: '', baseUrl, } as RtcSession & { authHeader?: string };
    }

    /**
     * Form-based authentication for IBM RTC/Jazz.
     * Posts credentials to /authenticated/identity and captures session cookies.
     */
    private async formBasedAuth(baseUrl: string, username: string, password: string): Promise<RtcSession | null> {
        // First, request a protected resource to get the login form redirect
        const initialRes = await fetch(`${baseUrl}/authenticated/identity`, {
            method: 'GET',
            redirect: 'manual',
            headers: {
                'Accept': 'application/json'
            }
        });

        // Collect initial cookies
        let cookies = this.extractCookies(initialRes);

        // Post credentials to the Jazz auth endpoint
        const authRes = await fetch(`${baseUrl}/authenticated/j_security_check`, {
            method: 'POST',
            redirect: 'manual',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies
            },
            body: `j_username=${encodeURIComponent(username)}&j_password=${encodeURIComponent(password)}`
        });

        // Merge cookies from auth response
        cookies = this.mergeCookies(cookies, this.extractCookies(authRes));

        // Check if authentication succeeded
        // RTC redirects to /authenticated/identity on success; on failure it redirects to authfailed
        const location = authRes.headers.get('location') || '';
        if (location.includes('authfailed')) {
            throw new Error('Credenciais RTC invalidas.');
        }

        // Follow redirect to confirm auth and get final session cookies
        if (location) {
            const confirmRes = await fetch(location.startsWith('http') ? location : `${baseUrl}${location}`, {
                method: 'GET',
                redirect: 'manual',
                headers: {
                    'Accept': 'application/json',
                    'Cookie': cookies
                }
            });
            cookies = this.mergeCookies(cookies, this.extractCookies(confirmRes));
        }

        if (!cookies) return null;

        return { cookies, baseUrl };
    }

    /**
     * Extract Set-Cookie headers from a response into a cookie string.
     */
    private extractCookies(res: globalThis.Response): string {
        const setCookieHeaders = res.headers.getSetCookie?.() || [];
        return setCookieHeaders
            .map(c => c.split(';')[0])
            .join('; ');
    }

    /**
     * Merge two cookie strings, with newer cookies overriding older ones.
     */
    private mergeCookies(existing: string, incoming: string): string {
        const cookieMap = new Map<string, string>();

        for (const str of [existing, incoming]) {
            if (!str) continue;
            for (const pair of str.split('; ')) {
                const [name] = pair.split('=');
                if (name) cookieMap.set(name.trim(), pair);
            }
        }

        return Array.from(cookieMap.values()).join('; ');
    }

    // ---- RTC API Requests ----

    /**
     * Make an authenticated request to the RTC API.
     * Uses session cookies from form auth, with Basic Auth fallback.
     */
    private async rtcFetch(session: RtcSession, path: string): Promise<any> {
        const url = `${session.baseUrl}${path}`;
        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'OSLC-Core-Version': '2.0'
        };

        if (session.cookies) {
            headers['Cookie'] = session.cookies;
        } else {
            // Fallback to Basic Auth
            const usernameSetting = await prisma.systemSettings.findUnique({ where: { key: 'RTC_USERNAME' } });
            const passwordSetting = await prisma.systemSettings.findUnique({ where: { key: 'RTC_PASSWORD' } });
            if (usernameSetting?.value && passwordSetting?.value) {
                headers['Authorization'] = 'Basic ' + Buffer.from(`${usernameSetting.value}:${passwordSetting.value}`).toString('base64');
            }
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`Erro na API do RTC: ${response.statusText} (${response.status})`);
        }

        return response.json();
    }

    // ---- Test Connection ----

    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const session = await this.authenticate();

            // Try to fetch the project areas to confirm the connection works
            await this.rtcFetch(session, '/oslc/workitems/catalog');

            return { success: true, message: 'Conexao com o RTC estabelecida com sucesso.' };
        } catch (error: any) {
            console.error('[RTC] Connection test failed:', error);
            return { success: false, message: `Falha na conexao com o RTC: ${error.message}` };
        }
    }

    // ---- Sync Logic ----

    async sync(userId: string) {
        const settings = await this.getSettings();
        const projectsSetting = await prisma.systemSettings.findUnique({ where: { key: 'RTC_PROJECTS' } });

        if (!settings.url || !settings.username || !settings.password || !projectsSetting?.value) {
            throw new Error('Integracao com o RTC nao esta completamente configurada.');
        }

        const session = await this.authenticate();
        const projects = projectsSetting.value.split(',').map((p: string) => p.trim()).filter(Boolean);

        if (projects.length === 0) {
            throw new Error('Nenhum projeto configurado para sincronizacao do RTC.');
        }

        let totalImported = 0;

        for (const projectArea of projects) {
            try {
                const imported = await this.syncProject(session, projectArea, userId);
                totalImported += imported;
            } catch (err: any) {
                console.error(`[RTC] Erro ao sincronizar projeto ${projectArea}:`, err.message);
            }
        }

        return {
            success: true,
            message: `Sincronizacao do RTC finalizada. ${totalImported} work items processados.`,
            imported: totalImported
        };
    }

    /**
     * Sync all work items from a specific RTC project area.
     */
    private async syncProject(session: RtcSession, projectArea: string, userId: string): Promise<number> {
        // Use OSLC query to fetch work items from the project area
        // Query fetches Épicos (Epics), Defects and Tasks for vulnerability tracking
        const encodedProject = encodeURIComponent(projectArea);
        const queryPath = `/oslc/workitems?oslc.where=rtc_cm:projectArea="${encodedProject}"&oslc.select=dcterms:title,dcterms:description,dcterms:identifier,dcterms:created,dcterms:creator,rtc_cm:state,rtc_cm:severity,rtc_cm:priority,rtc_cm:ownedBy,rtc_cm:filedAgainst,rtc_cm:type&oslc.pageSize=200`;

        let data: any;
        try {
            data = await this.rtcFetch(session, queryPath);
        } catch (err: any) {
            // Fallback: try RTC-specific REST API if OSLC query fails
            console.warn(`[RTC] OSLC query failed for ${projectArea}, trying REST API fallback:`, err.message);
            data = await this.rtcFetch(session, `/resource/itemName/com.ibm.team.workitem.WorkItem?projectArea=${encodedProject}&maxResults=200`);
        }

        // RTC can return work items under different keys depending on API version
        const allItems: any[] = data?.['oslc:results'] || data?.['rdfs:member'] || data?.results || data?.workItems || [];

        if (!Array.isArray(allItems) || allItems.length === 0) {
            console.log(`[RTC] Nenhum work item encontrado no projeto ${projectArea}.`);
            return 0;
        }

        // Filter for Épico (Epic) type work items from Unisys RTC
        // Accept all items if none match Epic filter (backwards compatibility)
        const epicItems = allItems.filter(item => {
            const typeName = this.resolveLabel(item['rtc_cm:type'] || item.type || '');
            const title = item['dcterms:title'] || item.title || item.summary || '';
            return typeName.toLowerCase().includes('pico') || // Épico / Epico
                   title.startsWith('[EPICO]') ||
                   title.startsWith('[ÉPICO]');
        });

        const workItems = epicItems.length > 0 ? epicItems : allItems;
        console.log(`[RTC] Projeto ${projectArea}: ${allItems.length} work items total, ${epicItems.length} épicos encontrados.`);

        let imported = 0;

        for (const item of workItems) {
            try {
                await this.syncWorkItem(session, item, projectArea, userId);
                imported++;
            } catch (err: any) {
                console.error(`[RTC] Erro ao processar work item:`, err.message);
            }
        }

        return imported;
    }

    /**
     * Sync a single RTC work item to a Vulnerability record.
     */
    private async syncWorkItem(session: RtcSession, item: any, projectArea: string, userId: string): Promise<void> {
        // Extract fields from the RTC work item
        // OSLC uses Dublin Core (dcterms:) and RTC-specific (rtc_cm:) namespaces
        const workItemId = item['dcterms:identifier'] || item.identifier || item.id || '';
        const rawTitle = item['dcterms:title'] || item.title || item.summary || 'Sem titulo';
        const description = item['dcterms:description'] || item.description || '';
        const stateName = this.resolveLabel(item['rtc_cm:state'] || item.state);
        const severityName = this.resolveLabel(item['rtc_cm:severity'] || item.severity);
        const priorityName = this.resolveLabel(item['rtc_cm:priority'] || item.priority);
        const owner = this.resolveLabel(item['rtc_cm:ownedBy'] || item.ownedBy);
        const creator = this.resolveLabel(item['dcterms:creator'] || item.creator);
        const createdDate = item['dcterms:created'] || item.created || '';
        const filedAgainst = this.resolveLabel(item['rtc_cm:filedAgainst'] || item.filedAgainst);

        // Parse Unisys Epic title format: "[EPICO] Pentest Unisys - Sqd Parametros (Squad):VulnName"
        const { vulnName, squad: parsedSquad } = parseEpicTitle(rawTitle);

        // Use parsed vuln name as titulo, fall back to raw title if no colon found
        const title = vulnName || rawTitle;

        // Squad: prefer parsed from title, then filedAgainst, then fallback
        const squad = parsedSquad !== 'Sem Squad' ? parsedSquad : (filedAgainst || 'Sem Squad');

        // Generate a stable codigoInterno from the RTC work item ID and project
        const codigoInterno = `RTC-${projectArea.replace(/\s+/g, '-')}-${workItemId}`;

        // Map status
        const mappedStatus = this.mapStatus(stateName);

        // Map severity using both the standalone function (PT/EN) and class method
        const mappedCriticidade = mapRtcSeverity(severityName) || mapRtcSeverity(priorityName) ||
                                  this.mapSeverity(severityName) || this.mapSeverity(priorityName) || 'MEDIA';

        // Use dc:creator as responsavel (person who filed the Epic)
        const responsavel = creator || owner || undefined;

        // Check if vulnerability already exists (by codigoInterno)
        const existing = await prisma.vulnerability.findFirst({
            where: { codigoInterno }
        });

        let vulnId = '';

        if (!existing) {
            // Create new vulnerability
            const newVuln = await prisma.vulnerability.create({
                data: {
                    codigoInterno,
                    jiraKey: `RTC-${workItemId}`, // stored in jiraKey DB column for compatibility
                    titulo: title,
                    descricaoExecutiva: (typeof description === 'string' ? description.substring(0, 500) : '') || 'Importado do IBM RTC',
                    descricaoTecnica: (typeof description === 'string' ? description : '') || 'Work item RTC importado',
                    criticidade: mappedCriticidade as any,
                    status: mappedStatus as any,
                    squad,
                    sistema: projectArea,
                    ativo: 'Sistemas',
                    ambiente: 'PRODUCAO',
                    origem: 'PENTEST',
                    responsavel,
                    createdById: userId,
                }
            });
            vulnId = newVuln.id;
        } else {
            // Update existing vulnerability
            await prisma.vulnerability.update({
                where: { id: existing.id },
                data: {
                    titulo: title,
                    status: mappedStatus as any,
                    criticidade: mappedCriticidade as any,
                    squad,
                    responsavel: responsavel || existing.responsavel,
                }
            });
            vulnId = existing.id;
        }

        // Record sync event in history
        const existingHist = await prisma.vulnerabilityHistory.findFirst({
            where: {
                vulnerabilityId: vulnId,
                eventType: 'SYNC_RTC' as any,
                description: { contains: `WI ${workItemId}` }
            }
        });

        if (!existingHist) {
            await prisma.vulnerabilityHistory.create({
                data: {
                    vulnerabilityId: vulnId,
                    eventType: 'SYNC_RTC' as any,
                    description: `[Sync RTC] WI ${workItemId} - Status: ${stateName} -> ${mappedStatus}`,
                }
            });
        }
    }

    // ---- Field Mapping Helpers ----

    /**
     * Resolve a field value that might be an object with a label/title or a plain string.
     * RTC OSLC API often returns objects like { "rdf:resource": "...", "dcterms:title": "In Progress" }
     */
    private resolveLabel(field: any): string {
        if (!field) return '';
        if (typeof field === 'string') return field;
        return field['dcterms:title'] || field.title || field.label || field.name || field['rdf:resource'] || '';
    }

    /**
     * Map an RTC status name to a EpicVuln status.
     */
    private mapStatus(statusName: string): string {
        if (!statusName) return 'NOVO';

        // Try exact match first
        if (STATUS_MAP[statusName]) return STATUS_MAP[statusName];

        // Try case-insensitive partial match
        const lower = statusName.toLowerCase();
        for (const [rtcStatus, vulnStatus] of Object.entries(STATUS_MAP)) {
            if (lower.includes(rtcStatus.toLowerCase())) return vulnStatus;
        }

        // Fallback heuristics
        if (lower.includes('progress') || lower.includes('working') || lower.includes('development')) return 'EM_CORRECAO';
        if (lower.includes('resolved') || lower.includes('fixed')) return 'EM_RETESTE';
        if (lower.includes('verified') || lower.includes('done')) return 'CONCLUIDO';
        if (lower.includes('closed') || lower.includes('complete')) return 'FECHADO';
        if (lower.includes('reopen')) return 'ABERTO';
        if (lower.includes('new') || lower.includes('open')) return 'NOVO';

        return 'NOVO';
    }

    /**
     * Map an RTC severity/priority name to a EpicVuln criticidade.
     */
    private mapSeverity(severityName: string): string {
        if (!severityName) return '';

        // Try exact match first
        if (SEVERITY_MAP[severityName]) return SEVERITY_MAP[severityName];

        // Try case-insensitive partial match
        const lower = severityName.toLowerCase();
        for (const [rtcSev, vulnCrit] of Object.entries(SEVERITY_MAP)) {
            if (lower.includes(rtcSev.toLowerCase())) return vulnCrit;
        }

        // Fallback heuristics (English and Portuguese)
        if (lower.includes('block') || lower.includes('critical') || lower.includes('showstopper')) return 'CRITICA';
        if (lower.includes('extrema') || lower.includes('extreme')) return 'CRITICA';
        if (lower.includes('critica') || lower.includes('crítica')) return 'CRITICA';
        if (lower.includes('major') || lower.includes('high') || lower.includes('alta')) return 'CRITICA';
        if (lower.includes('normal') || lower.includes('medium') || lower.includes('média') || lower.includes('media')) return 'ALTA';
        if (lower.includes('minor') || lower.includes('low') || lower.includes('baixa')) return 'MEDIA';
        if (lower.includes('trivial') || lower.includes('enhancement')) return 'BAIXA';

        return '';
    }
}
