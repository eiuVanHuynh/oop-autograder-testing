
const AuthType = Object.freeze({
  GOOGLE_OAUTH: 'GOOGLE_OAUTH',
  IRN_PASSWORD: 'IRN_PASSWORD',
});

const UserRole = Object.freeze({
  STUDENT: 'STUDENT',
  LECTURER: 'LECTURER',
  NONE: 'NONE',
});

class AuthenticationTest {
  constructor(
    testName,
    authType,
    providedEmail,
    providedPassword,
    expectedAuthStatus,
    expectedRedirectRole,
    expectedErrorMessage
  ) {
    this.testName = testName;
    this.authType = authType;
    this.providedEmail = providedEmail;
    this.providedPassword = providedPassword;
    this.expectedAuthStatus = expectedAuthStatus;
    this.expectedRedirectRole = expectedRedirectRole;
    this.expectedErrorMessage = expectedErrorMessage;
  }
}

class RoleAccessTest {
  constructor(
    testName,
    userRole,
    targetApiRoute,
    expectedHttpStatusCode
  ) {
    this.testName = testName;
    this.userRole = userRole;
    this.targetApiRoute = targetApiRoute;
    this.expectedHttpStatusCode = expectedHttpStatusCode;
  }
}

module.exports = {
  AuthType,
  UserRole,
  AuthenticationTest,
  RoleAccessTest,
};