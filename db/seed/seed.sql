USE test_automation_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- CLEAN EXISTING SEED DATA
-- ============================================================

DELETE FROM test_data;
DELETE FROM test_steps;
DELETE FROM test_specs;
DELETE FROM test_cases;
DELETE FROM test_suites;

ALTER TABLE test_suites AUTO_INCREMENT = 1;
ALTER TABLE test_specs AUTO_INCREMENT = 1;
ALTER TABLE test_steps AUTO_INCREMENT = 1;
ALTER TABLE test_data AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
-- 1. TEST SUITES
-- ============================================================

INSERT INTO test_suites
(
    suite_name,
    module_group,
    description
)
VALUES
(
    'Authentication Test Suite',
    'Authentication',
    'Test cases covering the login page, authentication inputs, validation messages, password visibility, remember-me functionality and Google sign-in.'
),
(
    'Login UI Test Suite',
    'UI Components',
    'Test cases verifying the visual and interactive components of the login page.'
);


-- ============================================================
-- 2. TEST CASES
-- ============================================================

INSERT INTO test_cases
(
    test_id,
    suite_id,
    module,
    title,
    description,
    source_reference,
    test_type,
    priority
)
VALUES

-- TC01
(
    'TC-AUTH-001',
    1,
    'Authentication',
    'Login page is displayed',
    'Verify that the login page loads successfully and displays the required authentication components.',
    'FR-AUTH-01',
    'AUTHENTICATION',
    'HIGH'
),

-- TC02
(
    'TC-AUTH-002',
    1,
    'Authentication',
    'Student code input is available',
    'Verify that the student or lecturer code input is displayed with the correct placeholder.',
    'FR-AUTH-02',
    'AUTHENTICATION',
    'HIGH'
),

-- TC03
(
    'TC-AUTH-003',
    1,
    'Authentication',
    'Valid student code can be entered',
    'Verify that a valid student code can be entered into the authentication form.',
    'FR-AUTH-03',
    'AUTHENTICATION',
    'HIGH'
),

-- TC04
(
    'TC-AUTH-004',
    1,
    'Authentication',
    'Password input is available',
    'Verify that the password input is displayed with the expected placeholder.',
    'FR-AUTH-04',
    'AUTHENTICATION',
    'HIGH'
),

-- TC05
(
    'TC-AUTH-005',
    1,
    'Authentication',
    'Invalid password displays error',
    'Verify that an incorrect password produces the expected authentication error message.',
    'FR-AUTH-05',
    'AUTHENTICATION',
    'HIGH'
),

-- TC06
(
    'TC-AUTH-006',
    1,
    'Authentication',
    'Empty credentials are rejected',
    'Verify that the login form does not allow submission with empty required credentials.',
    'FR-AUTH-06',
    'AUTHENTICATION',
    'HIGH'
),

-- TC07
(
    'TC-AUTH-007',
    1,
    'Authentication',
    'Remember me checkbox is available',
    'Verify that the Remember Me checkbox is displayed on the login page.',
    'FR-AUTH-07',
    'AUTHENTICATION',
    'MEDIUM'
),

-- TC08
(
    'TC-AUTH-008',
    1,
    'Authentication',
    'Google sign-in component is available',
    'Verify that the Google sign-in component is present on the login page.',
    'FR-AUTH-08',
    'AUTHENTICATION',
    'MEDIUM'
),

-- TC09
(
    'TC-AUTH-009',
    1,
    'Authentication',
    'Forgot password link is available',
    'Verify that the Forgot Password link is displayed and accessible.',
    'FR-AUTH-09',
    'AUTHENTICATION',
    'MEDIUM'
),

-- TC10
(
    'TC-AUTH-010',
    1,
    'Authentication',
    'Password field accepts input',
    'Verify that the password field accepts user input and behaves as a password field.',
    'FR-AUTH-10',
    'AUTHENTICATION',
    'MEDIUM'
),

-- UI-001
(
    'TC-UI-001',
    2,
    'Login UI',
    'Login page title is correct',
    'Verify that the application title is EIU Capstone.',
    'FR-UI-01',
    'UI_COMPONENT',
    'MEDIUM'
),

