import API from "../models/api";

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;
const parseJson = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};
const dateOnly = (value) => (value ? String(value).slice(0, 10) : "");

export const toTemplate = (source = {}) => {
  const row = source || {};
  const target = parseJson(row.target_json);
  return {
    ...row,
    id: row.template_id ?? row.id,
    name: row.template_name ?? row.name ?? "",
    description: row.description ?? row.template_description ?? "",
    scope: row.scope ?? row.test_scope ?? "",
    targetTestIds: Array.isArray(target.testIds) ? target.testIds : [],
    suiteId: target.suiteId ?? null,
    defaultEnv: row.env ?? row.default_env ?? row.defaultEnv ?? "development",
    defaultTimeoutMs:
      row.timeout ?? row.default_timeout_ms ?? row.defaultTimeoutMs ?? 30000,
    createdBy: row.created_by ?? row.createdBy ?? null,
    updatedAt: dateOnly(row.updated_at ?? row.created_at ?? row.updatedAt),
    readyCount: row.ready_count ?? row.readyCount,
  };
};

export const toBody = (template = {}) => {
  const body = {
    template_name: String(template.name ?? template.template_name ?? "").trim(),
    description: template.description ?? undefined,
    scope: template.scope || "UI",
    env: template.defaultEnv || template.env || "development",
    timeout: Number(template.defaultTimeoutMs ?? template.timeout ?? 30000),
  };
  const suiteId = template.suiteId ?? template.target_json?.suiteId;
  const testIds =
    template.targetTestIds ?? template.testIds ?? template.target_json?.testIds;
  if (suiteId != null && suiteId !== "") body.target_json = { suiteId };
  else if (Array.isArray(testIds) && testIds.length > 0)
    body.target_json = { testIds };
  else if (template.target_json) body.target_json = template.target_json;
  return body;
};

const rowsFrom = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export const listTemplates = async (params = {}) =>
  rowsFrom(unwrap(await API.get("/templates", { params }))).map(toTemplate);

export const getTemplate = async (id) =>
  toTemplate(unwrap(await API.get(`/templates/${id}`)));

export const createTemplate = async (data) =>
  toTemplate(unwrap(await API.post("/templates", toBody(data))));

export const updateTemplate = async (id, data) =>
  toTemplate(unwrap(await API.put(`/templates/${id}`, toBody(data))));

export const deleteTemplate = async (id) => {
  await API.delete(`/templates/${id}`);
};

export const duplicateTemplate = async (id) =>
  toTemplate(unwrap(await API.post(`/templates/${id}/duplicate`)));
