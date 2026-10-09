// Islamic / Quran terminology map — DO NOT mistranslate.
// Amharic preserves Arabic-derived Islamic terms used by Ethiopian Muslims.

export const TERM = {
  IJAZAH: {
    ar: 'إجازة',
    am: 'ኢጃዛህ',         // transliterated — established usage
    en: 'Ijazah',
  },
  SANAD: {
    ar: 'السند',
    am: 'ሰነድ (ሰንሰለት ኢጃዛህ)', // explanatory, preserves term
    en: 'Sanad',
  },
  MAQRAH: {
    ar: 'المقرأة',
    am: 'መቅራአህ (የቁርአን ማስተማሪያ ማዕከል)',
    en: "Maqra'ah",
  },
  MUQRI: {
    ar: 'المقرئ',
    am: 'መቅሪእ (የቁርአን አስተማሪ)',
    en: "Muqri'",
  },
  TALQIN: {
    ar: 'التلقين',
    am: 'ተልቂን',
    en: 'Talqin',
  },
  TAJWEED: {
    ar: 'التجويد',
    am: 'ተጅዊድ',
    en: 'Tajweed',
  },
  QIRAAT: {
    ar: 'القراءات',
    am: 'ቂራአት',
    en: "Qira'at",
  },
  RIWAYAH: {
    ar: 'الرواية',
    am: 'ሪዋያ',
    en: 'Riwayah',
  },
  HIFZ: {
    ar: 'الحفظ',
    am: 'ሒፍዝ (የቁርአን ትውስታ)',
    en: 'Hifz',
  },
  TILAWAH: {
    ar: 'التلاوة',
    am: 'ቲላዋ (የቁርአን ንባብ)',
    en: 'Tilawah',
  },
  MUSHAF: {
    ar: 'المصحف',
    am: 'ሙስሐፍ',
    en: 'Mushaf',
  },
  JUZ: {
    ar: 'جزء',
    am: 'ጁዝእ',
    en: "Juz'",
  },
  SURAH: {
    ar: 'سورة',
    am: 'ሱራ',
    en: 'Surah',
  },
  AYAH: {
    ar: 'آية',
    am: 'አያ',
    en: 'Ayah',
  },
  MAKHARIJ: {
    ar: 'مخارج الحروف',
    am: 'መኻሪጅ አል-ሑሩፍ (የፊደላት መውጫ)',
    en: 'Makharij al-Huruf',
  },
  SIFAT: {
    ar: 'صفات الحروف',
    am: 'ሲፋት አል-ሑሩፍ',
    en: 'Sifat al-Huruf',
  },
  WAQF: {
    ar: 'الوقف والابتداء',
    am: 'ወቅፍ እና ኢብቲዳእ',
    en: 'Waqf and Ibtida\'',
  },
  HAFS: {
    ar: 'حفص عن عاصم',
    am: 'ሐፍስ ከዓሲም',
    en: "Hafs 'an Asim",
  },
};

export function term(key, lang) {
  const t = TERM[key];
  if (!t) return key;
  return t[lang] || t.en || t.ar;
}