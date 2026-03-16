import { PrismaClient } from '@prisma/client';
import { VulnerabilitiesService } from './src/modules/vulnerabilities/vulnerabilities.service';

const prisma = new PrismaClient();
const service = new VulnerabilitiesService();

async function main() {
  try {
    const defaultUser = await prisma.user.findFirst();
    const data = {
        titulo: 'Teste',
        descricaoExecutiva: 'Teste',
        descricaoTecnica: 'Teste',
        criticidade: 'Alta',
        scoreCvss: 5.0,
        vetorCvss: undefined,
        cwe: undefined,
        owaspCategory: undefined,
        squad: 'App Sec',
        responsavel: undefined,
        gestor: undefined,
        sistema: 'Core API',
        ativo: 'api.cred.com',
        componente: undefined,
        ambiente: 'PRD',
        endpoint: undefined,
        metodoHttp: undefined,
        parametroAfetado: undefined,
        evidenciaTextual: undefined,
        origem: 'Manual',
        sla: '2023-11-27T00:00:00.000Z',
        tags: undefined,
        recomendacao: undefined,
        impacto: undefined,
        tipo: 'Aplicação',
        dataDeteccao: '2023-10-27T00:00:00.000Z',
        observacao: undefined,
        reincidencia: 0,
        status: 'Nova'
    };

    const result = await service.create(data, defaultUser ? defaultUser.id : 'mock-id');
    console.log('SUCCESS =', result.id);
  } catch (e: any) {
    console.error('ERROR MESSAGE:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
