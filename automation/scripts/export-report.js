
/**
 * export-report.js
 *
 * Export a PDF report for ONE selected template.
 *
 * Usage: cách chạy, TPL-0941 là template_code, "Standard Login Test" là template_name
 *   node export-report.js TPL-0941
 *   node export-report.js "Standard Login Test"
 *
 * Required:
 *   npm install pdfkit
 *
 * Database:
 *   ../tests/utils/db-client
 *
 * Optional:
 *   REPORT_OUTPUT_DIR
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const PDFDocument = require("pdfkit");

const { query, closeDb } = require("../tests/utils/db-client");

// ============================================================
// CONFIGURATION
// ============================================================

const COLORS = {
  primary: "#1F3A5F",
  secondary: "#52657A",
  light: "#F2F5F9",
  border: "#D8E0E9",
  text: "#243247",
  muted: "#667085",
  white: "#FFFFFF",

  passed: "#16803D",
  failed: "#C62828",
  timedOut: "#B45309",
  skipped: "#667085",
  interrupted: "#7C3AED",
  pending: "#667085",
  in_progress: "#B45309",
  done: "#16803D",
  reopened: "#C62828",
  unknown: "#667085",
};

const RESULT_LABELS = {
  passed: "PASSED",
  failed: "FAILED",
  timedOut: "TIMED OUT",
  skipped: "SKIPPED",
  interrupted: "INTERRUPTED",
};

const EXECUTION_STATUS_LABELS = {
  pending: "PENDING",
  in_progress: "IN_PROGRESS",
  done: "DONE",
  reopened: "REOPENED",
};

const PAGE = {
  size: "A4",
  margin: 42,
};

const FONT_REGULAR = "ReportRegular";
const FONT_BOLD = "ReportBold";

const OUTPUT_DIR =
  process.env.REPORT_OUTPUT_DIR ||
  path.join(os.homedir(), "Downloads");

const REPORT_TITLE = "QA TEST EXECUTION REPORT";

// ============================================================
// FONT CONFIGURATION
// ============================================================

function registerFonts(doc) {
  const candidates = [
    {
      regular: "C:/Windows/Fonts/arial.ttf",
      bold: "C:/Windows/Fonts/arialbd.ttf",
    },
    {
      regular: "C:/Windows/Fonts/segoeui.ttf",
      bold: "C:/Windows/Fonts/segoeuib.ttf",
    },
    {
      regular: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      bold: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    },
  ];

  for (const font of candidates) {
    if (fs.existsSync(font.regular) && fs.existsSync(font.bold)) {
      doc.registerFont(FONT_REGULAR, font.regular);
      doc.registerFont(FONT_BOLD, font.bold);
      return;
    }
  }

  doc.registerFont(FONT_REGULAR, "Helvetica");
  doc.registerFont(FONT_BOLD, "Helvetica-Bold");
}

// ============================================================
// GENERAL HELPERS
// ============================================================

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = "Not recorded") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function formatDate(value) {
  if (!value) return "Not recorded";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDuration(milliseconds) {
  const ms = Number(milliseconds || 0);

  if (ms < 1000) return `${ms} ms`;

  return `${(ms / 1000).toFixed(2)} seconds`;
}

function formatExecutionType(value) {
  const type = String(value || "").toLowerCase();

  if (type === "automation") return "Automation";
  if (type === "manual") return "Manual";

  return safeText(value);
}

function getResultLabel(status) {
  return RESULT_LABELS[status] ||
    String(status || "UNKNOWN").toUpperCase();
}

function getExecutionStatusLabel(status) {
  return EXECUTION_STATUS_LABELS[status] ||
    String(status || "UNKNOWN").toUpperCase();
}

function getStatusColor(status) {
  return COLORS[String(status || "").toLowerCase()] ||
    COLORS.unknown;
}

function getPassRate(results) {
  if (results.length === 0) return "0.0%";

  const passed = results.filter(
    (item) => item.result_status === "passed",
  ).length;

  return `${((passed / results.length) * 100).toFixed(1)}%`;
}

function getCounts(results) {
  return {
    total: results.length,
    passed: results.filter(
      (item) => item.result_status === "passed",
    ).length,
    failed: results.filter(
      (item) => item.result_status === "failed",
    ).length,
    timedOut: results.filter(
      (item) => item.result_status === "timedOut",
    ).length,
    skipped: results.filter(
      (item) => item.result_status === "skipped",
    ).length,
    interrupted: results.filter(
      (item) => item.result_status === "interrupted",
    ).length,
  };
}

function getOutputPath(templateCode) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const safeCode = String(templateCode || "template")
    .replace(/[^a-zA-Z0-9_-]/g, "_");

  return path.join(
    OUTPUT_DIR,
    `Test_Report_${safeCode}_${timestamp}.pdf`,
  );
}

function resolveEvidence(filePath) {
  if (!filePath) return null;

  const original = String(filePath).trim();

  if (/^https?:\/\//i.test(original)) {
    return { label: original, url: original };
  }

  if (/^file:\/\//i.test(original)) {
    return { label: original, url: original };
  }

  const absolutePath = path.isAbsolute(original)
    ? original
    : path.resolve(process.cwd(), original);

  if (!fs.existsSync(absolutePath)) {
    return { label: original, url: null };
  }

  return {
    label: absolutePath,
    url: pathToFileURL(absolutePath).href,
  };
}

// ============================================================
// DATABASE QUERIES
// ============================================================

async function getTemplate(identifier) {
  if (!identifier) {
    throw new Error(
      "Please provide a template_code or template_name.\n" +
      'Example: node export-report.js TPL-0941',
    );
  }

  const rows = await query(
    `
    SELECT
      template_id,
      template_code,
      template_name,
      template_description,
      template_version,
      test_scope,
      created_at,
      updated_at
    FROM templates
    WHERE template_code = ?
       OR template_name = ?
    LIMIT 1
    `,
    [identifier, identifier],
  );

  const template = asArray(rows)[0];

  if (!template) {
    throw new Error(
      `Template "${identifier}" was not found in templates.`,
    );
  }

  return template;
}

/**
 * Select the latest recorded execution for each test case
 * linked to the selected template.
 *
 * The report scope is controlled by template_test_cases.
 * It does not include unrelated test cases.
 *
 * Selecting the latest result per test case allows one template
 * report to include both manual and automation executions.
 */
