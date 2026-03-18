# VulnControl Intelligence Dashboard

Plataforma corporativa de gestão de vulnerabilidades com análise preditiva e integração Jira.

## 🚀 Como Rodar o Projeto

Você pode rodar o projeto de duas formas: usando **Docker** (recomendado para consistência) ou manual com **NPM**.

### 1. Requisitos Prévios
- [Git](https://git-scm.com/)
- [Docker & Docker Compose](https://www.docker.com/) (Caso use Docker)
- [Node.js v18+](https://nodejs.org/) (Caso use NPM)

### 2. Configuração inicial
Após clonar o repositório, você precisará configurar as variáveis de ambiente:

1. Na pasta raiz, crie um arquivo `.env` (ou `.env.local`).
2. Na pasta `/backend`, crie um arquivo `.env` com:
   ```env
   DATABASE_URL="postgresql://vulncontrol:vulncontrol@localhost:5432/vulncontrol"
   JWT_SECRET="sua_chave_secreta"
   GROQ_API_KEY="sua_chave_da_groq"
   ```

---

### Opção A: Rodando com Docker (Recomendado)

Na pasta raiz do projeto, execute:
```powershell
docker-compose up -d --build
```
Isso subirá automaticamente:
- **Frontend**: http://localhost:9000
- **Backend**: http://localhost:9001
- **Banco de Dados**: PostgreSQL

---

### Opção B: Rodando Localmente (NPM)

#### Passo 1: Iniciar o Banco de Dados
Certifique-se de ter um PostgreSQL rodando ou use apenas o container do banco:
```powershell
docker-compose up -d db
```

#### Passo 2: Configurar o Backend
No diretório `/backend`:
```powershell
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

#### Passo 3: Configurar o Frontend
No diretório raiz:
```powershell
npm install
npm run dev
```

---

## 🛠 Tecnologias
- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons, Shadcn/UI.
- **Backend**: Node.js, Express, Prisma ORM.
- **IA**: Groq Cloud API (Llama 3).
- **Banco**: PostgreSQL.

## 📄 Licença
Uso exclusivo CredSystem.
