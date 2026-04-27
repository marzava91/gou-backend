import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      firstName: 'Test',
      lastName: 'DB',
      displayName: 'Test DB',
      primaryEmail: 'integration-test@example.com',
      emailVerified: false,
      phoneVerified: false,
    },
  });

  console.log('User created:', user);

  const found = await prisma.user.findUnique({
    where: { id: user.id },
  });

  console.log('User found:', found);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });