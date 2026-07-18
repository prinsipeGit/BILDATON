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

  console.log(`Seeded ${institution.name}, ${departments.length} departments, and ${staffEmail}.`);
} finally {
  await prisma.$disconnect();
}
