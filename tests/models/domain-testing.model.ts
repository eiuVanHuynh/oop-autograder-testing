export type PillarType = 'MMD_DIAGRAM' | 'DECLARATION_TEST' | 'OPERATIONAL_TESTCASE';

export interface FolderStructureTest {
    testName: string;
    rootFolderName: string;
    containedSubfolders: string[];
    containedFiles: string[];
    expectedParsingResult: string;
}

export interface RubricEditorTest {
    testName: string;
    targetComponent: string;
    actionType: string;
    inputConfigData: Record<string, any>;
    expectedDatabaseState: string;
}

export interface EvaluationTest {
    testId: string;
    pillarType: PillarType;
    referenceSolutionPath: string;
    studentSubmissionPath: string;
    expectedScore: number;
    allowPartialCredit: boolean;
}