async function getTemplateResults(templateId) {
  return asArray(
    await query(
      `
      SELECT
        tr.execution_id,
        tr.run_id,
        tr.test_id,
        tr.result_status,
        tr.actual_result,
        tr.execution_time_ms,
        tr.error_message,
        tr.retry_count,

        run.execution_type,
        run.started_at AS test_date,
        run.finished_at,
        run.browser,
        run.environment,
        run.git_commit,
        run.branch_name,
        run.ci_run_id,

        users.full_name AS tester_name,

        tc.tc_code,
        tc.title AS test_name,
        tc.execution_status,
        tc.preconditions,
        tc.expected_result,
        tc.priority,
        tc.test_type,
        tc.test_status AS case_status,

        ts.spec_code,
        ts.screen_name,
        ts.spec_description,

        suite.suite_name

      FROM template_test_cases AS ttc

      INNER JOIN test_cases AS tc
        ON tc.test_id = ttc.test_id

      INNER JOIN test_specs AS ts
        ON ts.spec_id = tc.spec_id

      INNER JOIN test_suites AS suite
        ON suite.suite_id = ts.suite_id

      LEFT JOIN test_results AS tr
        ON tr.test_id = tc.test_id
       AND tr.execution_id = (
          SELECT MAX(tr2.execution_id)
          FROM test_results AS tr2
          WHERE tr2.test_id = tc.test_id
       )

      LEFT JOIN test_runs AS run
        ON run.run_id = tr.run_id

      LEFT JOIN users
        ON users.user_id = run.tester_id

      WHERE ttc.template_id = ?

      ORDER BY tc.tc_code ASC
      `,
      [templateId],
    ),
  );
}

async function getSteps(testIds) {
  if (testIds.length === 0) return [];

  const placeholders = testIds.map(() => "?").join(",");

  return asArray(
    await query(
      `
      SELECT
        step_id,
        test_id,
        step_order,
        step_action,
        step_target,
        expected_result
      FROM test_steps
      WHERE test_id IN (${placeholders})
      ORDER BY test_id, step_order
      `,
      testIds,
    ),
  );
}

