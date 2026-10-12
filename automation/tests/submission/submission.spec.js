const { test, expect } = require("@playwright/test");
const path = require("path");

const {
  PillarType,
  ParsingStatus,
  FolderStructureTest,
  EvaluationTest,
} = require("../models/submission.model");

const { Dropzone, DropzoneTest } = require("../models/ui.model");

const { TestType, TestCase } = require("../models/test-case.model");

async function loginAsStudent(page) {
  await page.goto("/login");

  await page
    .getByPlaceholder("e.g. 20521234")
    .fill(process.env.TEST_STUDENT_IRN);

  await page
    .getByPlaceholder("Enter your password")
    .fill(process.env.TEST_STUDENT_PASSWORD);

  await page
    .getByRole("button", {
      name: "Sign In",
    })
    .click();

  await page.waitForURL(/\/student-dashboard/);
}

const tc13Folder = new FolderStructureTest(
  "TC-13_Select_Lab",
  "lab-1",
  [],
  [],
  "SUCCESS",
);

const tc13TestCase = new TestCase(
  "TC-13",
  "STUDENT_SUBMISSION",
  "Chọn bài tập Lab từ Dashboard",
  "Student chọn một Lab từ Student Dashboard.",
  "FR-10",
  TestType.UI_COMPONENT,
);

const tc14Dropzone = new Dropzone(
  [".java", ".mmd"],
  10,
  "Upload your submission",
  false,
);

const tc14DropzoneTest = new DropzoneTest(
  "TC-14_Valid_Submission",
  tc14Dropzone,
  [
    "challenge_1/Solution.java",
    "challenge_1/Diagram.mmd",
    "challenge_2/Solution.java",
    "challenge_2/Diagram.mmd",
  ],
  ParsingStatus.SUCCESS,
);

const tc14Folder = new FolderStructureTest(
  "TC-14_Valid_Folder_Structure",
  "20211001_NguyenVanA_lab_1",
  ["challenge_1", "challenge_2"],
  ["Solution.java", "Diagram.mmd"],
  "SUCCESS",
);

const tc14EvaluationChallenge1Mmd = new EvaluationTest(
  "TC-14-CH1-MMD",
  PillarType.MMD_DIAGRAM,
  "reference/challenge_1/Diagram.mmd",
  "20211001_NguyenVanA_lab_1/challenge_1/Diagram.mmd",
  10.0,
  true,
);

const tc14EvaluationChallenge1Declaration = new EvaluationTest(
  "TC-14-CH1-DECLARATION",
  PillarType.DECLARATION_TEST,
  "reference/challenge_1/Solution.java",
  "20211001_NguyenVanA_lab_1/challenge_1/Solution.java",
  10.0,
  true,
);

const tc14EvaluationChallenge1Operational = new EvaluationTest(
  "TC-14-CH1-OPERATIONAL",
  PillarType.OPERATIONAL_TESTCASE,
  "reference/challenge_1/Solution.java",
  "20211001_NguyenVanA_lab_1/challenge_1/Solution.java",
  10.0,
  true,
);

const tc14TestCase = new TestCase(
  "TC-14",
  "STUDENT_SUBMISSION",
  "Nộp thư mục bài làm đúng định dạng",
  "Student upload submission với cấu trúc folder hợp lệ.",
  "FR-11",
  TestType.SUBMISSION_STRUCTURE,
);

const tc15Dropzone = new Dropzone(
  [".java", ".mmd"],
  10,
  "Upload your submission",
  false,
);

const tc15DropzoneTest = new DropzoneTest(
  "TC-15_Invalid_Submission_Folder",
  tc15Dropzone,
  [
    "chall_1_wrong/Solution.java",
    "challenge_2/Solution.java",
    "challenge_2/Diagram.mmd",
  ],
  ParsingStatus.FAILED_NAMING,
);

const tc15Folder = new FolderStructureTest(
  "TC-15_Invalid_Subfolder_Name",
  "20211001_NguyenVanA_lab_1",
  ["chall_1_wrong", "challenge_2"],
  ["Solution.java", "Diagram.mmd"],
  "FAILED_NAMING",
);

const tc15EvaluationChallenge1 = new EvaluationTest(
  "TC-15-CH1",
  PillarType.DECLARATION_TEST,
  "reference/challenge_1/Solution.java",
  "20211001_NguyenVanA_lab_1/chall_1_wrong/Solution.java",
  0.0,
  false,
);

const tc15EvaluationChallenge2 = new EvaluationTest(
  "TC-15-CH2",
  PillarType.DECLARATION_TEST,
  "reference/challenge_2/Solution.java",
  "20211001_NguyenVanA_lab_1/challenge_2/Solution.java",
  10.0,
  true,
);

const tc15TestCase = new TestCase(
  "TC-15",
  "STUDENT_SUBMISSION",
  "Xử lý thư mục sai định dạng tên một phần",
  "Hệ thống xử lý submission khi một challenge có tên folder không hợp lệ.",
  "FR-12",
  TestType.SUBMISSION_STRUCTURE,
);

