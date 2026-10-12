import { SEED_TEMPLATES } from '../models/mockData';

// Lưu tạm ở localStorage (an toàn với try/catch). Khi có backend: đổi sang API.get/post/put/delete('/templates').
const KEY = 'templates';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return SEED_TEMPLATES;
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return list;
}

const today = () => new Date().toISOString().slice(0, 10);

export const listTemplates = () => read();

export function createTemplate(data, userName) {
  const item = {
    ...data,
    id: `tpl-${Date.now()}`,
    createdBy: userName || 'Unknown',
    updatedAt: today(),
  };
  write([item, ...read()]);
  return item;
}

export function updateTemplate(id, data) {
  const list = read().map((t) => (t.id === id ? { ...t, ...data, updatedAt: today() } : t));
  write(list);
  return list.find((t) => t.id === id);
}

export function deleteTemplate(id) {
  write(read().filter((t) => t.id !== id));
}
