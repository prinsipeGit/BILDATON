import { generateGroundedAnswer } from "@luca/ai";
import type { KnowledgeSource } from "@luca/ai";
import type { Prisma, PrismaClient } from "@luca/database";
import { processRegistrarRequest } from "./registrar-request.js";

interface ChatbotProcessorOptions {
  openAIApiKey: string;
  openAIModel: string;
  pageAccessToken: string;
  logError?: (error: unknown, message: string) => void;
}

interface InboundMessengerMessage {
  pageId: string;
  senderId: string;
  providerMessageId: string;
  text: string;
  sentAt: Date;
}

export class ChatbotProcessor {
  private running = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly options: ChatbotProcessorOptions
  ) {}

  async processPending(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const events = await this.prisma.webhookEvent.findMany({
        where: {
          provider: "META_MESSENGER",
          status: { in: ["RECEIVED", "RETRYABLE_FAILURE"] },
          attempts: { lt: 5 }
        },
        orderBy: { receivedAt: "asc" },
        take: 10
      });

      for (const event of events) {
        const claim = await this.prisma.webhookEvent.updateMany({
          where: { id: event.id, status: event.status, attempts: event.attempts },
          data: { status: "PROCESSING", attempts: { increment: 1 }, lastErrorCode: null }
        });
        if (claim.count === 0) continue;

        try {
          await this.processEvent(event.id, event.institutionId, event.payload);
        } catch (error) {
          this.options.logError?.(error, "Messenger chatbot processing failed");
          await this.prisma.webhookEvent.update({
            where: { id: event.id },
            data: { status: "RETRYABLE_FAILURE", lastErrorCode: getErrorCode(error) }
          });
        }
      }

      await this.processRegistrarStatusNotifications();
      await this.processReadyPickupNotifications();
    } finally {
      this.running = false;
    }
  }

  private async processEvent(
    webhookEventId: string,
    institutionId: string,
    payload: Prisma.JsonValue
  ): Promise<void> {
    const inbound = parseInboundMessengerMessage(payload);
    if (!inbound) {
      await this.markSucceeded(webhookEventId);
      return;
    }

    const identity = await this.prisma.messengerIdentity.upsert({
      where: {
        institutionId_pageId_senderId: {
          institutionId,
          pageId: inbound.pageId,
          senderId: inbound.senderId
        }
      },
      update: {},
      create: { institutionId, pageId: inbound.pageId, senderId: inbound.senderId }
    });
    const conversation =
      (await this.prisma.conversation.findFirst({
        where: { institutionId, messengerIdentityId: identity.id, channel: "MESSENGER", status: "OPEN" },
        orderBy: { updatedAt: "desc" }
      })) ??
      (await this.prisma.conversation.create({
        data: {
          institutionId,
          messengerIdentityId: identity.id,
          channel: "MESSENGER",
          status: "OPEN"
        }
      }));

    await this.prisma.message.upsert({
      where: {
        conversationId_providerMessageId: {
          conversationId: conversation.id,
          providerMessageId: inbound.providerMessageId
        }
      },
      update: {},
      create: {
        conversationId: conversation.id,
        providerMessageId: inbound.providerMessageId,
        senderKind: "STUDENT",
        content: inbound.text,
        sentAt: inbound.sentAt
      }
    });
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    });

    const registrarReply = await processRegistrarRequest(this.prisma, {
      institutionId,
      conversationId: conversation.id,
      messengerIdentityId: identity.id,
      text: inbound.text
    });
    if (registrarReply) {
      await this.sendRegistrarReply({
        webhookEventId,
        institutionId,
        conversationId: conversation.id,
        recipientId: inbound.senderId,
        requestId: registrarReply.requestId,
        text: registrarReply.text
      });
      return;
    }

    const [rules, sources] = await Promise.all([
      this.prisma.chatbotRule.findMany({
        where: { institutionId, active: true },
        orderBy: [{ priority: "asc" }, { name: "asc" }],
        select: { instructions: true }
      }),
      findRelevantKnowledge(this.prisma, institutionId, inbound.text)
    ]);
    const aiRun = await this.prisma.aiRun.create({
      data: {
        institutionId,
        conversationId: conversation.id,
        model: this.options.openAIModel,
        purpose: "MESSENGER_KNOWLEDGE_ANSWER",
        promptVersion: "messenger-grounded-v1",
        outcome: "PROCESSING",
        knowledgeVersionIds: sources.map((source) => source.id)
      }
    });

    try {
      const answer = await generateGroundedAnswer({
        apiKey: this.options.openAIApiKey,
        model: this.options.openAIModel,
        userMessage: inbound.text,
        rules: rules.map((rule) => rule.instructions),
        sources
      });
      const replyText = answer.text.slice(0, 1_900);
      const citations = sources.map(({ id, title }) => ({ knowledgeVersionId: id, title }));
      const replyMessage = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderKind: "AI",
          content: replyText,
          sentAt: new Date(),
          aiRunId: aiRun.id,
          citations
        }
      });
      const delivery = await this.prisma.outboundDelivery.create({
        data: {
          institutionId,
          conversationId: conversation.id,
          messageId: replyMessage.id,
          provider: "META_MESSENGER",
          recipientAddress: inbound.senderId,
          idempotencyKey: `ai-reply:${aiRun.id}`,
          status: "PROCESSING",
          attempts: 1
        }
      });

      const providerMessageId = await sendMessengerText(
        this.options.pageAccessToken,
        inbound.senderId,
        replyText
      );
      await this.prisma.$transaction([
        this.prisma.message.update({
          where: { id: replyMessage.id },
          data: { providerMessageId }
        }),
        this.prisma.outboundDelivery.update({
          where: { id: delivery.id },
          data: { status: "DELIVERED", deliveredAt: new Date() }
        }),
        this.prisma.aiRun.update({
          where: { id: aiRun.id },
          data: { outcome: "SUCCEEDED", responseId: answer.responseId, completedAt: new Date() }
        }),
        this.prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: { status: "SUCCEEDED", processedAt: new Date(), lastErrorCode: null }
        })
      ]);
    } catch (error) {
      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: { outcome: "FAILED", errorCode: getErrorCode(error), completedAt: new Date() }
      });
      throw error;
    }
  }

  private async markSucceeded(webhookEventId: string): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: "SUCCEEDED", processedAt: new Date(), lastErrorCode: null }
    });
  }

  private async sendRegistrarReply(input: {
    webhookEventId: string;
    institutionId: string;
    conversationId: string;
    recipientId: string;
    requestId: string;
    text: string;
  }): Promise<void> {
    const replyMessage = await this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        senderKind: "AI",
        content: input.text,
        sentAt: new Date(),
        citations: [{ registrarRequestId: input.requestId }]
      }
    });
    const delivery = await this.prisma.outboundDelivery.create({
      data: {
        institutionId: input.institutionId,
        conversationId: input.conversationId,
        messageId: replyMessage.id,
        provider: "META_MESSENGER",
        recipientAddress: input.recipientId,
        idempotencyKey: `registrar-reply:${input.webhookEventId}`,
        status: "PROCESSING",
        attempts: 1
      }
    });
    const providerMessageId = await sendMessengerText(
      this.options.pageAccessToken,
      input.recipientId,
      input.text
    );
    await this.prisma.$transaction([
      this.prisma.message.update({
        where: { id: replyMessage.id },
        data: { providerMessageId }
      }),
      this.prisma.outboundDelivery.update({
        where: { id: delivery.id },
        data: { status: "DELIVERED", deliveredAt: new Date() }
      }),
      this.prisma.webhookEvent.update({
        where: { id: input.webhookEventId },
        data: { status: "SUCCEEDED", processedAt: new Date(), lastErrorCode: null }
      })
    ]);
  }

  async processReadyPickupNotifications(): Promise<void> {
    const requests = await this.prisma.registrarRequest.findMany({
      where: { status: "READY_FOR_PICKUP", readyNotifiedAt: null },
      orderBy: { updatedAt: "asc" },
      take: 10,
      select: {
        id: true,
        institutionId: true,
        conversationId: true,
        referenceNumber: true,
        documentType: true,
        messengerIdentity: { select: { senderId: true } }
      }
    });

    for (const request of requests) {
      const idempotencyKey = `registrar-ready:${request.id}`;
      let deliveryId: string | undefined;
      try {
        let delivery = await this.prisma.outboundDelivery.findUnique({
          where: {
            provider_idempotencyKey: {
              provider: "META_MESSENGER",
              idempotencyKey
            }
          },
          include: { message: true }
        });
        if (delivery?.status === "DELIVERED") {
          await this.prisma.registrarRequest.update({
            where: { id: request.id },
            data: { readyNotifiedAt: delivery.deliveredAt ?? new Date() }
          });
          continue;
        }

        const text = readyForPickupMessage(request.documentType, request.referenceNumber);
        if (!delivery) {
          const message = await this.prisma.message.create({
            data: {
              conversationId: request.conversationId,
              senderKind: "AI",
              content: text,
              sentAt: new Date(),
              citations: [{ registrarRequestId: request.id, notification: "READY_FOR_PICKUP" }]
            }
          });
          delivery = await this.prisma.outboundDelivery.create({
            data: {
              institutionId: request.institutionId,
              conversationId: request.conversationId,
              messageId: message.id,
              provider: "META_MESSENGER",
              recipientAddress: request.messengerIdentity.senderId,
              idempotencyKey,
              status: "PROCESSING",
              attempts: 1
            },
            include: { message: true }
          });
        } else {
          delivery = await this.prisma.outboundDelivery.update({
            where: { id: delivery.id },
            data: {
              status: "PROCESSING",
              attempts: { increment: 1 },
              lastErrorCode: null
            },
            include: { message: true }
          });
        }
        deliveryId = delivery.id;

        const providerMessageId = await sendMessengerText(
          this.options.pageAccessToken,
          request.messengerIdentity.senderId,
          delivery.message.content
        );
        const notifiedAt = new Date();
        await this.prisma.$transaction([
          this.prisma.message.update({
            where: { id: delivery.messageId },
            data: { providerMessageId, sentAt: notifiedAt }
          }),
          this.prisma.outboundDelivery.update({
            where: { id: delivery.id },
            data: { status: "DELIVERED", deliveredAt: notifiedAt, lastErrorCode: null }
          }),
          this.prisma.registrarRequest.update({
            where: { id: request.id },
            data: { readyNotifiedAt: notifiedAt }
          })
        ]);
      } catch (error) {
        this.options.logError?.(error, "Registrar pickup notification failed");
        if (deliveryId) {
          await this.prisma.outboundDelivery.update({
            where: { id: deliveryId },
            data: { status: "RETRYABLE_FAILURE", lastErrorCode: getErrorCode(error) }
          });
        }
      }
    }
  }

  async processRegistrarStatusNotifications(): Promise<void> {
    const events = await this.prisma.registrarStatusEvent.findMany({
      where: {
        notifiedAt: null,
        toStatus: { in: ["APPROVED", "PROCESSING", "READY_FOR_PICKUP"] }
      },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: {
        id: true,
        toStatus: true,
        registrarRequest: {
          select: {
            id: true,
            institutionId: true,
            conversationId: true,
            referenceNumber: true,
            documentType: true,
            messengerIdentity: { select: { senderId: true } }
          }
        }
      }
    });

    for (const event of events) {
      const request = event.registrarRequest;
      const notificationStatus = event.toStatus as "APPROVED" | "PROCESSING" | "READY_FOR_PICKUP";
      const idempotencyKey = `registrar-status:${event.id}`;
      let deliveryId: string | undefined;
      try {
        let delivery = await this.prisma.outboundDelivery.findUnique({
          where: {
            provider_idempotencyKey: {
              provider: "META_MESSENGER",
              idempotencyKey
            }
          },
          include: { message: true }
        });

        if (delivery?.status === "DELIVERED") {
          const notifiedAt = delivery.deliveredAt ?? new Date();
          await this.prisma.registrarStatusEvent.update({
            where: { id: event.id },
            data: { notifiedAt }
          });
          if (event.toStatus === "READY_FOR_PICKUP") {
            await this.prisma.registrarRequest.update({
              where: { id: request.id },
              data: { readyNotifiedAt: notifiedAt }
            });
          }
          continue;
        }

        const text = registrarStatusMessage(
          notificationStatus,
          request.documentType,
          request.referenceNumber
        );
        if (!delivery) {
          const message = await this.prisma.message.create({
            data: {
              conversationId: request.conversationId,
              senderKind: "AI",
              content: text,
              sentAt: new Date(),
              citations: [{
                registrarRequestId: request.id,
                registrarStatusEventId: event.id,
                notification: event.toStatus
              }]
            }
          });
          delivery = await this.prisma.outboundDelivery.create({
            data: {
              institutionId: request.institutionId,
              conversationId: request.conversationId,
              messageId: message.id,
              provider: "META_MESSENGER",
              recipientAddress: request.messengerIdentity.senderId,
              idempotencyKey,
              status: "PROCESSING",
              attempts: 1
            },
            include: { message: true }
          });
        } else {
          delivery = await this.prisma.outboundDelivery.update({
            where: { id: delivery.id },
            data: {
              status: "PROCESSING",
              attempts: { increment: 1 },
              lastErrorCode: null
            },
            include: { message: true }
          });
        }
        deliveryId = delivery.id;

        const providerMessageId = await sendMessengerText(
          this.options.pageAccessToken,
          request.messengerIdentity.senderId,
          delivery.message.content
        );
        const notifiedAt = new Date();
        await this.prisma.$transaction([
          this.prisma.message.update({
            where: { id: delivery.messageId },
            data: { providerMessageId, sentAt: notifiedAt }
          }),
          this.prisma.outboundDelivery.update({
            where: { id: delivery.id },
            data: { status: "DELIVERED", deliveredAt: notifiedAt, lastErrorCode: null }
          }),
          this.prisma.registrarStatusEvent.update({
            where: { id: event.id },
            data: { notifiedAt }
          }),
          ...(notificationStatus === "READY_FOR_PICKUP"
            ? [this.prisma.registrarRequest.update({
                where: { id: request.id },
                data: { readyNotifiedAt: notifiedAt }
              })]
            : [])
        ]);
      } catch (error) {
        this.options.logError?.(error, "Registrar status notification failed");
        if (deliveryId) {
          await this.prisma.outboundDelivery.update({
            where: { id: deliveryId },
            data: { status: "RETRYABLE_FAILURE", lastErrorCode: getErrorCode(error) }
          });
        }
      }
    }
  }
}

