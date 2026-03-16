const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const defaultUser = await prisma.user.findFirst();
    const result = await prisma.vulnerability.create({
      data: {
        codigoInterno: 'VULN-' + Date.now(),
        titulo: 'Teste',
        descricaoExecutiva: 'Teste',
        descricaoTecnica: 'Teste',
        criticidade: 'ALTA',
        status: 'NOVO',
        origem: 'MANUAL',
        squad: 'App Sec',
        sistema: 'Core API',
        ambiente: 'PRODUCAO',
        ativo: 'api.cred.com',
        dataDeteccao: new Date(),
        sla: new Date(),
        reincidencia: 0,
        notificacoesEnviadas: 0,
        diasEmAberto: 0,
        createdById: defaultUser ? defaultUser.id : 'dev-mock-id'
      }
    });
    console.log('Success:', result);
  } catch (err) {
    console.error('ERROR MESSAGE:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
