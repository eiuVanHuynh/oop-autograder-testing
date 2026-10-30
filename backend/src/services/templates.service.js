// Template – thứ người dùng chọn để chạy (bảng mới test_templates).
// Templates – what the user picks to run (the new test_templates table).
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
//
// Cần làm / To do:
// - target_json bắt buộc: { suiteId } hoặc { testIds }. Thiếu → 400.
// - Trùng template_name → 409. Sửa/xóa template KHÔNG ảnh hưởng lịch sử chạy.
// - Nên trả kèm số test case 'ready' để giao diện chặn sớm template rỗng.
class TemplatesService {
  constructor(deps = {}) {
    this.templateRepository = deps.templateRepository;
    this.caseRepository = deps.caseRepository; // Dùng để đếm số test case ready nếu cần
  }

  async getAllTemplates(filters = {}) {
    const templates = await this.templateRepository.findAllWithFilters(filters);

    // Parse target_json và gắn thêm thông tin số lượng test case 'ready' nếu cần
    for (const t of templates) {
      if (typeof t.target_json === "string") {
        t.target_json = JSON.parse(t.target_json);
      }
      t.ready_count = await this.caseRepository.countReadyForTarget(
        t.target_json,
      );
    }

    return templates;
  }

  async getTemplateById(id) {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      const error = new Error("Template not found");
      error.statusCode = 404;
      throw error;
    }

    if (typeof template.target_json === "string") {
      template.target_json = JSON.parse(template.target_json);
    }
    template.ready_count = await this.caseRepository.countReadyForTarget(
      template.target_json,
    );
    return template;
  }

  async createTemplate(userId, data) {
    const { template_name, target_json } = data;

    // Kiểm tra target_json bắt buộc phải có suiteId hoặc testIds hợp lệ -> 400
    if (
      !target_json ||
      (!target_json.suiteId &&
        (!target_json.testIds || target_json.testIds.length === 0))
    ) {
      const error = new Error(
        "target_json must contain either suiteId or non-empty testIds",
      );
      error.statusCode = 400;
      throw error;
    }

    // Kiểm tra trùng tên template -> 409 Conflict
    const existing = await this.templateRepository.findByName(template_name);
    if (existing) {
      const error = new Error("Template name already exists");
      error.statusCode = 409;
      throw error;
    }

    const templateId = await this.templateRepository.createTemplate({
      ...data,
      created_by: userId,
    });

    return await this.getTemplateById(templateId);
  }

  async updateTemplate(id, data) {
    // Kiểm tra xem template có tồn tại không
    await this.getTemplateById(id);

    if (data.template_name) {
      const existing = await this.templateRepository.findByName(
        data.template_name,
      );
      if (existing && existing.template_id !== Number(id)) {
        const error = new Error("Template name already exists");
        error.statusCode = 409;
        throw error;
      }
    }

    if (
      data.target_json &&
      !data.target_json.suiteId &&
      (!data.target_json.testIds || data.target_json.testIds.length === 0)
    ) {
      const error = new Error(
        "target_json must contain either suiteId or non-empty testIds",
      );
      error.statusCode = 400;
      throw error;
    }

    await this.templateRepository.updateTemplate(id, data);
    return await this.getTemplateById(id);
  }

  async deleteTemplate(id) {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      const error = new Error("Template not found");
      error.statusCode = 404;
      throw error;
    }

    // Xóa template KHÔNG ảnh hưởng lịch sử chạy vì test_runs đã snapshot grep/config từ trước
    return await this.templateRepository.delete(id);
  }

  async duplicateTemplate(id, userId) {
    const template = await this.getTemplateById(id);

    let newName = `${template.template_name} (Copy)`;
    let counter = 1;
    while (await this.templateRepository.findByName(newName)) {
      counter++;
      newName = `${template.template_name} (Copy ${counter})`;
    }

    const newData = {
      template_name: newName,
      description: template.description,
      scope: template.scope,
      target_json: template.target_json,
      env: template.env,
      timeout: template.timeout,
      created_by: userId,
    };

    const newId = await this.templateRepository.createTemplate(newData);
    return await this.getTemplateById(newId);
  }
}

module.exports = TemplatesService;
