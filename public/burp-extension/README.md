# AISEC Burp Extension (Jython)

Extensão nativa do Burp Suite que envia o histórico HTTP capturado direto pra plataforma AISEC.

## Instalar

1. Baixe o arquivo `AisecBurpExtension.py` (você está nesse diretório).
2. No Burp Suite: **Extender → Options** → confirme que tem **Jython standalone JAR** configurado em "Python Environment". (Baixar em https://www.jython.org/download → jython-standalone-2.7.x.jar)
3. **Extender → Extensions → Add**:
   - Extension Type: **Python**
   - Extension file: aponte pro `AisecBurpExtension.py`
   - Output / Errors: deixe em "Show in UI"
4. Clique **Next** → aba **AISEC** deve aparecer no topo do Burp.

## Usar

### Configuração inicial

1. Abra aba **AISEC**.
2. URL: `http://localhost:9001` (ou onde sua plataforma AISEC está rodando).
3. Token JWT:
   - Faça login na plataforma AISEC no browser.
   - F12 → Application → Cookies → copie o valor do cookie `epicvuln_token`.
   - Cole no campo "JWT / Bearer token".
4. Clique **Testar conexão** — deve mostrar `HTTP 200 · {"status":"ok",...}`.

### Enviar requests

**Por seleção (recomendado)**:
- No Proxy History (ou Target / Site Map / Repeater), selecione os requests que quer mandar.
- Botão direito → **"Send N selected to AISEC"**.
- Confira o log na aba AISEC.

**História inteira**:
- Aba AISEC → **"Exportar TODO o proxy history → AISEC"**.

### O que acontece na AISEC

Os requests aparecem em **/pentest/unisystem** (Burp Zekrom) → bridge ativa com **/pentest/checklist** (OWASP) → marca itens cobertos automaticamente via heurísticas + gera evidência metodológica em Markdown.

## Modo offline (fallback)

Se a API estiver fora ou o token inválido, com a flag "Salvar JSON em /tmp/aisec-burp.json" marcada, a extensão grava um arquivo local `/tmp/aisec-burp-{timestamp}.json` que você pode upar manualmente em /pentest/unisystem.

## Compliance

- A extensão NÃO executa ataques — só exporta history que o pentester já coletou.
- Token JWT fica em memória durante a sessão Burp; não persiste em Burp Project File.
- Conforme Unisys AI P1.0: assistive only, human oversight.

## Versões

- 1.0.0 (2026-05-25) — release inicial: tab AISEC + context menu + export all + fallback file.

## Autor

Unisys AppSec Squad · plataforma AISEC · uso interno Caixa Econômica Federal.
