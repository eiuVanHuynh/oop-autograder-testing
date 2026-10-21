
const TestType = Object.freeze({
  UI_COMPONENT: 'UI_COMPONENT',
  AUTHENTICATION: 'AUTHENTICATION',
  SUBMISSION_STRUCTURE: 'SUBMISSION_STRUCTURE',
  GRADING_ENGINE: 'GRADING_ENGINE',
  RUBRIC_EDITOR: 'RUBRIC_EDITOR',
});

const ExecutionStatus = Object.freeze({
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  ERROR: 'ERROR',
  SKIPPED: 'SKIPPED',
});

class TestCase {
  constructor(
    testId,
    module,
    title,
    description,
    sourceReference,
    testType
  ) {
    this.testId = testId;
    this.module = module;
    this.title = title;
    this.description = description;
    this.sourceReference = sourceReference;
    this.testType = testType;
  }
}

class TestExecutionResult {
  constructor(
    executionId,
    testId,
    status,
    actualOutput,
    executionTimeMs,
    errorMessage
  ) {
    this.executionId = executionId;
    this.testId = testId;
    this.status = status;
    this.actualOutput = actualOutput;
    this.executionTimeMs = executionTimeMs;
    this.errorMessage = errorMessage;
  }
}

module.exports = {
  TestType,
  ExecutionStatus,
  TestCase,
  TestExecutionResult,
};