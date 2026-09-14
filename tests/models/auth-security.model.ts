export type AuthType = 'GOOGLE_OAUTH' | 'IRN_PASSWORD';
export type UserRole = 'STUDENT' | 'LECTURER' | 'NONE';

export interface AuthenticationTest {
    testName: string;
    authType: AuthType;
    providedEmail: string;
    providedPassword: string;
    expectedAuthStatus: boolean;
    expectedRedirectRole: UserRole;
    expectedErrorMessage: string;
}

export interface RoleAccessTest {
    testName: string;
    userRole: UserRole;
    targetApiRoute: string;
    expectedHttpStatusCode: number;
}