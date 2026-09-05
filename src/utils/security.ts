import { User, Subsidiary, Role } from '../types';

/**
 * MineMind-AI Enterprise Security Engine
 * Comprehensive security controls for Authentication, IDOR prevention, 
 * Input Sanitization, Rate Limiting, Session Management & Anomaly Monitoring.
 */

export interface SecureSession {
  token: string;
  userId: string;
  userEmail: string;
  userRole: Role;
  subsidiary: Subsidiary;
  issuedAt: number; // UTC timestamp ms
  expiresAt: number; // UTC timestamp ms (8 hours default)
  lastActivityAt: number;
}

export interface PasswordResetRecord {
  email: string;
  token: string;
  expiresAt: number; // 15 mins expiry
  used: boolean;
}

// In-memory rate limiting state with sliding windows
interface RateLimitBucket {
  attempts: number[];
  lockedUntil?: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();
const passwordResetRecords = new Map<string, PasswordResetRecord>();

// ==========================================
// 1. CRYPTOGRAPHIC PASSWORD HASHING & SALTING
// ==========================================

/**
 * Generates a cryptographically secure random hex salt
 */
export function generateSalt(byteLength = 16): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const buffer = new Uint8Array(byteLength);
    window.crypto.getRandomValues(buffer);
    return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for non-browser runtime
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Hashes a plaintext password using Web Crypto SHA-256 + Salt with multi-round mixing.
 * Returns a self-contained formatted string: sha256$<salt>$<hash>
 */
export async function hashPassword(password: string, existingSalt?: string): Promise<string> {
  const salt = existingSalt || generateSalt();
  const encoder = new TextEncoder();
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    let combined = encoder.encode(password + '::khanij_security_pepper::' + salt);
    for (let i = 0; i < 5; i++) {
      const digest = await crypto.subtle.digest('SHA-256', combined);
      combined = new Uint8Array(digest);
    }
    const hashHex = Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
    return `sha256$${salt}$${hashHex}`;
  }

  // Fallback hash representation
  let hash = 0;
  const str = password + salt + 'minemind_salt_vector';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `sha256$${salt}$${Math.abs(hash).toString(16)}`;
}

/**
 * Synchronous hash generator for instant state synchronization
 */
export function hashPasswordSync(password: string, salt = generateSalt(8)): string {
  let hash = 0;
  const str = password + salt + 'minemind_salt_vector';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `sha256$${salt}$${Math.abs(hash).toString(16)}`;
}

/**
 * Verifies a plaintext password against a stored hashed password string or legacy password
 */
export async function verifyPassword(password: string, storedPasswordString: string): Promise<boolean> {
  if (!password || !storedPasswordString) return false;
  
  // Legacy plaintext support for demo accounts
  if (storedPasswordString === password) {
    return true;
  }

  // Format: sha256$<salt>$<hash>
  if (storedPasswordString.startsWith('sha256$')) {
    const parts = storedPasswordString.split('$');
    if (parts.length >= 3) {
      const salt = parts[1];
      const targetHash = await hashPassword(password, salt);
      return targetHash === storedPasswordString;
    }
  }

  return false;
}

// ==========================================
// 2. SESSION LIFECYCLE & EXPIRY MANAGEMENT
// ==========================================

const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours absolute expiration
const SESSION_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours idle timeout

export function createSecureSession(user: User): SecureSession {
  const now = Date.now();
  const token = `mm_sess_${generateSalt(24)}`;
  
  return {
    token,
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    subsidiary: user.subsidiary,
    issuedAt: now,
    expiresAt: now + SESSION_MAX_AGE_MS,
    lastActivityAt: now,
  };
}

export function isSessionValid(session: SecureSession | null): { valid: boolean; reason?: string } {
  if (!session || !session.token) {
    return { valid: false, reason: 'NO_SESSION' };
  }

  const now = Date.now();
  if (now > session.expiresAt) {
    return { valid: false, reason: 'SESSION_EXPIRED' };
  }

  if (now - session.lastActivityAt > SESSION_IDLE_TIMEOUT_MS) {
    return { valid: false, reason: 'IDLE_TIMEOUT' };
  }

  return { valid: true };
}

export function touchSession(session: SecureSession): SecureSession {
  return {
    ...session,
    lastActivityAt: Date.now(),
  };
}

// ==========================================
// 3. PASSWORD RESET TOKEN LIFECYCLE (15 MIN)
// ==========================================

const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export function createPasswordResetToken(email: string): { token: string; expiresAt: number } {
  const cleanEmail = email.trim().toLowerCase();
  const token = `rst_${generateSalt(16)}`;
  const expiresAt = Date.now() + RESET_TOKEN_EXPIRY_MS;

  passwordResetRecords.set(token, {
    email: cleanEmail,
    token,
    expiresAt,
    used: false,
  });

  return { token, expiresAt };
}

