// Template – what the user picks to run (new test_templates table).
// Business rules live here. No pg require, no touching req/res.
// Takes repositories through the constructor so tests can swap in fakes.
//
// To do:
// - target_json is required: { suiteId } or { testIds }. Missing → 400.
// - Duplicate template_name → 409. Editing/deleting a template does NOT affect run history.
// - Should also return the 'ready' test case count so the UI can block an empty template early.
const AppError = require("../utils/AppError");
const parseJson = require("../utils/parseJson");

class TemplatesService {
  constructor(deps = {}) {
    this.templateRepository = deps.templateRepository;
    this.caseRepository = deps.caseRepository; // Used to count ready test cases when needed
  }

  async getAllTemplates(filters = {}) {
    const templates = await this.templateRepository.findAllWithFilters(filters);

    // Đếm số case 'ready' cho từng template: song song, vì tuần tự là 1+N lượt đi-về DB.
    await Promise.all(
      templates.map(async (t) => {
        t.target_json = parseJson(t.target_json);
        t.ready_count = await this.caseRepository.countReadyForTarget(
          t.target_json ?? {},
        );
      }),
    );

    return templates;
  }

  async getTemplateById(id) {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new AppError(404, "NOT_FOUND", "Template not found");
    }

    template.target_json = parseJson(template.target_json);
    template.ready_count = await this.caseRepository.countReadyForTarget(
      template.target_json ?? {},
    );
    return template;
  }

  async createTemplate(userId, data) {
    const { template_name, target_json } = data;

    // target_json must carry a valid suiteId or testIds -> 400
    if (
      !target_json ||
      (!target_json.suiteId &&
        (!target_json.testIds || target_json.testIds.length === 0))
    ) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "target_json must contain either suiteId or non-empty testIds",
      );
    }

    // Check for a duplicate template name -> 409 Conflict
    const existing = await this.templateRepository.findByName(template_name);
    if (existing) {
      throw new AppError(409, "CONFLICT", "Template name already exists");
    }

    const templateId = await this.templateRepository.createTemplate({
      ...data,
      created_by: userId,
    });

    return await this.getTemplateById(templateId);
  }

  async updateTemplate(id, data) {
    // Check whether the template exists
    await this.getTemplateById(id);

    if (data.template_name) {
      const existing = await this.templateRepository.findByName(
        data.template_name,
      );
      if (existing && existing.template_id !== Number(id)) {
        throw new AppError(409, "CONFLICT", "Template name already exists");
      }
    }

    if (
      data.target_json &&
      !data.target_json.suiteId &&
      (!data.target_json.testIds || data.target_json.testIds.length === 0)
    ) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "target_json must contain either suiteId or non-empty testIds",
      );
    }

    await this.templateRepository.updateTemplate(id, data);
    return await this.getTemplateById(id);
  }

  async deleteTemplate(id) {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new AppError(404, "NOT_FOUND", "Template not found");
    }

    // Deleting a template does NOT affect run history, since test_runs already snapshotted grep/config
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
