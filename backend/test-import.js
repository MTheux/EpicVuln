const payload = JSON.parse(`[
  {
    "key": "VUL-426",
    "url": "https://credmais.atlassian.net/browse/VUL-426",
    "tipoItem": "Epic",
    "projeto": "VUL",
    "categoriaStatus": "Itens Pendentes",
    "squadResponsavel": "AppMais",
    "prioridade": "Medium",
    "status": "Não Corrigida",
    "responsavel": "Edgard Fernandes de Souza",
    "criador": "Matheus Amadeu Ferreira Nina",
    "relator": "Matheus Amadeu Ferreira Nina",
    "dataDeteccao": "2026-03-06",
    "dataCriacao": "2026-03-09",
    "atualizadoEm": "2026-03-14T14:00:51.747-0300",
    "resumo": "[APP MAIS! IOS] - Exposição de Chaves API e Tokens Hardcoded no Binário [CWE-798]",
    "tipo": "Aplicação",
    "ambiente": "Homologação",
    "categoriaImpacto": "Segurança",
    "impacto": "Abuso imediato da API Key do Google",
    "descricao": "A análise estática realizada",
    "recomendacao": "Remova imediatamente",
    "alvo": "App Mais",
    "origem": "Pentest",
    "startDate": "2026-03-11",
    "dataLimite": "2026-05-20"
  },
  {
    "key": "VUL-425",
    "url": "https://credmais.atlassian.net/browse/VUL-425",
    "squadResponsavel": "AppMais",
    "prioridade": "Low",
    "status": "Não Corrigida",
    "responsavel": "Matheus Amadeu Ferreira Nina",
    "resumo": "[APP MAIS! IOS] - Bypass de Detecção de Ambiente",
    "tipo": "Aplicação",
    "ambiente": "Homologação",
    "impacto": "Execução persistente em ambiente comprometido",
    "descricao": "A verificação de ambiente é executada apenas no lançamento",
    "alvo": "App Mais",
    "origem": "Pentest",
    "dataLimite": "2026-05-30"
  }
]`);

async function run() {
  try {
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@credsystem.com.br', password: 'Admin@123' })
    });
    
    if (!loginRes.ok) throw new Error('Auth failed');
    const { token } = await loginRes.json();
    
    const res = await fetch('http://localhost:3001/api/vulnerabilities/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (err) {
    console.error(err);
  }
}
run();
