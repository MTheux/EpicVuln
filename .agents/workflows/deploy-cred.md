---
description: Como extrair o projeto e subir no servidor da Unisys via Docker
---

# Guia de Deployment (Unisys VulnControl)

Siga estes passos para extrair o projeto da sua máquina e subir no servidor.

### 1. Preparação dos Arquivos
Certifique-se de que os arquivos `Dockerfile` e `docker-compose.yml` estão na raiz do projeto.

### 2. Configurar Variáveis de Ambiente
No servidor, crie um arquivo `.env` na raiz com as chaves necessárias:
```env
GROQ_API_KEY=sua_chave_aqui
DATABASE_URL=postgresql://vulncontrol:vulncontrol@db:5432/vulncontrol
```

### 3. Build e Start (Docker)
Execute o comando abaixo para construir as imagens e subir os containers em modo "detached" (segundo plano):

// turbo
```powershell
docker-compose up -d --build
```

### 4. Verificação
- **Frontend:** http://ip-do-servidor:9000
- **Backend Health:** http://ip-do-servidor:9001/health

### 5. Extração (ZIP)
Para levar ao servidor, você pode zipar a pasta (excluindo `node_modules` e `.next`) ou usar git:
```powershell
# Exemplo de comando para zipar ignorando lixo
Compress-Archive -Path .\* -DestinationPath ..\vulncontrol_deploy.zip -Exclude "node_modules", ".next", ".git"
```

---
> [!IMPORTANT]
> Certifique-se de que as portas 9000 e 9001 estão abertas no firewall do servidor da Unisys.