export function parseInboundMessengerMessage(payload: unknown): InboundMessengerMessage | null {
  if (!isObject(payload) || typeof payload.pageId !== "string" || !isObject(payload.event)) {
    return null;
  }
  const event = payload.event;
  if (!isObject(event.sender) || typeof event.sender.id !== "string") return null;
  if (!isObject(event.message) || event.message.is_echo === true) return null;
  if (typeof event.message.mid !== "string" || typeof event.message.text !== "string") return null;
  const text = event.message.text.trim();
  if (!text) return null;
  const timestamp = typeof event.timestamp === "number" ? event.timestamp : Date.now();
  return {
    pageId: payload.pageId,
    senderId: event.sender.id,
    providerMessageId: event.message.mid,
    text,
    sentAt: new Date(timestamp)
  };
}

export async function findRelevantKnowledge(
  prisma: PrismaClient,
  institutionId: string,
  question: string
): Promise<KnowledgeSource[]> {
  const now = new Date();
  const versions = await prisma.knowledgeVersion.findMany({
    where: {
      document: { institutionId },
      status: "PUBLISHED",
      AND: [
        { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
        { OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }
      ]
    },
    select: { id: true, content: true, document: { select: { title: true } } },
    take: 50
  });
  const keywords = getKeywords(question);
  return versions
    .map((version) => ({
      id: version.id,
      title: version.document.title,
      content: version.content.slice(0, 4_000),
      score: scoreKnowledge(`${version.document.title} ${version.content}`, keywords)
    }))
    .filter((source) => source.score > 0 || versions.length <= 8)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map((source) => ({ id: source.id, title: source.title, content: source.content }));
}

function getKeywords(question: string): string[] {
  return [...new Set(question.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])].slice(0, 20);
}

