
const PillarType = Object.freeze({
  MMD_DIAGRAM: 'MMD_DIAGRAM',
  DECLARATION_TEST: 'DECLARATION_TEST',
  OPERATIONAL_TESTCASE: 'OPERATIONAL_TESTCASE',
});

const ParsingStatus = Object.freeze({
  SUCCESS: 'SUCCESS',
  FAILED_NAMING: 'FAILED_NAMING',
  SYNTAX_ERROR: 'SYNTAX_ERROR',
});

class FolderStructureTest {
  constructor(
    testName,
    rootFolderName,
    containedSubfolders,
    containedFiles,
    expectedParsingResult
  ) {
    this.testName = testName;
    this.rootFolderName = rootFolderName;
    this.containedSubfolders = containedSubfolders;
    this.containedFiles = containedFiles;
    this.expectedParsingResult = expectedParsingResult;
  }
}

class RubricEditorTest {
  constructor(
    testName,
    targetComponent,
    actionType,
    inputConfigData,
    expectedDatabaseState
  ) {
    this.testName = testName;
    this.targetComponent = targetComponent;
    this.actionType = actionType;
    this.inputConfigData = inputConfigData;
    this.expectedDatabaseState = expectedDatabaseState;
  }
}

class EvaluationTest {
  constructor(
    testId,
    pillarType,
    referenceSolutionPath,
    studentSubmissionPath,
    expectedScore,
    allowPartialCredit
  ) {
    this.testId = testId;
    this.pillarType = pillarType;
    this.referenceSolutionPath = referenceSolutionPath;
    this.studentSubmissionPath = studentSubmissionPath;
    this.expectedScore = expectedScore;
    this.allowPartialCredit = allowPartialCredit;
  }
}

module.exports = {
  PillarType,
  ParsingStatus,
  FolderStructureTest,
  RubricEditorTest,
  EvaluationTest,
};