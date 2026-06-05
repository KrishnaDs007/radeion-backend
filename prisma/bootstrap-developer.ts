import 'dotenv/config';
import { PrismaClient, RoleName, ScopeType, UserStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

async function main() {
  const supabaseUrl = getRequiredEnv('SUPABASE_URL');
  const supabaseSecretKey = getRequiredEnv('SUPABASE_SECRET_KEY');
  const requestedEmail = process.argv[2] ?? process.env.FIRST_DEVELOPER_EMAIL;

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { users },
    error,
  } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (error) {
    throw error;
  }

  const verifiedUsers = users.filter((user) => user.email_confirmed_at);
  const selectedUser = requestedEmail
    ? verifiedUsers.find(
        (user) => user.email?.toLowerCase() === requestedEmail.toLowerCase(),
      )
    : verifiedUsers.length === 1
      ? verifiedUsers[0]
      : undefined;

  if (!selectedUser?.email) {
    throw new Error(
      requestedEmail
        ? `No verified Supabase Auth user found for ${requestedEmail}.`
        : 'Exactly one verified Supabase Auth user is required, or pass an email argument.',
    );
  }

  const developerRole = await prisma.role.findUniqueOrThrow({
    where: {
      name: RoleName.DEVELOPER,
    },
  });

  const profile = await prisma.profile.upsert({
    where: {
      authUserId: selectedUser.id,
    },
    update: {
      email: selectedUser.email,
      status: UserStatus.ACTIVE,
    },
    create: {
      authUserId: selectedUser.id,
      email: selectedUser.email,
      status: UserStatus.ACTIVE,
    },
  });

  const existingAssignment = await prisma.userRoleAssignment.findFirst({
    where: {
      profileId: profile.id,
      roleId: developerRole.id,
      scopeType: ScopeType.GLOBAL,
      revokedAt: null,
    },
  });

  if (!existingAssignment) {
    await prisma.userRoleAssignment.create({
      data: {
        profileId: profile.id,
        roleId: developerRole.id,
        scopeType: ScopeType.GLOBAL,
      },
    });
  }

  console.log(`Developer profile ready for ${selectedUser.email}.`);
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
