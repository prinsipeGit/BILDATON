import type { PrismaClient } from "@luca/database";

const FAILED_PROCESSING_STATUSES = ["RETRYABLE_FAILURE", "PERMANENT_FAILURE"] as const;

export async function getAdminDashboard(prisma: PrismaClient) {
  const institution = await prisma.institution.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true }
  });

  if (!institution) {
    return emptyDashboard();
  }

  const institutionId = institution.id;
  const [
    conversationCount,
    studentMessageCount,
    aiReplyCount,
    failedWebhookCount,
    failedDeliveryCount,
    deliveredCount,
    publishedKnowledgeCount,
    activeRuleCount,
    pendingRegistrarRequestCount,
    conversations,
    registrarRequests,
    aiRuns,
    webhookAlerts,
    deliveryAlerts,
    rules,
    knowledge
  ] = await Promise.all([
    prisma.conversation.count({ where: { institutionId } }),
    prisma.message.count({
      where: { conversation: { institutionId }, senderKind: "STUDENT" }
    }),
    prisma.message.count({
      where: { conversation: { institutionId }, senderKind: "AI" }
    }),
    prisma.webhookEvent.count({
      where: { institutionId, status: { in: [...FAILED_PROCESSING_STATUSES] } }
    }),
    prisma.outboundDelivery.count({
      where: { institutionId, status: { in: [...FAILED_PROCESSING_STATUSES] } }
    }),
    prisma.outboundDelivery.count({ where: { institutionId, status: "DELIVERED" } }),
    prisma.knowledgeVersion.count({
      where: { document: { institutionId }, status: "PUBLISHED" }
    }),
    prisma.chatbotRule.count({ where: { institutionId, active: true } }),
    prisma.registrarRequest.count({
      where: {
        institutionId,
        status: { in: ["SUBMITTED", "IN_REVIEW", "NEEDS_INFORMATION", "APPROVED", "PROCESSING"] }
      }
    }),
    prisma.conversation.findMany({
      where: { institutionId },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        status: true,
        channel: true,
        updatedAt: true,
        messengerIdentity: { select: { senderId: true } },
        messages: {
          orderBy: { sentAt: "desc" },
          take: 4,
          select: {
            id: true,
            senderKind: true,
            content: true,
            sentAt: true,
            citations: true
          }
        }
      }
    }),
    prisma.registrarRequest.findMany({
      where: {
        institutionId,
        status: { notIn: ["DRAFT", "CANCELLED"] }
      },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        referenceNumber: true,
        kind: true,
        status: true,
        documentType: true,
        studentLastName: true,
        studentIdNumber: true,
        studentEmail: true,
        appointmentPurpose: true,
        preferredSchedule: true,
        submittedAt: true,
        readyNotifiedAt: true,
        createdAt: true,
        statusEvents: {
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            actorId: true,
            notifiedAt: true,
            createdAt: true
          }
        },
        messengerIdentity: { select: { senderId: true } }
      }
    }),
    prisma.aiRun.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        model: true,
        purpose: true,
        outcome: true,
        errorCode: true,
        createdAt: true,
        completedAt: true,
        knowledgeVersionIds: true
      }
    }),
    prisma.webhookEvent.findMany({
      where: { institutionId, status: { in: [...FAILED_PROCESSING_STATUSES] } },
      orderBy: { receivedAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        attempts: true,
        lastErrorCode: true,
        receivedAt: true
      }
    }),
    prisma.outboundDelivery.findMany({
      where: { institutionId, status: { in: [...FAILED_PROCESSING_STATUSES] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        attempts: true,
        lastErrorCode: true,
        createdAt: true
      }
    }),
    prisma.chatbotRule.findMany({
      where: { institutionId },
      orderBy: [{ active: "desc" }, { priority: "asc" }],
      select: { id: true, name: true, instructions: true, priority: true, active: true }
    }),
    prisma.knowledgeVersion.findMany({
      where: { document: { institutionId }, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        version: true,
        status: true,
        effectiveFrom: true,
        effectiveTo: true,
        createdAt: true,
        document: { select: { title: true } }
      }
    })
  ]);

  const totalDeliveries = deliveredCount + failedDeliveryCount;

  return {
    generatedAt: new Date(),
    institution: { name: institution.name },
    metrics: {
      conversations: conversationCount,
      studentMessages: studentMessageCount,
      aiReplies: aiReplyCount,
      activeAlerts: failedWebhookCount + failedDeliveryCount,
      publishedKnowledge: publishedKnowledgeCount,
      activeRules: activeRuleCount,
      pendingRegistrarRequests: pendingRegistrarRequestCount,
      deliveryRate: totalDeliveries === 0 ? null : Math.round((deliveredCount / totalDeliveries) * 100)
    },
    conversations: conversations.map((conversation) => ({
      ...conversation,
      participant: maskMessengerId(conversation.messengerIdentity?.senderId),
      messengerIdentity: undefined,
      messages: [...conversation.messages].reverse()
    })),
    registrarRequests: registrarRequests.map((request) => ({
      ...request,
      participant: maskMessengerId(request.messengerIdentity.senderId),
      messengerIdentity: undefined
    })),
    aiRuns,
    alerts: [
      ...webhookAlerts.map((alert) => ({ ...alert, kind: "Webhook", occurredAt: alert.receivedAt })),
      ...deliveryAlerts.map((alert) => ({ ...alert, kind: "Delivery", occurredAt: alert.createdAt }))
    ]
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
      .slice(0, 10),
    rules,
    knowledge
  };
}

function maskMessengerId(senderId?: string): string {
  if (!senderId) return "Messenger visitor";
  return `Messenger visitor •••${senderId.slice(-4)}`;
}

function emptyDashboard() {
  return {
    generatedAt: new Date(),
    institution: { name: "Luca" },
    metrics: {
      conversations: 0,
      studentMessages: 0,
      aiReplies: 0,
      activeAlerts: 0,
      publishedKnowledge: 0,
      activeRules: 0,
      pendingRegistrarRequests: 0,
      deliveryRate: null
    },
    conversations: [],
    registrarRequests: [],
    aiRuns: [],
    alerts: [],
    rules: [],
    knowledge: []
  };
}
