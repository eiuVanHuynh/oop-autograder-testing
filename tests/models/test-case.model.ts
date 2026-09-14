export type TestType = 'UI_COMPONENT' | 'AUTHENTICATION' | 'SUBMISSION_STRUCTURE' | 'GRADING_ENGINE' | 'RUBRIC_EDITOR';
export type ExecutionStatus = 'PASSED' | 'FAILED' | 'ERROR' | 'SKIPPED';

export interface TestCase {
    testId: string;
    module: string;
    title: string;
    description: string;
    sourceReference: string;
    testType: TestType;
}

export interface TestExecutionResult {
    executionId: string;
    testId: string;
    status: ExecutionStatus;
    actualOutput: string;
    executionTimeMs: number;
    errorMessage: string;
}