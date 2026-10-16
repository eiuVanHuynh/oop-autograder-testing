/**
 * export-pdf-report.js
 *
 * Export QA Test Execution Report to PDF.
 *
 * Required packages:
 *   npm install pdfkit
 *
 * Database client:
 *   ../tests/utils/db-client
 *
 * Optional environment variable:
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
  unknown: "#667085",
};

const STATUS_LABELS = {
  passed: "PASSED",
  failed: "FAILED",
  timedOut: "TIMED OUT",
  skipped: "SKIPPED",
  interrupted: "INTERRUPTED",
};

const PAGE = {
  size: "A4",
  margin: 48,
};

const FONT_REGULAR = "ReportRegular";
const FONT_BOLD = "ReportBold";

const OUTPUT_DIR =
  process.env.REPORT_OUTPUT_DIR || path.join(os.homedir(), "Downloads");

// ============================================================
// FONT CONFIGURATION
// ============================================================

function registerFonts(doc) {
  const fontCandidates = [
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

  for (const fonts of fontCandidates) {
    if (fs.existsSync(fonts.regular) && fs.existsSync(fonts.bold)) {
      doc.registerFont(FONT_REGULAR, fonts.regular);
      doc.registerFont(FONT_BOLD, fonts.bold);
      return;
    }
  }

  // PDFKit built-in fallback.
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

function getStatusColor(status) {
  return COLORS[status] || COLORS.unknown;
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || String(status || "UNKNOWN").toUpperCase();
}

function getPassRate(results) {
  if (results.length === 0) return "0.0%";

  const passed = results.filter(
    (item) => item.result_status === "passed",
  ).length;

  return `${((passed / results.length) * 100).toFixed(1)}%`;
}

function getOutputPath(runId) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  return path.join(OUTPUT_DIR, `Test_Report_Run_${runId}_${timestamp}.pdf`);
}

/**
 * Resolve evidence locations.
 *
 * Supports:
 * - Absolute HTTP/HTTPS URLs
 * - Absolute local file paths
 * - Relative paths resolved from the project directory
 *
 * The PDF contains a clickable link, not an embedded screenshot.
 */
function resolveEvidence(filePath) {
  if (!filePath) return null;

  const original = String(filePath).trim();

  if (/^https?:\/\//i.test(original)) {
    return {
      label: original,
      url: original,
    };
  }

  if (/^file:\/\//i.test(original)) {
    return {
      label: original,
      url: original,
    };
  }

  const absolutePath = path.isAbsolute(original)
    ? original
    : path.resolve(process.cwd(), original);

  if (!fs.existsSync(absolutePath)) {
    return {
      label: original,
      url: null,
    };
  }

  return {
    label: absolutePath,
    url: pathToFileURL(absolutePath).href,
  };
}

// ============================================================
// DATABASE QUERIES
// ============================================================

async function getLatestRun() {
  const rows = await query(
    `
    SELECT
      run.run_id,
      run.started_at,
      run.finished_at,
      run.browser,
      run.environment,
      run.git_commit,
      run.branch_name,
      run.ci_run_id,
      run.tester_id,
      users.full_name AS tester_name
    FROM test_runs AS run
    LEFT JOIN users
      ON users.user_id = run.tester_id
    ORDER BY run.run_id DESC
    LIMIT 1
    `,
  );

  return asArray(rows)[0] || null;
}