-- UI-002
(
    'TC-UI-002',
    2,
    'Login UI',
    'Login page heading is correct',
    'Verify that the login page contains the Lab Management System heading.',
    'FR-UI-02',
    'UI_COMPONENT',
    'MEDIUM'
);


-- ============================================================
-- 3. TEST SPECS
-- ============================================================

INSERT INTO test_specs
(
    test_id,
    spec_name,
    component_type,
    spec_payload,
    description
)
VALUES

(
    'TC-AUTH-001',
    'Login Page',
    'PAGE',
    '{
        "url": "https://oop-autograder.vercel.app",
        "title": "EIU Capstone",
        "heading": "Lab Management System"
    }',
    'Expected login page structure and page information.'
),

(
    'TC-AUTH-002',
    'Student/Lecturer Code Input',
    'INPUT_FIELD',
    '{
        "label": "Student Code or Lecturer Code",
        "placeholder": "e.g. 20521234",
        "required": true
    }',
    'Specification for the authentication code input.'
),

(
    'TC-AUTH-003',
    'Student Code Input',
    'INPUT_FIELD',
    '{
        "placeholder": "e.g. 20521234",
        "exampleValue": "20521234",
        "inputType": "text"
    }',
    'Specification for entering a student code.'
),

(
    'TC-AUTH-004',
    'Password Input',
    'INPUT_FIELD',
    '{
        "label": "Enter your password",
        "placeholder": "Enter your password",
        "required": true
    }',
    'Specification for the password input.'
),

(
    'TC-AUTH-005',
    'Invalid Login Message',
    'MESSAGE',
    '{
        "expectedMessage": "IRN or password is wrong"
    }',
    'Expected error message for invalid credentials.'
),

(
    'TC-AUTH-006',
    'Required Authentication Fields',
    'INPUT_FIELD',
    '{
        "usernameRequired": true,
        "passwordRequired": true
    }',
    'Required-field validation specification.'
),

(
    'TC-AUTH-007',
    'Remember Me',
    'CHECKBOX',
    '{
        "label": "Remember Me",
        "type": "checkbox"
    }',
    'Specification for Remember Me functionality.'
),

(
    'TC-AUTH-008',
    'Google Sign-In',
    'BUTTON',
    '{
        "component": "Google Sign-In",
        "expectedPresence": true,
        "verificationStrategy": "iframe_presence"
    }',
    'Google sign-in component is verified by checking its presence rather than interacting with the external Google authentication flow.'
),

(
    'TC-AUTH-009',
    'Forgot Password',
    'LINK',
    '{
        "text": "Forgot password",
        "expectedPresence": true
    }',
    'Specification for the forgot-password link.'
),

(
    'TC-AUTH-010',
    'Password Input Behavior',
    'INPUT_FIELD',
    '{
        "placeholder": "Enter your password",
        "inputType": "password",
        "acceptsText": true
    }',
    'Specification for password input behavior.'
),

(
    'TC-UI-001',
    'Application Title',
    'PAGE',
    '{
        "expectedTitle": "EIU Capstone"
    }',
    'Expected browser page title.'
),

(
    'TC-UI-002',
    'Application Heading',
    'PAGE',
    '{
        "expectedHeading": "Lab Management System"
    }',
    'Expected main heading on the login page.'
);


-- ============================================================
-- 4. TEST STEPS
-- ============================================================

INSERT INTO test_steps
(
    test_id,
    step_order,
    action,
    target,
    value,
    expected_result
)
VALUES

-- ------------------------------------------------------------
-- TC-AUTH-001
-- ------------------------------------------------------------

(
    'TC-AUTH-001',
    1,
    'NAVIGATE',
    'https://oop-autograder.vercel.app',
    NULL,
    'Login page is loaded successfully.'
),

(
    'TC-AUTH-001',
    2,
    'VERIFY',
    'page.title',
    'EIU Capstone',
    'Browser title is EIU Capstone.'
),

(
    'TC-AUTH-001',
    3,
    'VERIFY',
    'text=Lab Management System',
    NULL,
    'Lab Management System heading is visible.'
),

-- ------------------------------------------------------------
-- TC-AUTH-002
-- ------------------------------------------------------------

(
    'TC-AUTH-002',
    1,
    'NAVIGATE',
    'https://oop-autograder.vercel.app',
    NULL,
    'Login page is displayed.'
),

