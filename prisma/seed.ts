import { PrismaClient, RoleName } from '@prisma/client';

const prisma = new PrismaClient();

const roles = [
  {
    name: RoleName.PROVIDER,
    displayName: 'Provider',
    description: 'Provider-level healthcare user.',
    isGlobal: false,
  },
  {
    name: RoleName.PRACTICE,
    displayName: 'Practice',
    description: 'Practice-level healthcare user.',
    isGlobal: false,
  },
  {
    name: RoleName.CARE_COORDINATOR,
    displayName: 'Care Coordinator',
    description: 'Coordinates care across assigned practices and providers.',
    isGlobal: false,
  },
  {
    name: RoleName.ACO_ADMIN,
    displayName: 'ACO Admin',
    description: 'Manages ACO-related practices and providers.',
    isGlobal: false,
  },
  {
    name: RoleName.CLIENT_ADMIN,
    displayName: 'Client Admin',
    description: 'Manages an organization/client scope.',
    isGlobal: false,
  },
  {
    name: RoleName.SUPER_ADMIN,
    displayName: 'Super Admin',
    description: 'Radeion-side business administration role.',
    isGlobal: true,
  },
  {
    name: RoleName.DEVELOPER,
    displayName: 'Developer',
    description: 'Radeion-side technical role with platform access.',
    isGlobal: true,
  },
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        name: role.name,
      },
      update: {
        displayName: role.displayName,
        description: role.description,
        isGlobal: role.isGlobal,
      },
      create: role,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
