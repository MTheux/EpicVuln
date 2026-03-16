import { prisma } from '../../app';

export class NotificationsService {
    async notifySquad(vulnerabilityId: string, userId: string) {
        const vuln = await prisma.vulnerability.findUnique({ where: { id: vulnerabilityId } });

        if (!vuln) throw new Error('Vulnerability not found');

        // MOCK: Em produção, isso integraria com pacote nodemailer, lendo do .env SMTP
        console.log(`Sending email to squad ${vuln.squad} about vulnerability ${vuln.titulo}`);

        // Registra envio da notificação
        const log = await prisma.notificationLog.create({
            data: {
                channel: 'EMAIL',
                recipient: `${vuln.squad}@credsystem.com`,
                subject: `[Aviso] ${vuln.titulo}`,
                status: 'SENT'
            }
        });

        // Registra no histórico para o usuário ver
        await prisma.vulnerabilityHistory.create({
            data: {
                vulnerabilityId,
                type: 'notificacao',
                description: `Squad ${vuln.squad} notificada via e-mail.`,
                userId
            }
        });

        return log;
    }
}