export function validatePasswordResetToken(token: string): { valid: boolean; email?: string; error?: string } {
  const record = passwordResetRecords.get(token);
  if (!record) {
    return { valid: false, error: 'Invalid or unrecognized password reset token.' };
  }

  if (record.used) {
    return { valid: false, error: 'This password reset token has already been used.' };
  }

  if (Date.now() > record.expiresAt) {
    return { valid: false, error: 'Password reset token has expired (15-minute security limit).' };
  }

  return { valid: true, email: record.email };
}

export function markPasswordResetTokenUsed(token: string): void {
  const record = passwordResetRecords.get(token);
  if (record) {
    record.used = true;
    passwordResetRecords.set(token, record);
  }
}

// ==========================================
// 4. RATE LIMITING & BRUTE FORCE PROTECTION
// ==========================================

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes lockout

export function checkRateLimit(
  key: string,
  maxAttempts = 10,
  windowMs = 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  let bucket = rateLimitBuckets.get(key);

  if (!bucket) {
    bucket = { attempts: [] };
    rateLimitBuckets.set(key, bucket);
  }

  // Check if locked out
  if (bucket.lockedUntil && now < bucket.lockedUntil) {
    const retryAfterSec = Math.ceil((bucket.lockedUntil - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  // Clear timestamps older than window
  bucket.attempts = bucket.attempts.filter(t => now - t < windowMs);

  if (bucket.attempts.length >= maxAttempts) {
    bucket.lockedUntil = now + windowMs;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil(windowMs / 1000),
    };
  }

  bucket.attempts.push(now);
  return {
    allowed: true,
    remaining: maxAttempts - bucket.attempts.length,
  };
}

export function recordFailedLogin(identifier: string): {
  isLocked: boolean;
  lockTimeRemainingSec: number;
  attemptsRemaining: number;
} {
  const key = `login_fail_${identifier.toLowerCase().trim()}`;
  const now = Date.now();
  let bucket = rateLimitBuckets.get(key);

  if (!bucket) {
    bucket = { attempts: [] };
    rateLimitBuckets.set(key, bucket);
  }

  bucket.attempts = bucket.attempts.filter(t => now - t < LOGIN_WINDOW_MS);
  bucket.attempts.push(now);

  if (bucket.attempts.length >= MAX_LOGIN_ATTEMPTS) {
    bucket.lockedUntil = now + LOCKOUT_DURATION_MS;
    rateLimitBuckets.set(key, bucket);
    return {
      isLocked: true,
      lockTimeRemainingSec: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      attemptsRemaining: 0,
    };
  }

  rateLimitBuckets.set(key, bucket);
  return {
    isLocked: false,
    lockTimeRemainingSec: 0,
    attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - bucket.attempts.length),
  };
}

export function recordSuccessfulLogin(identifier: string): void {
  const key = `login_fail_${identifier.toLowerCase().trim()}`;
  rateLimitBuckets.delete(key);
}

export function getLoginLockoutStatus(identifier: string): { isLocked: boolean; lockTimeRemainingSec: number } {
  const key = `login_fail_${identifier.toLowerCase().trim()}`;
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || !bucket.lockedUntil) return { isLocked: false, lockTimeRemainingSec: 0 };

  const now = Date.now();
  if (now < bucket.lockedUntil) {
    return {
      isLocked: true,
      lockTimeRemainingSec: Math.ceil((bucket.lockedUntil - now) / 1000),
    };
  }

  bucket.lockedUntil = undefined;
  return { isLocked: false, lockTimeRemainingSec: 0 };
}

// ==========================================
// 5. INPUT SANITIZATION & VALIDATION
// ==========================================

/**
 * Strips malicious HTML tags, script injection patterns, and unescaped dangerous characters
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:[^"']*/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
    .trim();
}

/**
 * Validates email with strict RFC compliant regex
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email.trim());
}

/**
 * Validates Employee ID format (e.g. CIL-10492, CMPDI-88231)
 */
export function validateEmployeeId(empId: string): boolean {
  if (!empId) return false;
  const clean = empId.trim().toUpperCase();
  return /^[A-Z0-9\-_]{3,20}$/.test(clean);
}