(
    'TC-AUTH-002',
    2,
    'VERIFY',
    'placeholder=e.g. 20521234',
    NULL,
    'Student Code or Lecturer Code input is visible.'
),

-- ------------------------------------------------------------
-- TC-AUTH-003
-- ------------------------------------------------------------

(
    'TC-AUTH-003',
    1,
    'NAVIGATE',
    'https://oop-autograder.vercel.app',
    NULL,
    'Login page is displayed.'
),

(
    'TC-AUTH-003',
    2,
    'FILL',
    'placeholder=e.g. 20521234',
    '20521234',
    'Student code is entered successfully.'
),

(
    'TC-AUTH-003',
    3,
    'VERIFY',
    'placeholder=e.g. 20521234',
    '20521234',
    'Student code input contains the expected value.'
),

-- ------------------------------------------------------------
-- TC-AUTH-004
-- ------------------------------------------------------------

(
    'TC-AUTH-004',
    1,
    'NAVIGATE',
    'https://oop-autograder.vercel.app',
    NULL,
    'Login page is displayed.'
),

(
    'TC-AUTH-004',
    2,
    'VERIFY',
    'placeholder=Enter your password',
    NULL,
    'Password input is visible.'
),

-- ------------------------------------------------------------
-- TC-AUTH-005
-- ------------------------------------------------------------

(
    'TC-AUTH-005',
    1,
    'NAVIGATE',
    'https://oop-autograder.vercel.app',
    NULL,
    'Login page is displayed.'
),

(
    'TC-AUTH-005',
    2,
    'FILL',
    'placeholder=e.g. 20521234',
    '20521234',
    'Student code is entered.'
),

(
    'TC-AUTH-005',
    3,
    'FILL',
    'placeholder=Enter your password',
    'wrong_password',
    'Incorrect password is entered.'
),

(
    'TC-AUTH-005',
    4,
    'CLICK',
    'Sign In',
    NULL,
    'Login request is submitted.'
),

(
    'TC-AUTH-005',
    5,
    'VERIFY',
    'text=IRN or password is wrong',
    NULL,
    'Invalid credential error message is displayed.'
),

-- ------------------------------------------------------------
-- TC-AUTH-006
-- ------------------------------------------------------------

(
    'TC-AUTH-006',
    1,
    'NAVIGATE',
    'https://oop-autograder.vercel.app',
    NULL,
    'Login page is displayed.'
),

(
    'TC-AUTH-006',
    2,
    'CLICK',
    'Sign In',
    NULL,
    'Login validation is triggered.'
),

(
    'TC-AUTH-006',
    3,
    'VERIFY',
    'login validation',
    NULL,
    'Required authentication fields prevent invalid submission.'
),

-- ------------------------------------------------------------
-- TC-AUTH-007
-- ------------------------------------------------------------

(
    'TC-AUTH-007',
    1,
    'NAVIGATE',
    'https://oop-autograder.vercel.app',
    NULL,
    'Login page is displayed.'
),

(
    'TC-AUTH-007',
    2,
    'VERIFY',
    'Remember Me',
    NULL,
    'Remember Me checkbox is visible.'
),

-- ------------------------------------------------------------
-- TC-AUTH-008
-- ------------------------------------------------------------

(
    'TC-AUTH-008',
    1,
    'NAVIGATE',
    'https://oop-autograder.vercel.app',
    NULL,
    'Login page is displayed.'
),

(
    'TC-AUTH-008',
    2,
    'VERIFY',
    'Google sign-in iframe',
    NULL,
    'Google sign-in component is present.'
),

-- ------------------------------------------------------------
-- TC-AUTH-009
-- ------------------------------------------------------------

(
    'TC-AUTH-009',
    1,
    'NAVIGATE',
    'https://oop-autograder.vercel.app',
    NULL,
    'Login page is displayed.'
),

(
    'TC-AUTH-009',
    2,
    'VERIFY',
    'Forgot password',
    NULL,
    'Forgot password link is visible.'
),

-- ------------------------------------------------------------
-- TC-AUTH-010
-- ------------------------------------------------------------

(
    'TC-AUTH-010',
    1,
    'NAVIGATE',
    'https://oop-autograder.vercel.app',
    NULL,
    'Login page is displayed.'
),