async function getTestData(testIds) {
  if (testIds.length === 0) return [];

  const placeholders = testIds.map(() => "?").join(",");

  return asArray(
    await query(
      `
      SELECT
        data_id,
        test_id,
        field_name,
        data_value,
        is_valid
      FROM test_data
      WHERE test_id IN (${placeholders})
      ORDER BY test_id, data_id
      `,
      testIds,
    ),
  );
}

async function getEvidence(executionIds) {
  if (executionIds.length === 0) return [];

  const placeholders = executionIds.map(() => "?").join(",");

  return asArray(
    await query(
      `
      SELECT
        evidence_id,
        result_id,
        evidence_type,
        file_path,
        created_at
      FROM test_evidences
      WHERE result_id IN (${placeholders})
      ORDER BY result_id, evidence_id
      `,
      executionIds,
    ),
  );
}

// ============================================================
// PDF LAYOUT HELPERS
// ============================================================

function addPageHeader(doc) {
  const left = PAGE.margin;
  const width = doc.page.width - PAGE.margin * 2;

  doc
    .font(FONT_BOLD)
    .fontSize(9)
    .fillColor(COLORS.primary)
    .text(REPORT_TITLE, left, 22, {
      width,
      lineBreak: false,
    });

  doc
    .moveTo(left, 38)
    .lineTo(left + width, 38)
    .strokeColor(COLORS.border)
    .lineWidth(0.7)
    .stroke();

  doc.y = 51;
}

function addNewPage(doc) {
  doc.addPage();
  addPageHeader(doc);
}

function ensureSpace(doc, requiredHeight) {
  const bottomLimit = doc.page.height - PAGE.margin - 25;

  if (doc.y + requiredHeight > bottomLimit) {
    addNewPage(doc);
  }
}

function drawSectionTitle(doc, title) {
  ensureSpace(doc, 32);

  doc
    .font(FONT_BOLD)
    .fontSize(12)
    .fillColor(COLORS.primary)
    .text(title, PAGE.margin, doc.y, {
      width: doc.page.width - PAGE.margin * 2,
    });

  doc.moveDown(0.35);
}

function drawField(doc, label, value, options = {}) {
  const left = PAGE.margin;
  const width = doc.page.width - PAGE.margin * 2;
  const fontSize = options.fontSize || 9;
  const labelWidth = options.labelWidth || 118;
  const content = safeText(value);

  doc.font(FONT_REGULAR).fontSize(fontSize);

  const valueHeight = doc.heightOfString(content, {
    width: width - labelWidth - 8,
    font: FONT_REGULAR,
    fontSize,
  });

  const height = Math.max(15, valueHeight + 4);

  ensureSpace(doc, height + 4);

  const startY = doc.y;

  doc
    .font(FONT_BOLD)
    .fontSize(fontSize)
    .fillColor(COLORS.secondary)
    .text(`${label}:`, left, startY, {
      width: labelWidth,
    });

  doc
    .font(FONT_REGULAR)
    .fontSize(fontSize)
    .fillColor(COLORS.text)
    .text(content, left + labelWidth, startY, {
      width: width - labelWidth,
    });

  doc.y = startY + height + 3;
}

function drawStatusBanner(doc, resultStatus, executionStatus) {
  ensureSpace(doc, 48);

  const left = PAGE.margin;
  const width = doc.page.width - PAGE.margin * 2;
  const y = doc.y;

  const resultColor = getStatusColor(resultStatus);

  doc
    .roundedRect(left, y, width, 30, 5)
    .fillColor(resultColor)
    .fill();

  doc
    .font(FONT_BOLD)
    .fontSize(10)
    .fillColor(COLORS.white)
    .text(
      `TEST RESULT: ${getResultLabel(resultStatus)}`,
      left + 10,
      y + 9,
      { width: width - 20 },
    );

  doc.y = y + 37;

  const executionColor = getStatusColor(executionStatus);

  doc
    .roundedRect(left, doc.y, width, 25, 5)
    .fillColor(COLORS.light)
    .fill();

  doc
    .font(FONT_BOLD)
    .fontSize(9)
    .fillColor(executionColor)
    .text(
      `EXECUTION STATUS: ${getExecutionStatusLabel(
        executionStatus,
      )}`,
      left + 10,
      doc.y + 7,
      { width: width - 20 },
    );

  doc.y += 34;
}