test(`${tc13TestCase.testId} - ${tc13TestCase.title}`, async ({ page }) => {
  await loginAsStudent(page);

  await page.goto("/student-dashboard");

  await page.getByTestId("lab-card-lab-1").click();

  await expect(page).toHaveURL(/\/labs\/lab-1\/submission/);

  await expect(page.getByText(/submissions|số lần nộp/i)).toBeVisible();

  await expect(page.getByText(/highest score|điểm cao nhất/i)).toBeVisible();

  expect(tc13Folder.expectedParsingResult).toBe("SUCCESS");
});

test(`${tc14TestCase.testId} - ${tc14TestCase.title}`, async ({ page }) => {
  await loginAsStudent(page);

  await page.goto("/labs/lab-1/submission");

  expect(tc14DropzoneTest.expectedParsingStatus).toBe(ParsingStatus.SUCCESS);

  expect(tc14Folder.rootFolderName).toBe("20211001_NguyenVanA_lab_1");

  expect(tc14Folder.containedSubfolders).toEqual([
    "challenge_1",
    "challenge_2",
  ]);

  expect(tc14EvaluationChallenge1Mmd.pillarType).toBe(PillarType.MMD_DIAGRAM);

  expect(tc14EvaluationChallenge1Declaration.pillarType).toBe(
    PillarType.DECLARATION_TEST,
  );

  expect(tc14EvaluationChallenge1Operational.pillarType).toBe(
    PillarType.OPERATIONAL_TESTCASE,
  );

  const files = [
    path.resolve(
      __dirname,
      "../../fixtures/20211001_NguyenVanA_lab_1/challenge_1/Solution.java",
    ),

    path.resolve(
      __dirname,
      "../../fixtures/20211001_NguyenVanA_lab_1/challenge_1/Diagram.mmd",
    ),

    path.resolve(
      __dirname,
      "../../fixtures/20211001_NguyenVanA_lab_1/challenge_2/Solution.java",
    ),

    path.resolve(
      __dirname,
      "../../fixtures/20211001_NguyenVanA_lab_1/challenge_2/Diagram.mmd",
    ),
  ];

  await page.locator('input[type="file"]').setInputFiles(files);

  await expect(page.getByText(/total score|tổng điểm/i)).toBeVisible({
    timeout: 15000,
  });

  await expect(page.getByTestId("challenge-1-score")).not.toHaveText("0");

  await expect(page.getByTestId("challenge-2-score")).not.toHaveText("0");
});

test(`${tc15TestCase.testId} - ${tc15TestCase.title}`, async ({ page }) => {
  await loginAsStudent(page);

  await page.goto("/labs/lab-1/submission");

  expect(tc15DropzoneTest.expectedParsingStatus).toBe(
    ParsingStatus.FAILED_NAMING,
  );

  expect(tc15Folder.expectedParsingResult).toBe("FAILED_NAMING");

  expect(tc15EvaluationChallenge1.expectedScore).toBe(0.0);

  expect(tc15EvaluationChallenge2.expectedScore).toBe(10.0);

  const files = [
    path.resolve(
      __dirname,
      "../../fixtures/20211001_NguyenVanA_lab_1/chall_1_wrong/Solution.java",
    ),

    path.resolve(
      __dirname,
      "../../fixtures/20211001_NguyenVanA_lab_1/challenge_2/Solution.java",
    ),

    path.resolve(
      __dirname,
      "../../fixtures/20211001_NguyenVanA_lab_1/challenge_2/Diagram.mmd",
    ),
  ];

  await page.locator('input[type="file"]').setInputFiles(files);

  await expect(page.getByText(/total score|tổng điểm/i)).toBeVisible({
    timeout: 15000,
  });

  await expect(page.getByTestId("challenge-1-score")).toHaveText("0");

  await expect(page.getByTestId("challenge-2-score")).not.toHaveText("0");
});

// ==========================================
// THÊM PHẦN HÀM HELPER LOAD DATABASE (D7)
// ==========================================
// Giả định bạn có hàm loadTestCase từ helper hoặc viết trực tiếp logic query DB ở đây:
// const { loadTestCase } = require("../../helpers/dbHelper");

// Hoặc hàm loadTestCase mẫu tích hợp vào file test:
async function loadTestCase(tcCode) {
  // Logic kết nối DB và lấy steps, data dựa theo tcCode
  // Trả về đối tượng gồm { steps, data }
  // Ví dụ cấu trúc mock/thực tế từ DB:
  return {
    steps: [], // Lấy từ bảng Test_Steps
    data: [], // Lấy từ bảng Test_Data (trong đó có chứa đường dẫn fixture hoặc scenario)
  };
}

