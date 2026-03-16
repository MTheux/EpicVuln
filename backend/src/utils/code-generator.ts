import { PrismaClient } from '@prisma/client';

export async function generateVulnCode(prisma: PrismaClient): Promise<string> {
  const count = await prisma.vulnerability.count();
  const nextNumber = count + 1;
  const code = `VULN-${String(nextNumber).padStart(4, '0')}`;
  return code;
}
