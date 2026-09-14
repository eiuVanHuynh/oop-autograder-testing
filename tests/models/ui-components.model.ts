export type InputType = 'TEXT' | 'PASSWORD' | 'EMAIL' | 'NUMBER';
export type ExpectedAction = 'REDIRECT' | 'SUBMIT' | 'OPEN_MODAL';
export type ParsingStatus = 'SUCCESS' | 'FAILED_NAMING' | 'SYNTAX_ERROR';

export interface Button {
    label: string;
    href: string;
    backgroundColor: string;
    textColor: string;
    isDisabled: boolean;
    isVisible: boolean;
}

export interface InputField {
    placeholder: string;
    value: string;
    inputType: InputType;
    isRequired: boolean;
    errorMessage: string;
}

export interface Dropzone {
    acceptedFileExtensions: string[];
    maxFileSizeMb: number;
    dropzoneMessage: string;
    isDragActive: boolean;
}

export interface Tab {
    label: string;
    isActive: boolean;
    badgeCount: number;
    targetPaneId: string;
}

export interface Table {
    columnHeaders: string[];
    rowCount: number;
    dataRows: Record<string, string>[];
    isExportable: boolean;
}

export interface ButtonTest {
    name: string;
    button: Button;
    expectedAction: ExpectedAction;
    expectedResultUrl: string;
}

export interface InputFieldTest {
    name: string;
    inputField: InputField;
    testInputData: string;
    expectedValidationError: string;
}

export interface DropzoneTest {
    name: string;
    dropzone: Dropzone;
    uploadedFilePaths: string[];
    expectedParsingStatus: ParsingStatus;
}

export interface TabTest {
    name: string;
    tab: Tab;
    expectedLoadedContentId: string;
}

export interface TableTest {
    name: string;
    table: Table;
    expectedMinRows: number;
    searchableKeyword: string;
}