// Hàm hỗ trợ phân giải cú pháp action/target động từ DB
async function executeDynamicSteps(page, tcCode) {
  const { steps, data } = await loadTestCase(tcCode);

  // Chuyển đổi data thành map để dễ tra cứu giá trị động (ví dụ: lấy fixture path từ DB)
  const dataMap = data.reduce((acc, item) => {
    acc[item.field_name] = item.value;
    return acc;
  }, {});

  for (const step of steps.sort((a, b) => a.step_order - b.step_order)) {
    const { action, target } = step;

    switch (action) {
      case "NAVIGATE":
        await page.goto(target);
        break;
      case "CLICK":
        await page.locator(target).click();
        break;
      case "UPLOAD": {
        // Lấy đường dẫn fixture động từ trường dữ liệu trong Test_Data (đã lưu trong DB)
        const fixtureRelPath =
          dataMap["fixture_path"] || dataMap["scenario"] || "";
        const fullPath = path.resolve(
          __dirname,
          `../../fixtures/${fixtureRelPath}`,
        );
        await page
          .locator(target || 'input[type="file"]')
          .setInputFiles(fullPath);
        break;
      }
      case "VERIFY":
        if (target) {
          await expect(page.locator(target)).toBeVisible();
        }
        break;
      default:
        break;
    }
  }
}

// ==========================================
// LÔ TIẾP THEO: TC-16, TC-17, TC-18 (D7 - Dùng loadTestCase động)
// ==========================================

test("TC-16 - Kiểm tra validate khi thiếu challenge bắt buộc", async ({
  page,
}) => {
  await loginAsStudent(page);
  await page.goto("/labs/lab-1/submission");

  // Tải dữ liệu và bước động từ database cho TC-16
  await executeDynamicSteps(page, "TC-16");

  // Các bước kiểm tra bổ sung đặc thù cho TC-16 nếu cần
  await expect(page.getByText(/missing challenge|thiếu/i)).toBeVisible();
});

test("TC-17 - Kiểm tra upload sai định dạng file", async ({ page }) => {
  await loginAsStudent(page);
  await page.goto("/labs/lab-1/submission");

  // Tải dữ liệu và bước động từ database cho TC-17
  await executeDynamicSteps(page, "TC-17");

  await expect(page.getByText(/invalid format|sai định dạng/i)).toBeVisible();
});

test("TC-18 - Kiểm tra hiển thị lịch sử submission", async ({ page }) => {
  await loginAsStudent(page);
  await page.goto("/labs/lab-1/submission");

  // Tải dữ liệu và bước động từ database cho TC-18
  await executeDynamicSteps(page, "TC-18");

  await expect(page.getByTestId("submission-history-list")).toBeVisible();
});
// ==========================================
// LÔ TIẾP THEO: TC-19, TC-20, TC-21, TC-22 (D7)
// ==========================================

test("TC-19 - Kiểm tra tính năng xóa bài nộp hoặc reset submission", async ({
  page,
}) => {
  await loginAsStudent(page);
  await page.goto("/labs/lab-1/submission");

  // Tải dữ liệu và bước động từ database cho TC-19
  await executeDynamicSteps(page, "TC-19");

  // Kiểm tra xác nhận reset/xóa file nộp thành công
  await expect(
    page.getByText(/reset|xóa thành công|bắt đầu lại/i),
  ).toBeVisible();
});

test("TC-20 - Kiểm tra giới hạn số lần nộp bài (Submission Limit)", async ({
  page,
}) => {
  await loginAsStudent(page);
  await page.goto("/labs/lab-1/submission");

  // Tải dữ liệu và bước động từ database cho TC-20
  await executeDynamicSteps(page, "TC-20");

  // Kiểm tra thông báo vượt quá số lần nộp cho phép
  await expect(page.getByText(/limit reached|vượt quá số lần/i)).toBeVisible();
});

test("TC-21 - Kiểm tra xem chi tiết điểm số từng challenge sau khi chấm", async ({
  page,
}) => {
  await loginAsStudent(page);
  await page.goto("/labs/lab-1/submission");

  // Tải dữ liệu và bước động từ database cho TC-21
  await executeDynamicSteps(page, "TC-21");

  // Kiểm tra hiển thị bảng điểm chi tiết các tiêu chí (Declaration, Operational, MMD)
  await expect(page.getByTestId("grading-breakdown-panel")).toBeVisible();
});

test("TC-22 - Kiểm tra phản hồi lỗi cú pháp biên dịch code Java từ hệ thống", async ({
  page,
}) => {
  await loginAsStudent(page);
  await page.goto("/labs/lab-1/submission");

  // Tải dữ liệu và bước động từ database cho TC-22
  await executeDynamicSteps(page, "TC-22");

  // Kiểm tra hiển thị log lỗi biên dịch (Compilation Error)
  await expect(
    page.getByText(/compilation error|lỗi biên dịch|syntax error/i),
  ).toBeVisible();
});
gi;
