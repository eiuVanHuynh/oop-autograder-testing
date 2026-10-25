import API from '../models/api';

// Nối với /api/templates (backend đã có đủ 6 route). Response bọc { success, data }.
// Chữ ký các hàm giữ như bản localStorage cũ, nhưng GIỜ LÀ ASYNC -> nơi gọi phải await.
//
// Backend trả snake_case: template_id, template_name, description, scope, target_json, env, timeout,
// created_by (chỉ là id), created_at, updated_at. Adapter dưới đây đổi sang dạng FE dùng.

const dateOnly = (v) => (v ? String(v).slice(0, 10) : '');

export const toTemplate = (row) => ({
  id: row.template_id,
  name: row.template_name,
  description: row.description || '',
  scope: row.scope,
  targetTestIds: row.target_json?.testIds ?? [],
  suiteId: row.target_json?.suiteId ?? null,
  defaultEnv: row.env,
  defaultTimeoutMs: row.timeout,
  // BACKEND-TODO: created_by chỉ là id. Cần backend join users để trả tên người tạo (api-endpoints.md mục 4: "người tạo").
  createdBy: row.created_by,
  updatedAt: dateOnly(row.updated_at || row.created_at),
  // BACKEND-TODO: readyCount (số test case 'ready') chưa có trong response — design mục 4 yêu cầu.
});

// Form FE -> body POST/PUT.
export const toBody = (t) => {
  const body = {
    template_name: t.name,
    description: t.description || undefined,
    scope: t.scope,
    env: t.defaultEnv || undefined,
    timeout: t.defaultTimeoutMs || undefined,
  };
  if (t.targetTestIds) body.target_json = { testIds: t.targetTestIds };
  return body;
};

export const listTemplates = async (params = {}) =>
  (await API.get('/templates', { params })).data.data.map(toTemplate);

export const getTemplate = async (id) => toTemplate((await API.get(`/templates/${id}`)).data.data);

export const createTemplate = async (data) =>
  toTemplate((await API.post('/templates', toBody(data))).data.data);

export const updateTemplate = async (id, data) =>
  toTemplate((await API.put(`/templates/${id}`, toBody(data))).data.data);

export const deleteTemplate = async (id) => {
  await API.delete(`/templates/${id}`);
};

export const duplicateTemplate = async (id) =>
  toTemplate((await API.post(`/templates/${id}/duplicate`)).data.data);