function drawTableCell(doc, text, x, y, width, height, options = {}) {
  const padding = 4;

  if (options.fill) {
    doc
      .rect(x, y, width, height)
      .fillColor(options.fill)
      .fill();
  }

  doc
    .rect(x, y, width, height)
    .lineWidth(0.5)
    .strokeColor(COLORS.border)
    .stroke();

  doc
    .font(options.bold ? FONT_BOLD : FONT_REGULAR)
    .fontSize(options.fontSize || 7.5)
    .fillColor(options.color || COLORS.text)
    .text(safeText(text, ""), x + padding, y + padding, {
      width: width - padding * 2,
      height: height - padding * 2,
      ellipsis: true,
    });
}

function drawTable(doc, columns, rows, options = {}) {
  const left = PAGE.margin;
  const availableWidth = doc.page.width - PAGE.margin * 2;
  const totalWidth = columns.reduce(
    (sum, column) => sum + column.width,
    0,
  );
  const scale = availableWidth / totalWidth;
  const headerHeight = options.headerHeight || 25;
  const rowHeight = options.rowHeight || 29;

  ensureSpace(doc, headerHeight + rowHeight);

  let y = doc.y;

  function drawHeader() {
    let x = left;

    for (const column of columns) {
      const width = column.width * scale;

      drawTableCell(
        doc,
        column.title,
        x,
        y,
        width,
        headerHeight,
        {
          fill: COLORS.primary,
          bold: true,
          color: COLORS.white,
          fontSize: 7.5,
        },
      );

      x += width;
    }

    y += headerHeight;
  }

  drawHeader();

  rows.forEach((row, rowIndex) => {
    const bottomLimit = doc.page.height - PAGE.margin - 25;

    if (y + rowHeight > bottomLimit) {
      addNewPage(doc);
      y = doc.y;
      drawHeader();
    }

    let x = left;

    columns.forEach((column, columnIndex) => {
      const width = column.width * scale;
      const cell = row[columnIndex] || {};

      const value =
        typeof cell === "object" && cell !== null && "text" in cell
          ? cell.text
          : cell;

      const color =
        typeof cell === "object" && cell !== null && cell.color
          ? cell.color
          : COLORS.text;

      drawTableCell(
        doc,
        value,
        x,
        y,
        width,
        rowHeight,
        {
          fill: rowIndex % 2 === 0 ? COLORS.light : COLORS.white,
          color,
          bold:
            typeof cell === "object" &&
            cell !== null &&
            cell.bold === true,
          fontSize: 7.2,
        },
      );

      x += width;
    });

    y += rowHeight;
  });

  doc.y = y + 14;
}

// ============================================================
// EXECUTION STATISTICS
// ============================================================

function drawExecutionTypeStatistics(doc, results) {
  drawSectionTitle(doc, "Results by Execution Type");

  const types = ["manual", "automation"];

  const rows = types.map((type) => {
    const typeResults = results.filter(
      (result) => result.execution_type === type,
    );

    const counts = getCounts(typeResults);

    return [
      formatExecutionType(type),
      counts.total,
      counts.passed,
      counts.failed,
      getPassRate(typeResults),
    ];
  });

  const totalCounts = getCounts(results);

  rows.push([
    "Total",
    totalCounts.total,
    totalCounts.passed,
    totalCounts.failed,
    getPassRate(results),
  ]);

  drawTable(
    doc,
    [
      { title: "Execution Type", width: 150 },
      { title: "Total", width: 70 },
      { title: "Passed", width: 70 },
      { title: "Failed", width: 70 },
      { title: "Pass Rate", width: 80 },
    ],
    rows,
    { rowHeight: 25 },
  );

  drawField(
    doc,
    "Timed Out",
    totalCounts.timedOut,
  );

  drawField(doc, "Skipped", totalCounts.skipped);

  drawField(
    doc,
    "Interrupted",
    totalCounts.interrupted,
  );
}

// ============================================================
// TEST CASE SUMMARY
// ============================================================

