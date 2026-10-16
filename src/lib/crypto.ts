/**
 * Cryptographic utilities for secure token generation and validation
 * Implements security requirements for password reset functionality
 */
import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token
 * @param length - Number of bytes for the token (minimum 32 bytes per requirements)
 * @returns Hex-encoded token string
 */
export function generateSecureToken(length: number = 32): string {
  if (length < 32) {
    throw new Error('Token length must be at least 32 bytes for security requirements');
  }
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a token using SHA-256 for secure storage
 * @param token - Plain text token to hash
 * @returns SHA-256 hash as hex string
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time comparison to prevent timing attacks
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns True if strings match, false otherwise
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  // Use crypto.timingSafeEqual for constant-time comparison
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  
  try {
    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch (error) {
    // If buffers have different lengths, timingSafeEqual throws
    return false;
  }
}

/**
 * Verify a token against its hash using constant-time comparison
 * @param token - Plain text token to verify
 * @param tokenHash - Stored hash to compare against
 * @returns True if token matches hash, false otherwise
 */
export function verifyToken(token: string, tokenHash: string): boolean {
  const computedHash = hashToken(token);
  return constantTimeCompare(computedHash, tokenHash);
}

/**
 * Generate a password reset token and its hash
 * Returns both the plain token (for URL) and hashed version (for database)
 * @returns Object containing token, hash, and expiry date
 */
export function generatePasswordResetToken(): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = generateSecureToken(32); // 32 bytes = 64 character hex string
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
  
  return {
    token,
    tokenHash,
    expiresAt,
  };
}

/**
 * Check if a token has expired
 * @param expiresAt - Expiry date of the token
 * @returns True if token has expired, false otherwise
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Generate a cryptographically secure random string for general use
 * @param length - Number of characters in the output string
 * @returns Random string using URL-safe base64 encoding
 */
export function generateRandomString(length: number): string {
  const bytes = Math.ceil(length * 3 / 4); // Calculate bytes needed for base64
  return crypto.randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, length);
}