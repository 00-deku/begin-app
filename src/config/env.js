import "dotenv/config";

/**
 * Centralized environment configuration.
 * Exposes strongly typed and defaulted configuration properties
 * across database, authentication, external services, and runtime.
 */
export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "8000", 10),

  database: {
    mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/begin_db",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "default_jwt_secret_dev_only",
    expiresIn: "7d",
  },

  otp: {
    secret: process.env.OTP_SECRET || "default_otp_secret_dev_only",
    expiryMinutes: 5,
    cooldownSeconds: 60,
    maxAttempts: 5,
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY || "re_dummy_dev_key",
    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
  },

  googleAuth: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || "http://localhost:8000/auth/google/callback",
  },

  uploads: {
    maxFileSizeBytes: 5 * 1024 * 1024,
  },
};

export default config;