function drawSummaryTable(doc, results) {
  drawSectionTitle(doc, "Test Case Summary");

  const columns = [
    { title: "Test Case", width: 75 },
    { title: "Test Name", width: 145 },
    { title: "Execution Type", width: 85 },
    { title: "Execution Status", width: 95 },
    { title: "Result", width: 70 },
    { title: "Duration", width: 75 },
  ];

  const rows = results.map((result) => [
    safeText(result.tc_code),
    safeText(result.test_name),
    formatExecutionType(result.execution_type),
    {
      text: getExecutionStatusLabel(result.execution_status),
      color: getStatusColor(result.execution_status),
      bold: true,
    },
    {
      text: result.result_status
        ? getResultLabel(result.result_status)
        : "NOT RUN",
      color: getStatusColor(result.result_status),
      bold: true,
    },
    result.execution_id
      ? formatDuration(result.execution_time_ms)
      : "Not run",
  ]);

  drawTable(doc, columns, rows, {
    headerHeight: 29,
    rowHeight: 32,
  });
}

// ============================================================
// OVERVIEW PAGE
// ============================================================

function drawOverview(doc, template, results) {
  addPageHeader(doc);

  doc
    .font(FONT_BOLD)
    .fontSize(21)
    .fillColor(COLORS.primary)
    .text("Test Execution Report", PAGE.margin, doc.y, {
      width: doc.page.width - PAGE.margin * 2,
    });

  doc.moveDown(0.3);

  doc
    .font(FONT_REGULAR)
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(
      `${safeText(template.template_name)}  |  ` +
      `${safeText(template.template_code)}`,
    );

  doc.moveDown(0.8);

  drawSectionTitle(doc, "Execution Overview");

  drawField(doc, "Template Code", template.template_code);
  drawField(doc, "Template Name", template.template_name);
  drawField(doc, "Template Version", template.template_version);
  drawField(doc, "Report Generated", formatDate(new Date()));

  const executedResults = results.filter(
    (result) => result.execution_id,
  );

  const dates = executedResults
    .map((result) => result.test_date)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));

  const testers = [
    ...new Set(
      executedResults
        .map((result) => result.tester_name)
        .filter(Boolean),
    ),
  ];

  const environments = [
    ...new Set(
      executedResults
        .map((result) => result.environment)
        .filter(Boolean),
    ),
  ];

  drawField(
    doc,
    "Execution Date",
    dates.length
      ? `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])}`
      : "No execution recorded",
  );

  drawField(
    doc,
    "Tester Name",
    testers.length ? testers.join(", ") : "Not recorded",
  );

  drawField(
    doc,
    "Environment",
    environments.length ? environments.join(", ") : "Not recorded",
  );

  const counts = getCounts(executedResults);

  drawSectionTitle(doc, "Execution Statistics");

  const statistics = [
    ["Total Tests", results.length, COLORS.primary],
    ["Passed", counts.passed, COLORS.passed],
    ["Failed", counts.failed, COLORS.failed],
    ["Timed Out", counts.timedOut, COLORS.timedOut],
    ["Skipped", counts.skipped, COLORS.skipped],
    ["Interrupted", counts.interrupted, COLORS.interrupted],
  ];

  const gap = 8;
  const cardWidth =
    (doc.page.width - PAGE.margin * 2 - gap * 2) / 3;
  const cardHeight = 48;

  let x = PAGE.margin;
  let y = doc.y;

  statistics.forEach((item, index) => {
    if (index > 0 && index % 3 === 0) {
      x = PAGE.margin;
      y += cardHeight + gap;
    }

    doc
      .roundedRect(x, y, cardWidth, cardHeight, 5)
      .fillColor(COLORS.light)
      .fill();

    doc
      .font(FONT_BOLD)
      .fontSize(16)
      .fillColor(item[2])
      .text(String(item[1]), x + 10, y + 6, {
        width: cardWidth - 20,
      });

    doc
      .font(FONT_REGULAR)
      .fontSize(8)
      .fillColor(COLORS.secondary)
      .text(item[0], x + 10, y + 29, {
        width: cardWidth - 20,
      });

    x += cardWidth + gap;
  });

  doc.y = y + cardHeight + gap + 8;

  drawField(
    doc,
    "Pass Rate",
    getPassRate(executedResults),
  );

  if (results.length === 0) {
    drawField(
      doc,
      "Note",
      "No test cases are linked to this template.",
    );
    return;
  }

  drawExecutionTypeStatistics(doc, executedResults);
  drawSummaryTable(doc, results);
}

