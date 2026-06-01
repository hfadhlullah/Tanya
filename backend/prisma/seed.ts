import { PrismaClient, SensitiveRuleScope } from '@prisma/client';

const prisma = new PrismaClient();

const baselineSensitiveRules = [
  { topic: 'kekerasan', pattern: 'jihad|perang|bom|membunuh|kekerasan' },
  { topic: 'takfir', pattern: 'kafirkan|takfir|murtadkan' },
  { topic: 'apostasy', pattern: 'murtad|keluar islam|pindah agama' },
  { topic: 'talak dan perceraian', pattern: 'talak|cerai|rujuk|iddah' },
  { topic: 'waris', pattern: 'waris|faraid|pembagian harta' },
  { topic: 'medis agama', pattern: 'obat|dokter|medis|bunuh diri|depresi' },
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const demoUserId = process.env.SEED_DEMO_USER_ID ?? 'demo-user';

  if (adminEmail) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: 'ADMIN' },
      create: {
        email: adminEmail,
        displayName: process.env.SEED_ADMIN_NAME ?? 'Tanya Admin',
        role: 'ADMIN',
      },
    });
  }

  await prisma.user.upsert({
    where: { id: demoUserId },
    update: {},
    create: {
      id: demoUserId,
      email: `${demoUserId}@tanya.local`,
      displayName: 'Demo User',
      role: 'USER',
    },
  });

  for (const rule of baselineSensitiveRules) {
    await prisma.sensitiveRule.upsert({
      where: {
        id: `global-${rule.topic}`,
      },
      update: {
        pattern: rule.pattern,
        isActive: true,
      },
      create: {
        id: `global-${rule.topic}`,
        scope: SensitiveRuleScope.GLOBAL,
        topic: rule.topic,
        pattern: rule.pattern,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
