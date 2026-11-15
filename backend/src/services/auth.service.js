const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const AppError = require("../utils/AppError");

// Login, register, forgot password, Google OAuth.
// Business rules live here. No pg require, no touching req/res.
// Takes repositories through the constructor so tests can swap in fakes.
//
// To do:
// - Hash passwords with bcrypt, sign JWTs. A new account is ALWAYS a viewer.
// - The password reset token is NOT stored in the DB: a 15-minute JWT signed with part of the current password_hash.
// - forgot-password always returns 200 even for an unknown email, to prevent email probing.
class AuthService {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  // 1. Register a new account (a new account is always a viewer)[cite: 1]
  async register({ fullName, email, password }) {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      const error = new Error("Email already exists");
      error.statusCode = 409;
      error.code = "EMAIL_TAKEN";
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create the user with the default 'viewer' role[cite: 1]
    const newUser = await this.userRepository.create({
      full_name: fullName,
      email,
      password_hash: passwordHash,
      user_role: "viewer",
      user_status: "active",
    });

    const token = jwt.sign(
      {
        user_id: newUser.user_id,
        role: newUser.user_role,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    const { password_hash, password: _, ...userWithoutPassword } = newUser;
    return {
      token,
      user: userWithoutPassword,
    };
  }

  // 2. Sign in
  async login({ email, password }) {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    // If the account is locked -> return 423 per api-endpoints.md sections 0 & 1[cite: 1]
    if (user.user_status !== "active") {
      throw new AppError(423, "ACCOUNT_LOCKED", "Account is locked");
    }

    // A Google account with no password set: password_hash NULL. bcrypt.compare(null)
    // throws, so block it here, otherwise it becomes a 500 instead of a 401.
    if (!user.password_hash) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    // Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    // Sign JWT token
    const token = jwt.sign(
      { user_id: user.user_id, role: user.user_role },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    // Omit password hash from returned user object
    const { password_hash, password: _, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
    };
  }

  // 3. Get the current user (GET /auth/me)[cite: 1]
  async getCurrentUser(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      error.code = "NOT_FOUND";
      throw error;
    }
    const { password_hash, password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // ######################################################################
  // ##                                                                  ##
  // ##  WARNING: forgotPassword IS UNFINISHED — DO NOT ENABLE IT        ##
  // ##                                                                  ##
  // ##  It console.logs the reset token to the server log, no email.    ##
  // ##  Anyone who can read the log can change anyone's password.       ##
  // ##                                                                  ##
  // ##  Before wiring up POST /auth/forgot-password:                    ##
  // ##    1. Plug in a real email service, drop the console.log line.   ##
  // ##    2. Add rate limiting (api-endpoints.md section 1: 429).       ##
  // ##                                                                  ##
  // ##  resetPassword below is unusable as well until step 1            ##
  // ##  is done — see also UserRepository.updatePassword.               ##
  // ##                                                                  ##
  // ##  Whoever finishes this, delete this box.                         ##
  // ##                                                                  ##
  // ######################################################################

  // 4. Forgot password (always returns 200 even for an unknown email, to prevent email probing)[cite: 1]
  async forgotPassword(email) {
    const user = await this.userRepository.findByEmail(email);
    if (user && user.password_hash) {
      // The reset token is NOT stored in the DB: a 15-minute JWT signed with part of the current password_hash[cite: 2]
      const hashSnippet = user.password_hash.substring(0, 10);
      const resetToken = jwt.sign(
        { user_id: user.user_id, snippet: hashSnippet },
        JWT_SECRET,
        { expiresIn: "15m" },
      );
      // Note: this is where a real email service sending resetToken would be plugged in
      // No email service yet, so the token is NOT logged by default (anyone reading the log could change the password).
      // It is printed only when a dev explicitly sets DEV_LOG_RESET_TOKEN=true outside production.
      if (
        process.env.NODE_ENV !== "production" &&
        process.env.DEV_LOG_RESET_TOKEN === "true"
      ) {
        console.log(`[DEV] Reset password token for ${email}: ${resetToken}`);
      }
    }
    return { message: "If the email exists, a reset link has been sent." };
  }

  // 5. Set a new password[cite: 1]
  async resetPassword({ token, newPassword }) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await this.userRepository.findById(decoded.user_id);

      if (!user) {
        const error = new Error("Link is invalid or expired");
        error.statusCode = 410;
        error.code = "GONE";
        throw error;
      }

      // Verify the password_hash snippet so the token invalidates itself once the password changes[cite: 2]
      const hashSnippet = user.password_hash.substring(0, 10);
      if (decoded.snippet !== hashSnippet) {
        const error = new Error("Link has already been used or is expired");
        error.statusCode = 410;
        error.code = "GONE";
        throw error;
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await this.userRepository.updatePassword(user.user_id, newPasswordHash);

      return { message: "Password has been successfully reset." };
    } catch (err) {
      const error = new Error("Token is invalid or expired");
      error.statusCode = 410;
      error.code = "GONE";
      throw error;
    }
  }
}

module.exports = AuthService;
