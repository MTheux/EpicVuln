import { PrismaClient, HistoryEventType } from '@prisma/client';

export async function createHistoryEntry(
  prisma: PrismaClient,
  vulnerabilityId: string,
  eventType: HistoryEventType,
  description: string,
  previousValue?: string | null,
  newValue?: string | null,
  userId?: string | null
) {
  return prisma.vulnerabilityHistory.create({
    data: {
      vulnerabilityId,
      eventType,
      description,
      previousValue: previousValue ?? null,
      newValue: newValue ?? null,
      userId: userId ?? null,
    },
  });
}