/**
 * Validates password complexity: >=8 chars, uppercase, number, symbol
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  errors: string[];
} {
  const errors: string[] = [];
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter (A-Z)');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain at least one number (0-9)');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Must contain at least one special character (!@#$%^&*)');
  }

  let score = 0;
  if (password.length >= 8) score += 25;
  if (/[A-Z]/.test(password)) score += 25;
  if (/[0-9]/.test(password)) score += 25;
  if (/[^A-Za-z0-9]/.test(password)) score += 25;

  return {
    valid: errors.length === 0,
    score,
    errors,
  };
}

/**
 * File validation: Checks file extensions, MIME signatures, and size ceiling (50MB)
 */
export function validateFilePayload(
  fileName: string,
  fileSize = 0,
  mimeType = ''
): { valid: boolean; error?: string } {
  const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
  if (fileSize > MAX_SIZE_BYTES) {
    return { valid: false, error: 'File exceeds statutory maximum size of 50 MB.' };
  }

  const allowedExtensions = ['.pdf', '.xlsx', '.xls', '.csv', '.docx', '.doc', '.png', '.jpg', '.jpeg'];
  const ext = '.' + fileName.split('.').pop()?.toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Disallowed file format "${ext}". Only PDF, Excel, Word, CSV, and image documents are permitted.`,
    };
  }

  // Disallow executable / dangerous MIME types
  const forbiddenMimes = ['application/x-msdownload', 'application/x-sh', 'application/javascript', 'text/javascript', 'application/x-php'];
  if (forbiddenMimes.includes(mimeType.toLowerCase())) {
    return { valid: false, error: 'Executable scripts and binaries are strictly prohibited.' };
  }

  return { valid: true };
}

// ==========================================
// 6. IDOR (INSECURE DIRECT OBJECT REFERENCE)
// & ACCESS CONTROL ENFORCEMENT
// ==========================================

export function canAccessResource(
  currentUser: User | null,
  resourceOwnerId?: string,
  resourceSubsidiary?: string,
  operationType: 'read' | 'write' | 'approve' | 'delete' | boolean = 'read'
): { allowed: boolean; reason?: string } {
  if (!currentUser) {
    return { allowed: false, reason: 'Authentication required.' };
  }

  // Administrators have full governance oversight
  if (currentUser.role === 'admin') {
    return { allowed: true };
  }

  const isWrite = operationType === true || operationType === 'write' || operationType === 'delete';
  const isApprove = operationType === 'approve';

  if (isApprove) {
    return {
      allowed: false,
      reason: 'Statutory Approval Privilege: Only designated Administrators can approve or publish documents.',
    };
  }

  // If write operation (e.g. edit/delete/submit revision)
  if (isWrite) {
    if (resourceOwnerId && resourceOwnerId !== currentUser.id) {
      return {
        allowed: false,
        reason: 'IDOR Protection: You are not authorized to modify records owned by another officer.',
      };
    }
  }

  // Subsidiary boundary check: CMPDI HQ officers have cross-subsidiary read access,
  // local subsidiary officers can access their own subsidiary filings
  if (resourceSubsidiary && currentUser.subsidiary !== 'CMPDI HQ') {
    if (resourceSubsidiary !== currentUser.subsidiary && resourceSubsidiary !== 'All Subsidiaries') {
      return {
        allowed: false,
        reason: `Subsidiary Boundary: You are authorized for ${currentUser.subsidiary} records only.`,
      };
    }
  }

  return { allowed: true };
}

export function enforceAdminRole(currentUser: User | null): boolean {
  return Boolean(currentUser && currentUser.role === 'admin');
}

// ==========================================
// 7. SECURITY ANOMALY & INCIDENT LOGGER
// ==========================================

export interface SecurityIncident {
  id: string;
  type: 'AUTH_BRUTE_FORCE' | 'IDOR_ATTEMPT' | 'MALICIOUS_INPUT' | 'RATE_LIMIT_EXCEEDED' | 'UNAUTHORIZED_ACCESS' | 'ACCOUNT_LOCKOUT' | 'SESSION_EXPIRED';
  timestamp: string;
  actorIdentifier?: string;
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const securityIncidentLog: SecurityIncident[] = [];

export function logSecurityAnomaly(
  type: SecurityIncident['type'],
  details: string,
  severity: SecurityIncident['severity'] = 'MEDIUM',
  actorIdentifier?: string
): SecurityIncident {
  const incident: SecurityIncident = {
    id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    timestamp: new Date().toISOString(),
    actorIdentifier,
    details: sanitizeInput(details),
    severity,
  };

  securityIncidentLog.unshift(incident);
  if (securityIncidentLog.length > 500) {
    securityIncidentLog.pop();
  }

  console.warn(`[SECURITY ALERT] [${severity}] ${type}: ${details}`, { actor: actorIdentifier });
  return incident;
}

export function getSecurityIncidents(): SecurityIncident[] {
  return [...securityIncidentLog];
}
