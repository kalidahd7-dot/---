import { prisma } from '../database.js';

export async function createResource(data) {
  return prisma.resource.create({ data });
}

export async function updateResource(id, data) {
  return prisma.resource.update({ where: { id }, data });
}

export async function disableResource(id) {
  return prisma.resource.update({ where: { id }, data: { isActive: false } });
}

export async function enableResource(id) {
  return prisma.resource.update({ where: { id }, data: { isActive: true } });
}

export async function deleteResource(id) {
  // Recursively delete children first
  const children = await prisma.resource.findMany({ where: { parentId: id } });
  for (const c of children) await deleteResource(c.id);
  return prisma.resource.delete({ where: { id } });
}

export async function reorderResource(id, sortOrder) {
  return prisma.resource.update({ where: { id }, data: { sortOrder } });
}