// ============================================================
// TEST CASE DETAIL
// ============================================================

function drawTestDetails(
  doc,
  result,
  steps,
  testData,
  evidences,
) {
  addNewPage(doc);

  doc
    .font(FONT_BOLD)
    .fontSize(16)
    .fillColor(COLORS.primary)
    .text(
      `${safeText(result.tc_code, "TEST")} | ` +
      `${safeText(result.test_name)}`,
      PAGE.margin,
      doc.y,
      {
        width: doc.page.width - PAGE.margin * 2,
      },
    );

  doc.moveDown(0.5);

  drawStatusBanner(
    doc,
    result.result_status,
    result.execution_status,
  );

  drawSectionTitle(doc, "Test Case Information");

  drawField(doc, "Test Case Code", result.tc_code);
  drawField(doc, "Test Case Name", result.test_name);
  drawField(doc, "Suite", result.suite_name);
  drawField(doc, "Specification", result.spec_code);
  drawField(doc, "Screen", result.screen_name);
  drawField(doc, "Test Type", result.test_type);
  drawField(doc, "Priority", result.priority);
  drawField(
    doc,
    "Execution Status",
    getExecutionStatusLabel(result.execution_status),
  );
  drawField(
    doc,
    "Test Date",
    formatDate(result.test_date),
  );
  drawField(doc, "Tester Name", result.tester_name);
  drawField(
    doc,
    "Execution Type",
    formatExecutionType(result.execution_type),
  );
  drawField(doc, "Browser", result.browser);
  drawField(doc, "Environment", result.environment);

  drawSectionTitle(doc, "Preconditions");
  drawField(doc, "Preconditions", result.preconditions);

  drawSectionTitle(doc, "Testing Process / Steps");

  const testSteps = steps.filter(
    (step) => Number(step.test_id) === Number(result.test_id),
  );

  if (testSteps.length === 0) {
    drawField(doc, "Steps", "No test steps recorded.");
  } else {
    const stepRows = testSteps.map((step) => [
      step.step_order,
      step.step_action,
      step.step_target || "Not specified",
      step.expected_result || "Not specified",
    ]);

    drawTable(
      doc,
      [
        { title: "Step", width: 35 },
        { title: "Action", width: 150 },
        { title: "Target", width: 110 },
        { title: "Expected Result", width: 150 },
      ],
      stepRows,
      { headerHeight: 27, rowHeight: 38 },
    );
  }

  drawSectionTitle(doc, "Input / Test Data");

  const dataRows = testData.filter(
    (item) => Number(item.test_id) === Number(result.test_id),
  );

  if (dataRows.length === 0) {
    drawField(doc, "Test Data", "No test data recorded.");
  } else {
    drawTable(
      doc,
      [
        { title: "Field Name", width: 120 },
        { title: "Input Value", width: 230 },
        { title: "Validity", width: 95 },
      ],
      dataRows.map((item) => [
        item.field_name,
        item.data_value,
        item.is_valid ? "Valid" : "Invalid",
      ]),
      { headerHeight: 25, rowHeight: 30 },
    );
  }

  drawSectionTitle(doc, "Expected Result");
  drawField(doc, "Expected Result", result.expected_result);

  drawSectionTitle(doc, "Actual Result");

  const actualResult =
    result.actual_result ||
    result.error_message ||
    "Actual result not recorded in database.";

  drawField(doc, "Actual Result", actualResult);

  if (result.error_message) {
    drawField(doc, "Error Message", result.error_message);
  }

  drawSectionTitle(doc, "Execution Information");

  drawField(
    doc,
    "Execution Time",
    result.execution_id
      ? formatDuration(result.execution_time_ms)
      : "Not executed",
  );

  drawField(
    doc,
    "Retry Count",
    result.execution_id ? result.retry_count : "Not recorded",
  );

  drawField(
    doc,
    "Execution ID",
    result.execution_id || "Not executed",
  );

  drawField(
    doc,
    "Test Run ID",
    result.run_id || "Not executed",
  );

  drawField(
    doc,
    "Git Commit",
    result.git_commit,
  );

  drawField(
    doc,
    "Branch",
    result.branch_name,
  );

  drawField(
    doc,
    "CI Run ID",
    result.ci_run_id,
  );

  drawSectionTitle(doc, "Evidence");

  const resultEvidence = result.execution_id
    ? evidences.filter(
        (item) =>
          Number(item.result_id) === Number(result.execution_id),
      )
    : [];

  if (resultEvidence.length === 0) {
    drawField(doc, "Evidence", "No evidence recorded.");
  } else {
    resultEvidence.forEach((item, index) => {
      const evidence = resolveEvidence(item.file_path);

      drawField(
        doc,
        `Evidence ${index + 1}`,
        `${item.evidence_type} | ${evidence.label}`,
      );

      if (evidence.url) {
        ensureSpace(doc, 24);

        doc
          .font(FONT_BOLD)
          .fontSize(9)
          .fillColor("#1769AA")
          .text("Open evidence", PAGE.margin + 118, doc.y, {
            link: evidence.url,
            underline: true,
          });

        doc.moveDown(0.5);
      } else {
        drawField(
          doc,
          "Link Status",
          "File not found. Check the evidence path.",
        );
      }
    });
  }
}