async function getRunResults(runId) {
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
        tc.preconditions,
        tc.expected_result,
        tc.priority,
        tc.test_type,
        tc.test_status AS case_status,

        ts.spec_code,
        ts.screen_name,
        ts.spec_description,

        suite.suite_name

      FROM test_results AS tr

      INNER JOIN test_runs AS run
        ON run.run_id = tr.run_id

      INNER JOIN test_cases AS tc
        ON tc.test_id = tr.test_id

      INNER JOIN test_specs AS ts
        ON ts.spec_id = tc.spec_id

      INNER JOIN test_suites AS suite
        ON suite.suite_id = ts.suite_id

      LEFT JOIN users
        ON users.user_id = run.tester_id

      WHERE tr.run_id = ?

      ORDER BY tr.execution_id ASC
      `,
      [runId],
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

function addPageHeader(doc, title = "QA TEST EXECUTION REPORT") {
  const left = PAGE.margin;
  const right = doc.page.width - PAGE.margin;

  doc
    .font(FONT_BOLD)
    .fontSize(9)
    .fillColor(COLORS.primary)
    .text(title, left, 24, {
      width: right - left,
      lineBreak: false,
    });

  doc
    .moveTo(left, 39)
    .lineTo(right, 39)
    .strokeColor(COLORS.border)
    .lineWidth(0.7)
    .stroke();

  doc.y = 52;
}

function addNewPage(doc, title) {
  doc.addPage();
  addPageHeader(doc, title);
}

function ensureSpace(doc, requiredHeight, title) {
  const bottomLimit = doc.page.height - PAGE.margin - 24;

  if (doc.y + requiredHeight > bottomLimit) {
    addNewPage(doc, title);
  }
}

function drawSectionTitle(doc, title) {
  ensureSpace(doc, 34, "QA TEST EXECUTION REPORT");

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
  const title = options.pageTitle || "QA TEST EXECUTION REPORT";
  const left = PAGE.margin;
  const width = doc.page.width - PAGE.margin * 2;
  const fontSize = options.fontSize || 9.5;
  const labelWidth = options.labelWidth || 118;
  const content = safeText(value);

  doc.font(FONT_REGULAR).fontSize(fontSize);

  const valueHeight = doc.heightOfString(content, {
    width: width - labelWidth - 10,
    font: FONT_REGULAR,
    fontSize,
  });

  const height = Math.max(16, valueHeight + 5);

  ensureSpace(doc, height + 3, title);

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

function drawStatusBanner(doc, status) {
  const title = "QA TEST EXECUTION REPORT";
  ensureSpace(doc, 40, title);

  const color = getStatusColor(status);
  const left = PAGE.margin;
  const width = doc.page.width - PAGE.margin * 2;
  const y = doc.y;

  doc.roundedRect(left, y, width, 29, 5).fillColor(color).fill();

  doc
    .font(FONT_BOLD)
    .fontSize(10)
    .fillColor(COLORS.white)
    .text(`TEST STATUS: ${getStatusLabel(status)}`, left + 10, y + 9, {
      width: width - 20,
    });

  doc.y = y + 39;
}

function drawTableCell(doc, text, x, y, width, height, options = {}) {
  const padding = 5;

  if (options.fill) {
    doc.rect(x, y, width, height).fillColor(options.fill).fill();
  }

  doc
    .rect(x, y, width, height)
    .lineWidth(0.5)
    .strokeColor(COLORS.border)
    .stroke();

  doc
    .font(options.bold ? FONT_BOLD : FONT_REGULAR)
    .fontSize(options.fontSize || 8)
    .fillColor(options.color || COLORS.text)
    .text(safeText(text, ""), x + padding, y + padding, {
      width: width - padding * 2,
      height: height - padding * 2,
      ellipsis: true,
    });
}

function drawSummaryTable(doc, results) {
  drawSectionTitle(doc, "Test Case Summary");

  const columns = [
    { title: "Test Case", width: 145 },
    { title: "Test Name", width: 190 },
    { title: "Status", width: 95 },
    { title: "Duration", width: 75 },
  ];

  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const availableWidth = doc.page.width - PAGE.margin * 2;
  const scale = availableWidth / totalWidth;
  const headerHeight = 25;
  const rowHeight = 29;

  let x = PAGE.margin;
  let y = doc.y;

  for (const column of columns) {
    const width = column.width * scale;

    drawTableCell(doc, column.title, x, y, width, headerHeight, {
      fill: COLORS.primary,
      bold: true,
      color: COLORS.white,
    });

    x += width;
  }

  y += headerHeight;

  for (const result of results) {
    if (y + rowHeight > doc.page.height - PAGE.margin - 24) {
      addNewPage(doc, "QA TEST EXECUTION REPORT");
      y = doc.y;
    }

    const values = [
      result.tc_code,
      result.test_name,
      getStatusLabel(result.result_status),
      formatDuration(result.execution_time_ms),
    ];

    x = PAGE.margin;

    values.forEach((value, index) => {
      const width = columns[index].width * scale;
      const statusCell = index === 2;

      drawTableCell(doc, value, x, y, width, rowHeight, {
        fill: y % 2 === 0 ? COLORS.light : COLORS.white,
        color: statusCell ? getStatusColor(result.result_status) : COLORS.text,
        bold: statusCell,
      });

      x += width;
    });

    y += rowHeight;
  }

  doc.y = y + 18;
}

function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();

  for (let index = range.start; index < range.start + range.count; index++) {
    doc.switchToPage(index);

    const pageNumber = index + 1;
    const pageCount = range.count;
    const y = doc.page.height - 29;

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
        `QA Test Execution Report  |  Page ${pageNumber} of ${pageCount}`,
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
// SUMMARY PAGE
// ============================================================

function drawOverview(doc, run, results) {
  addPageHeader(doc);

  doc
    .font(FONT_BOLD)
    .fontSize(22)
    .fillColor(COLORS.primary)
    .text("Test Execution Report", PAGE.margin, doc.y, {
      width: doc.page.width - PAGE.margin * 2,
    });

  doc.moveDown(0.4);

  doc
    .font(FONT_REGULAR)
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(`Run ID: ${run.run_id}`);

  doc.moveDown(1);

  drawSectionTitle(doc, "Execution Overview");

  drawField(doc, "Test Run ID", run.run_id);
  drawField(doc, "Test Date", formatDate(run.started_at));
  drawField(doc, "Tester Name", run.tester_name);
  drawField(doc, "Browser", run.browser);
  drawField(doc, "Environment", run.environment);
  drawField(doc, "Branch", run.branch_name);
  drawField(doc, "Git Commit", run.git_commit);
  drawField(doc, "CI Run ID", run.ci_run_id);
  drawField(doc, "Finished At", formatDate(run.finished_at));

  const counts = {
    total: results.length,
    passed: results.filter((r) => r.result_status === "passed").length,
    failed: results.filter((r) => r.result_status === "failed").length,
    timedOut: results.filter((r) => r.result_status === "timedOut").length,
    skipped: results.filter((r) => r.result_status === "skipped").length,
    interrupted: results.filter((r) => r.result_status === "interrupted")
      .length,
  };

  drawSectionTitle(doc, "Execution Statistics");

  const statistics = [
    ["Total Tests", counts.total, COLORS.primary],
    ["Passed", counts.passed, COLORS.passed],
    ["Failed", counts.failed, COLORS.failed],
    ["Timed Out", counts.timedOut, COLORS.timedOut],
    ["Skipped", counts.skipped, COLORS.skipped],
    ["Interrupted", counts.interrupted, COLORS.interrupted],
  ];

  const gap = 8;
  const cardWidth = (doc.page.width - PAGE.margin * 2 - gap * 2) / 3;
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

  drawField(doc, "Pass Rate", getPassRate(results));

  if (results.length === 0) {
    drawField(doc, "Note", "No test results were found for this run.");
    return;
  }

  drawSummaryTable(doc, results);
}

// ============================================================
// TEST CASE DETAIL
// ============================================================

function drawTestDetails(doc, result, steps, testData, evidences) {
  addNewPage(doc, "QA TEST EXECUTION REPORT");

  doc
    .font(FONT_BOLD)
    .fontSize(16)
    .fillColor(COLORS.primary)
    .text(
      `${safeText(result.tc_code, "TEST")} — ${safeText(result.test_name)}`,
      PAGE.margin,
      doc.y,
      {
        width: doc.page.width - PAGE.margin * 2,
      },
    );

  doc.moveDown(0.5);

  drawStatusBanner(doc, result.result_status);

  drawSectionTitle(doc, "Test Case Information");

  drawField(doc, "Test Case Code", result.tc_code);
  drawField(doc, "Test Case Name", result.test_name);
  drawField(doc, "Suite", result.suite_name);
  drawField(doc, "Specification", result.spec_code);
  drawField(doc, "Screen", result.screen_name);
  drawField(doc, "Test Type", result.test_type);
  drawField(doc, "Priority", result.priority);
  drawField(doc, "Test Date", formatDate(result.test_date));
  drawField(doc, "Tester Name", result.tester_name);
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
    testSteps.forEach((step) => {
      drawField(doc, `Step ${step.step_order}`, step.step_action);

      if (step.step_target) {
        drawField(doc, "Target", step.step_target);
      }

      if (step.expected_result) {
        drawField(doc, "Step Expected Result", step.expected_result);
      }
    });
  }

  drawSectionTitle(doc, "Input / Test Data");

  const dataRows = testData.filter(
    (item) => Number(item.test_id) === Number(result.test_id),
  );

  if (dataRows.length === 0) {
    drawField(doc, "Test Data", "No test data recorded.");
  } else {
    dataRows.forEach((item) => {
      drawField(doc, item.field_name, item.data_value);

      drawField(doc, "Input Validity", item.is_valid ? "Valid" : "Invalid");
    });
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

  drawField(doc, "Execution Time", formatDuration(result.execution_time_ms));

  drawField(doc, "Retry Count", result.retry_count);
  drawField(doc, "Execution ID", result.execution_id);
  drawField(doc, "Test Run ID", result.run_id);

  drawSectionTitle(doc, "Evidence");

  const resultEvidence = evidences.filter(
    (item) => Number(item.result_id) === Number(result.execution_id),
  );

  if (resultEvidence.length === 0) {
    drawField(doc, "Evidence", "No evidence recorded.");
  } else {
    resultEvidence.forEach((item, index) => {
      const evidence = resolveEvidence(item.file_path);

      drawField(
        doc,
        `Evidence ${index + 1}`,
        `${item.evidence_type} — ${evidence.label}`,
      );

      if (evidence.url) {
        const linkLabel = "Open evidence";

        ensureSpace(doc, 24, "QA TEST EXECUTION REPORT");

        doc
          .font(FONT_BOLD)
          .fontSize(9)
          .fillColor("#1769AA")
          .text(linkLabel, PAGE.margin + 118, doc.y, {
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
// MAIN EXPORT FUNCTION
// ============================================================

async function exportPdfReport() {
  let outputPath;

  try {
    console.log("Loading latest test run...");

    const run = await getLatestRun();

    if (!run) {
      throw new Error("No test run found in test_runs. Execute tests first.");
    }

    console.log(`Exporting report for run ${run.run_id}...`);

    const results = await getRunResults(run.run_id);

    const testIds = [...new Set(results.map((item) => Number(item.test_id)))];

    const executionIds = results.map((item) => Number(item.execution_id));

    const [steps, testData, evidences] = await Promise.all([
      getSteps(testIds),
      getTestData(testIds),
      getEvidence(executionIds),
    ]);

    outputPath = getOutputPath(run.run_id);

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
        Title: `QA Test Execution Report - Run ${run.run_id}`,
        Author: "QA Test Automation System",
        Subject: "Test Execution Results",
      },
    });

    registerFonts(doc);

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Overview page.
    drawOverview(doc, run, results);

    // Detail page for every test execution.
    for (const result of results) {
      drawTestDetails(doc, result, steps, testData, evidences);
    }

    // Add page numbers after all content has been generated.
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
  exportPdfReport().catch(() => {
    process.exitCode = 1;
  });
}

module.exports = {
  exportPdfReport,
};
