import { PrismaClient, UserKind } from "@prisma/client";

const prisma = new PrismaClient();

const institutionName = process.env.SEED_INSTITUTION_NAME ?? "Areneo University";
const institutionSlug = process.env.SEED_INSTITUTION_SLUG ?? "areneo-university";
const externalAuthId = process.env.SEED_STAFF_EXTERNAL_AUTH_ID ?? "seed-it-admin";
const staffEmail = process.env.SEED_STAFF_EMAIL ?? "it-admin@example.test";

try {
  const institution = await prisma.institution.upsert({
    where: { slug: institutionSlug },
    update: { name: institutionName },
    create: { name: institutionName, slug: institutionSlug },
  });

  const department = await prisma.department.upsert({
    where: {
      institutionId_slug: {
        institutionId: institution.id,
        slug: "it-support",
      },
    },
    update: { name: "IT Support", enabled: true },
    create: {
      institutionId: institution.id,
      name: "IT Support",
      slug: "it-support",
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
        departmentId: department.id,
      },
    },
    update: { role: "ADMIN" },
    create: { userId: user.id, departmentId: department.id, role: "ADMIN" },
  });

  console.log(`Seeded ${institution.name}, ${department.name}, and ${staffEmail}.`);
} finally {
  await prisma.$disconnect();
}