// ============================================================
// PAGE NUMBERS
// ============================================================

function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();

  for (
    let index = range.start;
    index < range.start + range.count;
    index++
  ) {
    doc.switchToPage(index);

    const pageNumber = index + 1;
    const pageCount = range.count;
    const y = doc.page.height - 27;

    doc
      .moveTo(PAGE.margin, y - 7)
      .lineTo(doc.page.width - PAGE.margin, y - 7)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();

    doc
      .font(FONT_REGULAR)
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(
        `QA Test Execution Report | Page ${pageNumber} of ${pageCount}`,
        PAGE.margin,
        y,
        {
          width: doc.page.width - PAGE.margin * 2,
          align: "center",
          lineBreak: false,
        },
      );
  }
}

// ============================================================
// MAIN EXPORT FUNCTION
// ============================================================

async function exportPdfReport(identifier) {
  try {
    console.log("Loading selected template...");

    const template = await getTemplate(identifier);

    console.log(
      `Exporting report for ${template.template_name} ` +
      `(${template.template_code})...`,
    );

    const results = await getTemplateResults(template.template_id);

    const testIds = [
      ...new Set(results.map((item) => Number(item.test_id))),
    ];

    const executionIds = [
      ...new Set(
        results
          .map((item) => Number(item.execution_id))
          .filter(Boolean),
      ),
    ];

    const [steps, testData, evidences] = await Promise.all([
      getSteps(testIds),
      getTestData(testIds),
      getEvidence(executionIds),
    ]);

    const outputPath = getOutputPath(template.template_code);

    const doc = new PDFDocument({
      size: PAGE.size,
      margins: {
        top: PAGE.margin,
        bottom: PAGE.margin,
        left: PAGE.margin,
        right: PAGE.margin,
      },
      bufferPages: true,
      info: {
        Title: `Test Execution Report - ${template.template_name}`,
        Author: "QA Test Automation System",
        Subject: `Execution results for ${template.template_code}`,
      },
    });

    registerFonts(doc);

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Page 1: Overview, statistics, and test case summary.
    drawOverview(doc, template, results);

    // Detail pages: only test cases linked to the selected template.
    for (const result of results) {
      drawTestDetails(
        doc,
        result,
        steps,
        testData,
        evidences,
      );
    }

    addPageNumbers(doc);

    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      doc.on("error", reject);
      doc.end();
    });

    console.log("PDF report exported successfully:");
    console.log(outputPath);

    return outputPath;
  } catch (error) {
    console.error("Failed to export PDF report:");
    console.error(error);
    throw error;
  } finally {
    if (typeof closeDb === "function") {
      await closeDb();
    }
  }
}

// ============================================================
// ENTRY POINT
// ============================================================

if (require.main === module) {
  const identifier = process.argv.slice(2).join(" ").trim();

  exportPdfReport(identifier).catch(() => {
    process.exitCode = 1;
  });
}

module.exports = {
  exportPdfReport,
};
