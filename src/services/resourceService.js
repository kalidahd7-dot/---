import { prisma } from '../database.js';

export async function getCategories() {
  return prisma.resourceCategory.findMany({ orderBy: { sortOrder: 'asc' } });
}

export async function getCategoryByCode(code) {
  return prisma.resourceCategory.findUnique({ where: { code } });
}

export async function getResourcesByCategory(categoryId, { parentId = null } = {}) {
  return prisma.resource.findMany({
    where: { categoryId, isActive: true, parentId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getResourceById(id) {
  return prisma.resource.findUnique({ where: { id } });
}

export async function getChildren(parentId) {
  return prisma.resource.findMany({
    where: { parentId, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export function localize(obj, base, lang) {
  if (!obj) return '';
  if (lang === 'ar') return obj[`${base}Ar`] || obj[`${base}En`] || '';
  if (lang === 'am') return obj[`${base}Am`] || obj[`${base}En`] || '';
  return obj[`${base}En`] || obj[`${base}Ar`] || '';
}

export function typeLabel(type, t) {
  const map = {
    BOOK: 'ct_type_book',
    PDF: 'ct_type_pdf',
    WEBSITE: 'ct_type_website',
    AUDIO: 'ct_type_audio',
    YOUTUBE: 'ct_type_youtube',
    PLAYLIST: 'ct_type_playlist',
  };
  return t(map[type] || 'ct_type_book');
}