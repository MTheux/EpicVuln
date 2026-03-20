import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const raw = process.env[key];
  if (raw !== undefined) {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a number, got: ${raw}`);
    }
    return parsed;
  }
  if (defaultValue !== undefined) return defaultValue;
  throw new Error(`Missing required environment variable: ${key}`);
}

export const env = {
  // Server
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: getEnvNumber('PORT', 3001),
  FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:5173'),

  // Database
  DATABASE_URL: getEnv('DATABASE_URL'),

  // JWT
  JWT_SECRET: getEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '8h'),
  JWT_REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),

  // SMTP
  SMTP_HOST: getEnv('SMTP_HOST', ''),
  SMTP_PORT: getEnvNumber('SMTP_PORT', 587),
  SMTP_SECURE: getEnv('SMTP_SECURE', 'false') === 'true',
  SMTP_USER: getEnv('SMTP_USER', ''),
  SMTP_PASS: getEnv('SMTP_PASS', ''),
  SMTP_FROM: getEnv('SMTP_FROM', 'noreply@vulnmanager.com'),

  // Jira
  JIRA_INSTANCE_URL: getEnv('JIRA_INSTANCE_URL', ''),
  JIRA_EMAIL: getEnv('JIRA_EMAIL', ''),
  JIRA_API_TOKEN: getEnv('JIRA_API_TOKEN', ''),
  JIRA_PROJECT_KEY: getEnv('JIRA_PROJECT_KEY', ''),

  // Upload
  UPLOAD_DIR: getEnv('UPLOAD_DIR', 'uploads'),
  UPLOAD_MAX_SIZE: getEnvNumber('UPLOAD_MAX_SIZE', 10 * 1024 * 1024), // 10MB
  UPLOAD_ALLOWED_TYPES: getEnv(
    'UPLOAD_ALLOWED_TYPES',
    'image/png,image/jpeg,image/gif,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ).split(','),
} as const;

export type Env = typeof env;
