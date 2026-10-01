const InputType = Object.freeze({
  TEXT: 'TEXT',
  PASSWORD: 'PASSWORD',
  EMAIL: 'EMAIL',
  NUMBER: 'NUMBER',
});

const ExpectedAction = Object.freeze({
  REDIRECT: 'REDIRECT',
  SUBMIT: 'SUBMIT',
  OPEN_MODAL: 'OPEN_MODAL',
});

class Button {
  constructor(
    label,
    href,
    backgroundColor,
    textColor,
    isDisabled,
    isVisible
  ) {
    this.label = label;
    this.href = href;
    this.backgroundColor = backgroundColor;
    this.textColor = textColor;
    this.isDisabled = isDisabled;
    this.isVisible = isVisible;
  }
}

class InputField {
  constructor(
    placeholder,
    value,
    inputType,
    isRequired,
    errorMessage
  ) {
    this.placeholder = placeholder;
    this.value = value;
    this.inputType = inputType;
    this.isRequired = isRequired;
    this.errorMessage = errorMessage;
  }
}

class Dropzone {
  constructor(
    acceptedFileExtensions,
    maxFileSizeMb,
    dropzoneMessage,
    isDragActive
  ) {
    this.acceptedFileExtensions = acceptedFileExtensions;
    this.maxFileSizeMb = maxFileSizeMb;
    this.dropzoneMessage = dropzoneMessage;
    this.isDragActive = isDragActive;
  }
}

class Tab {
  constructor(
    label,
    isActive,
    badgeCount,
    targetPaneId
  ) {
    this.label = label;
    this.isActive = isActive;
    this.badgeCount = badgeCount;
    this.targetPaneId = targetPaneId;
  }
}

class Table {
  constructor(
    columnHeaders,
    rowCount,
    dataRows,
    isExportable
  ) {
    this.columnHeaders = columnHeaders;
    this.rowCount = rowCount;
    this.dataRows = dataRows;
    this.isExportable = isExportable;
  }
}

class ChartComponent {
  constructor(
    chartType,
    dataLabels,
    dataValues,
    title
  ) {
    this.chartType = chartType;
    this.dataLabels = dataLabels;
    this.dataValues = dataValues;
    this.title = title;
  }
}

class ButtonTest {
  constructor(
    name,
    button,
    expectedAction,
    expectedResultUrl
  ) {
    this.name = name;
    this.button = button;
    this.expectedAction = expectedAction;
    this.expectedResultUrl = expectedResultUrl;
  }
}

class InputFieldTest {
  constructor(
    name,
    inputField,
    testInputData,
    expectedValidationError
  ) {
    this.name = name;
    this.inputField = inputField;
    this.testInputData = testInputData;
    this.expectedValidationError = expectedValidationError;
  }
}

class DropzoneTest {
  constructor(
    name,
    dropzone,
    uploadedFilePaths,
    expectedParsingStatus
  ) {
    this.name = name;
    this.dropzone = dropzone;
    this.uploadedFilePaths = uploadedFilePaths;
    this.expectedParsingStatus = expectedParsingStatus;
  }
}

class TabTest {
  constructor(
    name,
    tab,
    expectedLoadedContentId
  ) {
    this.name = name;
    this.tab = tab;
    this.expectedLoadedContentId = expectedLoadedContentId;
  }
}

class TableTest {
  constructor(
    name,
    table,
    expectedMinRows,
    searchableKeyword
  ) {
    this.name = name;
    this.table = table;
    this.expectedMinRows = expectedMinRows;
    this.searchableKeyword = searchableKeyword;
  }
}

class ChartTest {
  constructor(
    name,
    chart,
    expectedMinDataPoints
  ) {
    this.name = name;
    this.chart = chart;
    this.expectedMinDataPoints = expectedMinDataPoints;
  }
}

module.exports = {
  InputType,
  ExpectedAction,

  Button,
  InputField,
  Dropzone,
  Tab,
  Table,
  ChartComponent,

  ButtonTest,
  InputFieldTest,
  DropzoneTest,
  TabTest,
  TableTest,
  ChartTest,
};