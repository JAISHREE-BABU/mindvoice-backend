import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LANGUAGES = [
  { code: 'en', name: 'English', flagEmoji: '🇬🇧' },
  { code: 'es', name: 'Spanish', flagEmoji: '🇪🇸' },
  { code: 'fr', name: 'French', flagEmoji: '🇫🇷' },
  { code: 'de', name: 'German', flagEmoji: '🇩🇪' },
  { code: 'ja', name: 'Japanese', flagEmoji: '🇯🇵' },
  { code: 'hi', name: 'Hindi', flagEmoji: '🇮🇳' },
];

const LESSONS = [
  {
    title: 'Greetings',
    description: 'Learn how to say hello and introduce yourself.',
    targetLanguageCode: 'es',
    difficulty: 'A1' as const,
    xpReward: 20,
    orderIndex: 1,
    vocabItems: [
      { phrase: 'Hola', translation: 'Hello', orderIndex: 1 },
      { phrase: 'Buenos días', translation: 'Good morning', orderIndex: 2 },
      { phrase: 'Me llamo...', translation: 'My name is...', orderIndex: 3 },
      { phrase: '¿Cómo estás?', translation: 'How are you?', orderIndex: 4 },
    ],
  },
  {
    title: 'Ordering Food',
    description: 'Phrases for ordering at a restaurant or cafe.',
    targetLanguageCode: 'es',
    difficulty: 'A1' as const,
    xpReward: 20,
    orderIndex: 2,
    vocabItems: [
      { phrase: 'Quiero...', translation: 'I want...', orderIndex: 1 },
      { phrase: 'La cuenta, por favor', translation: 'The bill, please', orderIndex: 2 },
      { phrase: 'Un café con leche', translation: 'A coffee with milk', orderIndex: 3 },
      { phrase: '¿Qué recomienda?', translation: 'What do you recommend?', orderIndex: 4 },
    ],
  },
  {
    title: 'Numbers 1-10',
    description: 'Basic counting from one to ten.',
    targetLanguageCode: 'es',
    difficulty: 'A1' as const,
    xpReward: 15,
    orderIndex: 3,
    vocabItems: [
      { phrase: 'Uno', translation: 'One', orderIndex: 1 },
      { phrase: 'Dos', translation: 'Two', orderIndex: 2 },
      { phrase: 'Tres', translation: 'Three', orderIndex: 3 },
      { phrase: 'Cuatro', translation: 'Four', orderIndex: 4 },
      { phrase: 'Cinco', translation: 'Five', orderIndex: 5 },
    ],
  },
];

async function main() {
  for (const lang of LANGUAGES) {
    await prisma.language.upsert({ where: { code: lang.code }, update: {}, create: lang });
  }
  console.log('Seeded languages.');

  for (const lesson of LESSONS) {
    const existing = await prisma.lesson.findFirst({ where: { title: lesson.title, targetLanguageCode: lesson.targetLanguageCode } });
    if (existing) {
      console.log(`Lesson "${lesson.title}" already exists, skipping.`);
      continue;
    }
    await prisma.lesson.create({
      data: {
        title: lesson.title,
        description: lesson.description,
        targetLanguageCode: lesson.targetLanguageCode,
        difficulty: lesson.difficulty,
        xpReward: lesson.xpReward,
        orderIndex: lesson.orderIndex,
        vocabItems: {
          create: lesson.vocabItems,
        },
      },
    });
    console.log(`Created lesson "${lesson.title}".`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());