import { PrismaClient, UserPlan, ArticleStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'test@seopen.dev' },
    update: {},
    create: {
      email: 'test@seopen.dev',
      name: 'Test User',
      passwordHash,
      plan: UserPlan.PRO,
    },
  });
  console.log('✅ User created:', user.email);

  // Create test project
  const project = await prisma.project.upsert({
    where: { id: 'seed-project-1' },
    update: {},
    create: {
      id: 'seed-project-1',
      name: 'Demo Blog',
      domain: 'demo.example.com',
      language: 'vi',
      userId: user.id,
    },
  });
  console.log('✅ Project created:', project.name);

  // Create test articles in different states
  const articles = [
    { title: 'Cách viết content SEO hiệu quả 2026', state: ArticleStatus.DRAFT, targetKeyword: 'viết content SEO' },
    { title: 'Top 10 công cụ SEO tốt nhất cho dân content', state: ArticleStatus.KEYWORD_ANALYZED, targetKeyword: 'công cụ SEO' },
    { title: 'Hướng dẫn tối ưu hóa bài viết cho AEO', state: ArticleStatus.CONTENT_WRITTEN, targetKeyword: 'tối ưu AEO' },
  ];

  for (const articleData of articles) {
    await prisma.article.create({
      data: {
        title: articleData.title,
        status: articleData.state,
        targetKeyword: articleData.targetKeyword,
        projectId: project.id,
        userId: user.id,
      },
    });
    console.log('✅ Article created:', articleData.title);
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
