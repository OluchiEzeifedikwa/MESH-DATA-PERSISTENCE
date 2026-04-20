import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

async function seed() {
  const filePath = resolve(__dirname, '../data/profiles.json');
  const profiles = JSON.parse(readFileSync(filePath, 'utf-8'));

  const result = await prisma.profile.createMany({
    data: profiles,
    skipDuplicates: true,
  });

  console.log(`Seed complete — created: ${result.count}, skipped (duplicates): ${profiles.length - result.count}`);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