function scoreKnowledge(content: string, keywords: readonly string[]): number {
  const normalized = content.toLowerCase();
  return keywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0);
}

async function sendMessengerText(
  pageAccessToken: string,
  recipientId: string,
  text: string
): Promise<string> {
  const response = await fetch("https://graph.facebook.com/v25.0/me/messages", {
    method: "POST",
    headers: {
      authorization: `Bearer ${pageAccessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      messaging_type: "RESPONSE",
      recipient: { id: recipientId },
      message: { text }
    })
  });
  const body = (await response.json()) as unknown;
  if (!response.ok || !isObject(body) || typeof body.message_id !== "string") {
    throw new Error(`META_SEND_FAILED_${response.status}`);
  }
  return body.message_id;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorCode(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 120);
  return "UNKNOWN_ERROR";
}

export function readyForPickupMessage(documentType: string | null, referenceNumber: string): string {
  return [
    `Good news—your ${documentType ?? "requested document"} is ready for pickup from the Registrar.`,
    `Reference: ${referenceNumber}`,
    "Please follow the Registrar’s official pickup and identity-verification requirements. Bring your reference number and a valid ID."
  ].join("\n\n");
}

export function registrarStatusMessage(
  status: "APPROVED" | "PROCESSING" | "READY_FOR_PICKUP",
  documentType: string | null,
  referenceNumber: string
): string {
  const documentName = documentType ?? "document";
  if (status === "APPROVED") {
    return [
      `Update: Your ${documentName} request has been approved by the Registrar.`,
      `Reference: ${referenceNumber}`,
      "It will now move to processing. Luca will message you again when its status changes."
    ].join("\n\n");
  }
  if (status === "PROCESSING") {
    return [
      `Update: The Registrar is now processing your ${documentName} request.`,
      `Reference: ${referenceNumber}`,
      "It is not ready for pickup yet. Luca will notify you when it is ready."
    ].join("\n\n");
  }
  return readyForPickupMessage(documentType, referenceNumber);
}
