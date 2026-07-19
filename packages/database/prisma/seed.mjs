import { PrismaClient, UserKind } from "@prisma/client";

const prisma = new PrismaClient();

const institutionName = process.env.SEED_INSTITUTION_NAME ?? "Areneo University";
const institutionSlug = process.env.SEED_INSTITUTION_SLUG ?? "areneo-university";
const externalAuthId = process.env.SEED_STAFF_EXTERNAL_AUTH_ID ?? "seed-registration-admin";
const staffEmail = process.env.SEED_STAFF_EMAIL ?? "registration-admin@example.test";

try {
  const institution = await prisma.institution.upsert({
    where: { slug: institutionSlug },
    update: { name: institutionName },
    create: { name: institutionName, slug: institutionSlug },
  });

  const departmentSeeds = [
    { name: "Registration", slug: "registration", routingDestination: "registration-queue", activationStatus: "READY" },
    { name: "IT Support", slug: "it-support", routingDestination: "it-support-queue", activationStatus: "READY" },
    { name: "Student Services", slug: "student-services", routingDestination: "student-services-queue", activationStatus: "PLANNED" },
    { name: "Finance", slug: "finance", routingDestination: "finance-queue", activationStatus: "PLANNED" },
    { name: "Academic Advising", slug: "academic-advising", routingDestination: "academic-advising-queue", activationStatus: "PLANNED" },
    { name: "Campus Health", slug: "campus-health", routingDestination: "campus-health-queue", activationStatus: "PLANNED" },
  ];
  const departments = await Promise.all(
    departmentSeeds.map(async (seed) => {
      const department = await prisma.department.upsert({
        where: { institutionId_slug: { institutionId: institution.id, slug: seed.slug } },
        update: { name: seed.name, enabled: true },
        create: { institutionId: institution.id, name: seed.name, slug: seed.slug },
      });
      await prisma.departmentConfiguration.upsert({
        where: { departmentId: department.id },
        update: { routingDestination: seed.routingDestination, activationStatus: seed.activationStatus },
        create: {
          departmentId: department.id,
          routingDestination: seed.routingDestination,
          activationStatus: seed.activationStatus,
        },
      });
      return department;
    }),
  );
  const registrationDepartment = departments.find((department) => department.slug === "registration");
  if (!registrationDepartment) throw new Error("Registration department seed was not created");

  const registrarDepartment = await prisma.department.upsert({
    where: {
      institutionId_slug: {
        institutionId: institution.id,
        slug: "registrar",
      },
    },
    update: { name: "Registrar", enabled: true },
    create: {
      institutionId: institution.id,
      name: "Registrar",
      slug: "registrar",
    },
  });

  const user = await prisma.user.upsert({
    where: {
      institutionId_externalAuthId: {
        institutionId: institution.id,
        externalAuthId,
      },
    },
    update: { email: staffEmail, active: true },
    create: {
      institutionId: institution.id,
      externalAuthId,
      email: staffEmail,
      kind: UserKind.SYSTEM_ADMIN,
    },
  });

  await prisma.staffProfile.upsert({
    where: { userId: user.id },
    update: { displayName: "Sample Administrator" },
    create: { userId: user.id, displayName: "Sample Administrator" },
  });

  await prisma.departmentMembership.upsert({
    where: {
      userId_departmentId: {
        userId: user.id,
        departmentId: registrationDepartment.id,
      },
    },
    update: { role: "ADMIN" },
    create: { userId: user.id, departmentId: registrationDepartment.id, role: "ADMIN" },
  });

  await prisma.chatbotRule.upsert({
    where: {
      institutionId_name: {
        institutionId: institution.id,
        name: "Published knowledge only",
      },
    },
    update: {
      instructions:
        "Answer only from active, published knowledge supplied by the system. If the knowledge is insufficient, clearly say you do not know and direct the student to university staff.",
      priority: 10,
      active: true,
    },
    create: {
      institutionId: institution.id,
      name: "Published knowledge only",
      instructions:
        "Answer only from active, published knowledge supplied by the system. If the knowledge is insufficient, clearly say you do not know and direct the student to university staff.",
      priority: 10,
      active: true,
    },
  });

  await prisma.chatbotRule.upsert({
    where: {
      institutionId_name: {
        institutionId: institution.id,
        name: "Be informative and action-oriented",
      },
    },
    update: {
      instructions:
        "Answer warmly and directly using published knowledge. Explain the useful next step instead of giving a bare refusal. When a fact is not confirmed, distinguish what is known from what still requires staff review.",
      priority: 15,
      active: true,
    },
    create: {
      institutionId: institution.id,
      name: "Be informative and action-oriented",
      instructions:
        "Answer warmly and directly using published knowledge. Explain the useful next step instead of giving a bare refusal. When a fact is not confirmed, distinguish what is known from what still requires staff review.",
      priority: 15,
      active: true,
    },
  });

  await prisma.chatbotRule.upsert({
    where: {
      institutionId_name: {
        institutionId: institution.id,
        name: "Protect private student data",
      },
    },
    update: {
      instructions:
        "Never reveal or claim access to grades, balances, holds, passwords, or other student-specific records from a Messenger identity alone.",
      priority: 20,
      active: true,
    },
    create: {
      institutionId: institution.id,
      name: "Protect private student data",
      instructions:
        "Never reveal or claim access to grades, balances, holds, passwords, or other student-specific records from a Messenger identity alone.",
      priority: 20,
      active: true,
    },
  });

  await prisma.chatbotRule.upsert({
    where: {
      institutionId_name: {
        institutionId: institution.id,
        name: "Registrar request boundaries",
      },
    },
    update: {
      instructions:
        "For a Registrar document request, Luca must collect the requested document, student last name, exactly 6 ID digits, and a valid email, then show a summary and require confirmation before submission. Submission is not approval, document release, or identity verification. Never ask for passwords, payment credentials, or document images in Messenger.",
      priority: 25,
      active: true,
    },
    create: {
      institutionId: institution.id,
      name: "Registrar request boundaries",
      instructions:
        "For a Registrar document request, Luca must collect the requested document, student last name, exactly 6 ID digits, and a valid email, then show a summary and require confirmation before submission. Submission is not approval, document release, or identity verification. Never ask for passwords, payment credentials, or document images in Messenger.",
      priority: 25,
      active: true,
    },
  });

  let welcomeDocument = await prisma.knowledgeDocument.findFirst({
    where: { institutionId: institution.id, title: "About Luca" },
  });
  welcomeDocument ??= await prisma.knowledgeDocument.create({
    data: {
      institutionId: institution.id,
      departmentId: registrationDepartment.id,
      title: "About Luca",
    },
  });
  await prisma.knowledgeVersion.upsert({
    where: { documentId_version: { documentId: welcomeDocument.id, version: 1 } },
    update: {
      status: "PUBLISHED",
      content:
        "Luca is the university's Messenger information assistant. Luca answers general questions using approved university knowledge. Luca cannot verify a student's identity through Messenger and cannot disclose private student records. When approved knowledge is insufficient, Luca directs the student to university staff.",
      effectiveFrom: new Date(),
      effectiveTo: null,
      approverUserId: user.id,
      approvedAt: new Date(),
    },
    create: {
      documentId: welcomeDocument.id,
      version: 1,
      status: "PUBLISHED",
      content:
        "Luca is the university's Messenger information assistant. Luca answers general questions using approved university knowledge. Luca cannot verify a student's identity through Messenger and cannot disclose private student records. When approved knowledge is insufficient, Luca directs the student to university staff.",
      effectiveFrom: new Date(),
      authorUserId: user.id,
      approverUserId: user.id,
      approvedAt: new Date(),
    },
  });

  let registrarDocument = await prisma.knowledgeDocument.findFirst({
    where: { institutionId: institution.id, title: "Registrar Requests Through Luca" },
  });
  registrarDocument ??= await prisma.knowledgeDocument.create({
    data: {
      institutionId: institution.id,
      departmentId: registrarDepartment.id,
      title: "Registrar Requests Through Luca",
    },
  });
  await prisma.knowledgeVersion.upsert({
    where: { documentId_version: { documentId: registrarDocument.id, version: 1 } },
    update: {
      status: "PUBLISHED",
      content:
        "Luca can create a Registrar document request through Messenger by collecting the requested document, student last name, 6-digit student ID number, and email address. Luca validates the details, shows a summary, and submits only after the student confirms. A submitted request enters the Registrar staff-review queue and receives a reference number. Submission does not mean the document is approved or released. When staff marks the request ready for pickup, Luca sends a Messenger notification to the student. Staff may require identity verification through an approved university channel. Students should never send passwords, payment credentials, or document images through Messenger.",
      effectiveFrom: new Date(),
      effectiveTo: null,
      approverUserId: user.id,
      approvedAt: new Date(),
    },
    create: {
      documentId: registrarDocument.id,
      version: 1,
      status: "PUBLISHED",
      content:
        "Luca can create a Registrar document request through Messenger by collecting the requested document, student last name, 6-digit student ID number, and email address. Luca validates the details, shows a summary, and submits only after the student confirms. A submitted request enters the Registrar staff-review queue and receives a reference number. Submission does not mean the document is approved or released. When staff marks the request ready for pickup, Luca sends a Messenger notification to the student. Staff may require identity verification through an approved university channel. Students should never send passwords, payment credentials, or document images through Messenger.",
      effectiveFrom: new Date(),
      authorUserId: user.id,
      approverUserId: user.id,
      approvedAt: new Date(),
    },
  });

  console.log(`Seeded ${institution.name}, ${departments.length + 1} departments, chatbot rules, registrar knowledge, and ${staffEmail}.`);
} finally {
  await prisma.$disconnect();
}