(
    'TC-AUTH-010',
    2,
    'FILL',
    'placeholder=Enter your password',
    'test_password',
    'Password value is entered successfully.'
),

(
    'TC-AUTH-010',
    3,
    'VERIFY',
    'placeholder=Enter your password',
    'test_password',
    'Password input accepts the entered value.'
),

-- ------------------------------------------------------------
-- TC-UI-001
-- ------------------------------------------------------------

(
    'TC-UI-001',
    1,
    'NAVIGATE',
    'https://oop-autograder.vercel.app',
    NULL,
    'Application page is loaded.'
),

(
    'TC-UI-001',
    2,
    'VERIFY',
    'page.title',
    'EIU Capstone',
    'Page title is EIU Capstone.'
),

-- ------------------------------------------------------------
-- TC-UI-002
-- ------------------------------------------------------------

(
    'TC-UI-002',
    1,
    'NAVIGATE',
    'https://oop-autograder.vercel.app',
    NULL,
    'Application page is loaded.'
),

(
    'TC-UI-002',
    2,
    'VERIFY',
    'text=Lab Management System',
    NULL,
    'Lab Management System heading is visible.'
);


-- ============================================================
-- 5. TEST DATA
-- ============================================================

INSERT INTO test_data
(
    test_id,
    data_name,
    input_data,
    expected_output
)
VALUES

(
    'TC-AUTH-001',
    'Login page data',
    '{
        "url": "https://oop-autograder.vercel.app"
    }',
    '{
        "title": "EIU Capstone",
        "heading": "Lab Management System"
    }'
),

(
    'TC-AUTH-002',
    'Student code input',
    '{
        "placeholder": "e.g. 20521234"
    }',
    '{
        "inputVisible": true
    }'
),

(
    'TC-AUTH-003',
    'Valid student code',
    '{
        "username": "20521234"
    }',
    '{
        "valueAccepted": true
    }'
),

(
    'TC-AUTH-004',
    'Password input',
    '{
        "placeholder": "Enter your password"
    }',
    '{
        "inputVisible": true
    }'
),

(
    'TC-AUTH-005',
    'Invalid credentials',
    '{
        "username": "20521234",
        "password": "wrong_password"
    }',
    '{
        "status": "FAILED_LOGIN",
        "message": "IRN or password is wrong"
    }'
),

(
    'TC-AUTH-006',
    'Empty credentials',
    '{
        "username": "",
        "password": ""
    }',
    '{
        "loginAllowed": false
    }'
),

(
    'TC-AUTH-007',
    'Remember Me',
    '{
        "rememberMe": true
    }',
    '{
        "checkboxAvailable": true
    }'
),

(
    'TC-AUTH-008',
    'Google sign-in',
    '{
        "provider": "Google"
    }',
    '{
        "componentPresent": true
    }'
),

(
    'TC-AUTH-009',
    'Forgot password',
    '{
        "action": "open forgot password"
    }',
    '{
        "linkPresent": true
    }'
),

(
    'TC-AUTH-010',
    'Password field',
    '{
        "password": "test_password"
    }',
    '{
        "valueAccepted": true
    }'
),

(
    'TC-UI-001',
    'Application title',
    '{
        "url": "https://oop-autograder.vercel.app"
    }',
    '{
        "title": "EIU Capstone"
    }'
),

(
    'TC-UI-002',
    'Application heading',
    '{
        "url": "https://oop-autograder.vercel.app"
    }',
    '{
        "heading": "Lab Management System"
    }'
);


-- ============================================================
-- 6. VERIFICATION
-- ============================================================

SELECT 'test_suites' AS table_name, COUNT(*) AS total
FROM test_suites

UNION ALL

SELECT 'test_cases', COUNT(*)
FROM test_cases

UNION ALL

SELECT 'test_specs', COUNT(*)
FROM test_specs

UNION ALL

SELECT 'test_steps', COUNT(*)
FROM test_steps

UNION ALL

SELECT 'test_data', COUNT(*)
FROM test_data;


-- Show test cases
SELECT
    tc.test_id,
    ts.suite_name,
    tc.module,
    tc.title,
    tc.test_type,
    tc.priority
FROM test_cases tc
JOIN test_suites ts
    ON tc.suite_id = ts.suite_id
ORDER BY tc.test_id;