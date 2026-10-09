import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Programs
  await prisma.program.upsert({
    where: { code: 'TALQIN' },
    update: {},
    create: {
      code: 'TALQIN', sortOrder: 1,
      titleAr: 'برنامج التلقين وتيسير الأداء',
      titleAm: 'የተልቂን እና የአፈጻጸም ማሻሻያ ፕሮግራም',
      titleEn: 'Talqin & Recitation Improvement',
      descAr: 'برنامج مخصص لتيسير قراءة الطالب وضبط أدائه في تلاوة القرآن الكريم.',
      descAm: 'ተማሪው ቁርአንን በትክክል እንዲያነብ የሚረዳ ፕሮግራም።',
      descEn: 'A program dedicated to facilitating the student\'s reading and refining recitation.',
    },
  });

  await prisma.program.upsert({
    where: { code: 'HIFZ' },
    update: {},
    create: {
      code: 'HIFZ', sortOrder: 2,
      titleAr: 'حفظ القرآن الكريم كاملاً',
      titleAm: 'የቁርአን ሙሉ ሒፍዝ',
      titleEn: 'Complete Quran Memorization',
      descAr: 'يشمل الحفظ الجديد، والتلاوة على الشيخ، ومراجعة المحفوظ، والاختبارات الدورية.',
      descAm: 'አዲስ ሒፍዝ፣ ለሼኽ ማንበብ፣ የቀድሞ ሒፍዝ መከለስ ያካትታል።',
      descEn: 'Includes new memorization, recitation to the Sheikh, revision, and exams.',
    },
  });

  await prisma.program.upsert({
    where: { code: 'IJAZAH_HAFS' },
    update: {},
    create: {
      code: 'IJAZAH_HAFS', sortOrder: 3,
      titleAr: 'الإجازة برواية حفص عن عاصم',
      titleAm: 'በሐፍስ ከዓሲም ሪዋያ ኢጃዛህ',
      titleEn: "Ijazah in Hafs 'an Asim",
      descAr: 'يقدّم الطالب تلاوته وحفظه على مقرئ مجاز حتى استيفاء الشروط.',
      descAm: 'ተማሪው ንባቡንና ሒፍዙን ለብቁ መቅሪእ እያቀረበ ሁሉንም ሁኔታዎች ሲያሟላ ኢጃዛህ ይሰጠዋል።',
      descEn: 'The student presents recitation and memorization until conditions are fulfilled.',
    },
  });

  // Groups
  const groups = [
    { code: 'MALE_MORNING',   gender: 'MALE',   period: 'MORNING',   daysOfWeek: [2,3,4], startTime: '09:00', endTime: '12:00', titleAr: 'مجموعة الرجال الصباحية', titleAm: 'የወንዶች ጠዋት ቡድን', titleEn: 'Male Morning Group' },
    { code: 'MALE_AFTERNOON', gender: 'MALE',   period: 'AFTERNOON', daysOfWeek: [2,3,4], startTime: '14:00', endTime: '15:30', titleAr: 'مجموعة الرجال الظهرية', titleAm: 'የወንዶች ከሰዓት ቡድን', titleEn: 'Male Afternoon Group' },
    { code: 'MALE_NIGHT',     gender: 'MALE',   period: 'NIGHT',     daysOfWeek: [2,3,4], startTime: '21:00', endTime: '23:00', titleAr: 'مجموعة الرجال الليلية', titleAm: 'የወንዶች ማታ ቡድን', titleEn: 'Male Night Group' },
    { code: 'FEMALE_MORNING', gender: 'FEMALE', period: 'MORNING',   daysOfWeek: [6,0,1], startTime: '09:00', endTime: '12:00', titleAr: 'مجموعة النساء الصباحية', titleAm: 'የሴቶች ጠዋት ቡድን', titleEn: 'Female Morning Group' },
    { code: 'FEMALE_AFTERNOON', gender: 'FEMALE', period: 'AFTERNOON', daysOfWeek: [6,0,1], startTime: '14:00', endTime: '15:30', titleAr: 'مجموعة النساء الظهرية', titleAm: 'የሴቶች ከሰዓት ቡድን', titleEn: 'Female Afternoon Group' },
    { code: 'FEMALE_NIGHT',   gender: 'FEMALE', period: 'NIGHT',     daysOfWeek: [6,0,1], startTime: '21:00', endTime: '23:00', titleAr: 'مجموعة النساء الليلية', titleAm: 'የሴቶች ማታ ቡድን', titleEn: 'Female Night Group' },
  ];
  for (const g of groups) {
    await prisma.group.upsert({ where: { code: g.code }, update: {}, create: g });
  }

  // Packages
  const packages = [
    { code: 'PKG_100',  minutes: 100,  priceEtb: 500,  sortOrder: 1 },
    { code: 'PKG_200',  minutes: 200,  priceEtb: 1000, sortOrder: 2 },
    { code: 'PKG_300',  minutes: 300,  priceEtb: 1470, sortOrder: 3 },
    { code: 'PKG_400',  minutes: 400,  priceEtb: 1920, sortOrder: 4 },
    { code: 'PKG_500',  minutes: 500,  priceEtb: 2350, sortOrder: 5 },
    { code: 'PKG_600',  minutes: 600,  priceEtb: 2760, sortOrder: 6 },
    { code: 'PKG_1000', minutes: 1000, priceEtb: 4500, sortOrder: 7 },
  ];
  for (const p of packages) {
    await prisma.package.upsert({ where: { code: p.code }, update: {}, create: p });
  }

  // Categories
  const cats = [
    { code: 'TAJWEED', titleAr: 'التجويد',   titleAm: 'ተጅዊድ',   titleEn: 'Tajweed',   sortOrder: 1 },
    { code: 'QIRAAT',  titleAr: 'القراءات',  titleAm: 'ቂራአት',   titleEn: "Qira'at",   sortOrder: 2 },
    { code: 'HIFZ',    titleAr: 'الحفظ',     titleAm: 'ሒፍዝ',     titleEn: 'Hifz',      sortOrder: 3 },
    { code: 'TALQIN',  titleAr: 'التلقين',   titleAm: 'ተልቂን',   titleEn: 'Talqin',    sortOrder: 4 },
    { code: 'ARABIC',  titleAr: 'العربية',   titleAm: 'ዓረብኛ',   titleEn: 'Arabic',    sortOrder: 5 },
    { code: 'SUPPORT', titleAr: 'مراجع مساندة', titleAm: 'ረዳት ማጣቀሻዎች', titleEn: 'Supporting Resources', sortOrder: 6 },
  ];
  for (const c of cats) {
    await prisma.resourceCategory.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  console.log('✅ Seed complete');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });