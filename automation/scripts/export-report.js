const fs = require("fs");
const os = require("os");
const path = require("path");
const PDFDocument = require("pdfkit");
const { query, closeDb } = require("../tests/utils/db-client");

// Test_Results.status (ENUM) -> nhãn hiển thị
const STATUS_LABEL = {
  passed: "PASSED",
  failed: "FAILED",
  timedOut: "TIMED OUT",
  skipped: "SKIPPED",
  interrupted: "INTERRUPTED",
};

const TIMEZONE = "Asia/Ho_Chi_Minh";
const fmtTime = (d) =>
  d ? new Date(d).toLocaleString("en-GB", { timeZone: TIMEZONE }) : "N/A";

async function exportPDFReport() {
  try {
    console.log("Fetching data from the database...");

    // 1. Lấy thông tin Test Run mới nhất
    const runs = await query(
      "SELECT * FROM Test_Runs ORDER BY run_id DESC LIMIT 1",
    );

    if (!runs || runs.length === 0) {
      console.log("No Test Run records found in the database.");
      await closeDb();
      return;
    }
    const latestRun = runs[0];
    const runId = latestRun.run_id;

    // 2. Lấy kết quả test của run này (tc_code lấy từ Test_Cases)
    const results = await query(
      `
      SELECT
        tc.tc_code,
        tc.title,
        tr.status,
        tr.execution_time_ms,
        tr.retry_count
      FROM Test_Results tr
      JOIN Test_Cases tc
        ON tr.test_id = tc.test_id
      WHERE tr.run_id = ?
      ORDER BY tr.execution_id
      `,
      [runId],
    );

    // 3. Thư mục lưu file
    const downloadsDir = path.join(
      process.env.USERPROFILE || process.env.HOME || os.homedir(),
      "Downloads",
    );
    const customDir = process.env.REPORT_OUTPUT_DIR || downloadsDir;

    if (!fs.existsSync(customDir)) {
      fs.mkdirSync(customDir, { recursive: true });
    }

    const vnTime = fmtTime(new Date());
    const existingFiles = fs.readdirSync(customDir);
    const reportCount =
      existingFiles.filter(
        (f) => f.startsWith("Test_Report_") && f.endsWith(".pdf"),
      ).length + 1;
    const fileName = `Test_Report_${reportCount}.pdf`;
    const filePath = path.join(customDir, fileName);

    // 4. Khởi tạo PDFDocument
    const doc = new PDFDocument({ margin: 30, size: "A4" });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // --- XỬ LÝ FONT TIẾNG VIỆT (Windows / macOS / Linux) ---
    let fontPath = "Helvetica";
    const possibleFonts = [
      "C:/Windows/Fonts/arial.ttf",
      "C:/Windows/Fonts/segoeui.ttf",
      "C:/Windows/Fonts/tahoma.ttf",
      "/System/Library/Fonts/Supplemental/Arial.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ];
    for (const f of possibleFonts) {
      if (fs.existsSync(f)) {
        fontPath = f;
        break;
      }
    }

    doc.font(fontPath);

    // Tiêu đề báo cáo
    doc
      .fontSize(18)
      .fillColor("#1e293b")
      .text("TEST EXECUTION REPORT", { align: "center" });
    doc.moveDown(0.5);

    // Thông tin chung
    doc.fontSize(10).fillColor("#334155");
    doc.text(`Run ID: ${runId}`);
    doc.text(`Environment: ${latestRun.environment || "N/A"}`);
    doc.text(`Browser: ${latestRun.browser || "N/A"}`);
    doc.text(`Started At (VN Time): ${fmtTime(latestRun.started_at)}`);
    doc.text(`Finished At (VN Time): ${fmtTime(latestRun.finished_at)}`);
    if (latestRun.branch_name) doc.text(`Branch: ${latestRun.branch_name}`);
    if (latestRun.git_commit)
      doc.text(`Commit: ${String(latestRun.git_commit).slice(0, 8)}`);
    doc.text(`Report Generated Time (VN Time): ${vnTime}`);
    doc.moveDown();

    // 5. Bảng kết quả chi tiết
    doc
      .fontSize(12)
      .fillColor("#0f172a")
      .text("Test Cases Execution Details:", { underline: true });
    doc.moveDown(0.5);

    if (!results || results.length === 0) {
      doc
        .fontSize(10)
        .fillColor("#dc2626")
        .text("No detailed test case results were recorded for this run.");
    } else {
      const colX = [30, 65, 160, 370, 445];
      const colWidths = [35, 95, 210, 75, 90];
      const tableLeft = 30;
      const tableWidth = 535;

      // Hàm vẽ tiêu đề cột: Nền xám (#9b9fb7), chữ đen, canh giữa, viền đen
      const drawTableHeader = (y) => {
        doc.fillColor("#9b9fb7").rect(tableLeft, y, tableWidth, 24).fill();

        doc.fontSize(9).fillColor("#000000");

        doc.text("NO.", colX[0], y + 7, {
          width: colWidths[0],
          align: "center",
        });
        doc.text("Testcase Number", colX[1], y + 7, {
          width: colWidths[1],
          align: "center",
        });
        doc.text("Testcase Name", colX[2], y + 7, {
          width: colWidths[2],
          align: "center",
        });
        doc.text("Result", colX[3], y + 7, {
          width: colWidths[3],
          align: "center",
        });
        doc.text("Feedback", colX[4], y + 7, {
          width: colWidths[4],
          align: "center",
        });

        doc.strokeColor("#000000").lineWidth(0.8);
        doc.rect(tableLeft, y, tableWidth, 24).stroke();

        let currentX = tableLeft;
        for (let i = 0; i < colWidths.length - 1; i++) {
          currentX += colWidths[i];
          doc
            .moveTo(currentX, y)
            .lineTo(currentX, y + 24)
            .stroke();
        }
      };

      let currentY = doc.y;
      drawTableHeader(currentY);
      currentY += 24;

      doc.fontSize(8.5);

      results.forEach((row, index) => {
        const testNumber = row.tc_code || `TC-0${index + 1}`;
        const testName = row.title || "N/A";
        const resultStatus = STATUS_LABEL[row.status] || "UNKNOWN";
        const feedback = ""; // Để trống theo yêu cầu

        // Tính chiều cao dòng dựa theo độ dài tên Testcase Name
        const nameHeight = doc.heightOfString(testName, {
          width: colWidths[2] - 8,
        });
        const rowHeight = Math.max(26, nameHeight + 10);

        // Ngắt trang tự động nếu gần hết trang
        if (currentY + rowHeight > 780) {
          doc.addPage();
          currentY = 40;
          drawTableHeader(currentY);
          currentY += 24;
          doc.fontSize(8.5);
        }

        // Khung viền ngoài của dòng dữ liệu
        doc.strokeColor("#000000").lineWidth(0.5);
        doc.rect(tableLeft, currentY, tableWidth, rowHeight).stroke();

        // Đường kẻ dọc phân cách cột
        let lineX = tableLeft;
        for (let i = 0; i < colWidths.length - 1; i++) {
          lineX += colWidths[i];
          doc
            .moveTo(lineX, currentY)
            .lineTo(lineX, currentY + rowHeight)
            .stroke();
        }

        // Nội dung các ô dữ liệu
        doc.fillColor("#1e293b");
        doc.text(String(index + 1), colX[0], currentY + 7, {
          width: colWidths[0],
          align: "center",
        });
        doc.text(testNumber, colX[1], currentY + 7, {
          width: colWidths[1],
          align: "center",
        });
        doc.text(testName, colX[2] + 4, currentY + 7, {
          width: colWidths[2] - 8,
          align: "left",
        });

        // Màu Result: xanh lá (passed), đỏ (failed/timedOut), cam (còn lại)
        if (row.status === "passed") {
          doc.fillColor("#16a34a");
        } else if (row.status === "failed" || row.status === "timedOut") {
          doc.fillColor("#dc2626");
        } else {
          doc.fillColor("#d97706");
        }
        doc.text(resultStatus, colX[3], currentY + 7, {
          width: colWidths[3],
          align: "center",
        });

        // Cột Feedback để trống
        doc.fillColor("#1e293b");
        doc.text(feedback, colX[4], currentY + 7, {
          width: colWidths[4],
          align: "center",
        });

        currentY += rowHeight;
      });
    }

    doc.end();

    stream.on("finish", () => {
      console.log(
        `\nPDF Report generated successfully! File saved at: ${filePath}`,
      );
    });
  } catch (error) {
    console.error("Error generating PDF report:", error);
  } finally {
    await closeDb();
  }
}

exportPDFReport();