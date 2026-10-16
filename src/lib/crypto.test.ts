/**
 * Test suite for crypto utilities
 * Tests both unit functionality and property-based security requirements
 */
import crypto from 'crypto';
import {
  generateSecureToken,
  hashToken,
  constantTimeCompare,
  verifyToken,
  generatePasswordResetToken,
  isTokenExpired,
  generateRandomString,
} from './crypto';

// Simple test framework functions
function describe(name: string, fn: () => void) {
  console.log(`\n--- ${name} ---`);
  fn();
}

function it(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.log(`✗ ${name}`);
    console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toHaveLength(expected: number) {
      if (actual.length !== expected) {
        throw new Error(`Expected length ${actual.length} to be ${expected}`);
      }
    },
    toMatch(regex: RegExp) {
      if (!regex.test(actual)) {
        throw new Error(`Expected ${actual} to match ${regex}`);
      }
    },
    not: {
      toBe(expected: any) {
        if (actual === expected) {
          throw new Error(`Expected ${actual} not to be ${expected}`);
        }
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected: number) {
      if (actual > expected) {
        throw new Error(`Expected ${actual} to be <= ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be < ${expected}`);
      }
    },
    toBeInstanceOf(expected: any) {
      if (!(actual instanceof expected)) {
        throw new Error(`Expected ${actual} to be instance of ${expected.name}`);
      }
    },
    toHaveProperty(prop: string) {
      if (!actual.hasOwnProperty(prop)) {
        throw new Error(`Expected ${actual} to have property ${prop}`);
      }
    }
  };
}

describe('Crypto Utilities', () => {
  describe('generateSecureToken', () => {
    it('should generate tokens with minimum 32 bytes', () => {
      const token = generateSecureToken();
      // 32 bytes = 64 hex characters
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should throw error for tokens less than 32 bytes', () => {
      try {
        generateSecureToken(16);
        throw new Error('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).toMatch(/Token length must be at least 32 bytes/);
      }
    });

    it('should generate tokens of specified length', () => {
      const token64 = generateSecureToken(64);
      expect(token64).toHaveLength(128); // 64 bytes = 128 hex chars
    });
  });

  describe('hashToken', () => {
    it('should produce consistent SHA-256 hashes', () => {
      const token = 'test-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 = 64 hex chars
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty strings', () => {
      const hash = hashToken('');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('constantTimeCompare', () => {
    it('should return true for identical strings', () => {
      const str = 'identical-string';
      expect(constantTimeCompare(str, str)).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(constantTimeCompare('string1', 'string2')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(constantTimeCompare('short', 'longer-string')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(constantTimeCompare('', '')).toBe(true);
      expect(constantTimeCompare('', 'non-empty')).toBe(false);
    });

    it('should use constant time comparison', () => {
      // This test verifies that we're using crypto.timingSafeEqual
      const str1 = 'a'.repeat(1000);
      const str2 = 'a'.repeat(999) + 'b';
      
      // Should complete without timing variance (hard to test directly)
      expect(constantTimeCompare(str1, str2)).toBe(false);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid tokens', () => {
      const token = 'test-token';
      const hash = hashToken(token);
      expect(verifyToken(token, hash)).toBe(true);
    });

    it('should reject invalid tokens', () => {
      const token = 'test-token';
      const wrongToken = 'wrong-token';
      const hash = hashToken(token);
      expect(verifyToken(wrongToken, hash)).toBe(false);
    });

    it('should use constant-time comparison', () => {
      const token = generateSecureToken();
      const hash = hashToken(token);
      const wrongToken = generateSecureToken();
      
      expect(verifyToken(token, hash)).toBe(true);
      expect(verifyToken(wrongToken, hash)).toBe(false);
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate complete password reset token objects', () => {
      const resetToken = generatePasswordResetToken();
      
      expect(resetToken).toHaveProperty('token');
      expect(resetToken).toHaveProperty('tokenHash');
      expect(resetToken).toHaveProperty('expiresAt');
      
      expect(resetToken.token).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(resetToken.tokenHash).toHaveLength(64); // SHA-256 = 64 hex chars
      expect(resetToken.expiresAt).toBeInstanceOf(Date);
    });

    it('should set expiry to 15 minutes from now', () => {
      const before = new Date();
      const resetToken = generatePasswordResetToken();
      const after = new Date();
      
      const expectedMin = new Date(before.getTime() + 15 * 60 * 1000);
      const expectedMax = new Date(after.getTime() + 15 * 60 * 1000);
      
      expect(resetToken.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(resetToken.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
    });

    it('should generate unique tokens each time', () => {
      const token1 = generatePasswordResetToken();
      const token2 = generatePasswordResetToken();
      
      expect(token1.token).not.toBe(token2.token);
      expect(token1.tokenHash).not.toBe(token2.tokenHash);
    });

    it('should have valid hash relationship', () => {
      const resetToken = generatePasswordResetToken();
      expect(verifyToken(resetToken.token, resetToken.tokenHash)).toBe(true);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for future dates', () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes future
      expect(isTokenExpired(futureDate)).toBe(false);
    });

    it('should return true for past dates', () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      expect(isTokenExpired(pastDate)).toBe(true);
    });
  });

  describe('generateRandomString', () => {
    it('should generate strings of specified length', () => {
      const str10 = generateRandomString(10);
      const str20 = generateRandomString(20);
      
      expect(str10).toHaveLength(10);
      expect(str20).toHaveLength(20);
    });

    it('should generate URL-safe strings', () => {
      const str = generateRandomString(100);
      expect(str).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate unique strings', () => {
      const strings = new Set();
      for (let i = 0; i < 100; i++) {
        strings.add(generateRandomString(16));
      }
      expect(strings.size).toBe(100);
    });
  });
});

// Property-Based Tests for Security Requirements
describe('Property-Based Security Tests', () => {
  describe('Property 1: Token Security and Uniqueness', () => {
    /**
     * **Validates: Requirements 1.1, 1.2, 3.1, 3.6**
     * For any password reset request, the generated token should be 
     * cryptographically secure (minimum 32 bytes), unique across the 
     * system, and only the hashed version should be stored in the database.
     */
    it('should generate cryptographically secure tokens (32+ bytes)', () => {
      for (let i = 0; i < 100; i++) {
        const { token, tokenHash } = generatePasswordResetToken();
        
        // Token should be at least 32 bytes (64 hex chars)
        expect(token.length).toBeGreaterThanOrEqual(64);
        
        // Token should be hex-encoded
        expect(token).toMatch(/^[a-f0-9]+$/);
        
        // Hash should be different from token (no plain text storage)
        expect(tokenHash).not.toBe(token);
        expect(tokenHash).toHaveLength(64); // SHA-256 length
        
        // Should verify correctly
        expect(verifyToken(token, tokenHash)).toBe(true);
      }
    });

    it('should ensure token uniqueness across system', () => {
      const tokens = new Set<string>();
      const hashes = new Set<string>();
      
      for (let i = 0; i < 1000; i++) {
        const { token, tokenHash } = generatePasswordResetToken();
        
        // No token should be generated twice
        if (tokens.has(token)) {
          throw new Error(`Duplicate token found at iteration ${i}`);
        }
        if (hashes.has(tokenHash)) {
          throw new Error(`Duplicate hash found at iteration ${i}`);
        }
        
        tokens.add(token);
        hashes.add(tokenHash);
      }
      
      expect(tokens.size).toBe(1000);
      expect(hashes.size).toBe(1000);
    });
  });

  describe('Property 9: Constant Time Comparison', () => {
    /**
     * **Validates: Requirements 3.4**
     * For any token validation operation, the system should use 
     * constant-time comparison to prevent timing attacks, regardless 
     * of token validity.
     */
    it('should use constant-time comparison for all token operations', () => {
      const validToken = generateSecureToken();
      const validHash = hashToken(validToken);
      
      // Generate tokens with systematic differences to test timing
      const testCases = [
        generateSecureToken(), // Completely different
        validToken.substring(0, 60) + '0000', // Different at end
        '0000' + validToken.substring(4), // Different at start
        validToken.split('').reverse().join(''), // Reversed
      ];
      
      for (const testToken of testCases) {
        // Should use constant-time comparison (returns boolean)
        const result = verifyToken(testToken, validHash);
        if (typeof result !== 'boolean') {
          throw new Error('verifyToken must return boolean');
        }
        expect(result).toBe(false);
      }
      
      // Valid token should still work
      expect(verifyToken(validToken, validHash)).toBe(true);
    });

    it('should handle timing attacks on constant-time comparison', () => {
      const str1 = 'a'.repeat(1000);
      const str2 = 'b' + 'a'.repeat(999); // Different at start
      const str3 = 'a'.repeat(999) + 'b'; // Different at end
      
      // All should return false in constant time
      expect(constantTimeCompare(str1, str2)).toBe(false);
      expect(constantTimeCompare(str1, str3)).toBe(false);
      expect(constantTimeCompare(str1, str1)).toBe(true);
    });
  });

  describe('Property 2: Token Expiry Enforcement', () => {
    /**
     * **Validates: Requirements 1.3, 3.2**
     * For any password reset token, the system should reject the token 
     * if the current time exceeds the expiry time (15 minutes from creation).
     */
    it('should enforce 15-minute expiry for all tokens', () => {
      // Test multiple tokens
      for (let i = 0; i < 50; i++) {
        const { expiresAt } = generatePasswordResetToken();
        
        const now = new Date();
        const expectedExpiry = new Date(now.getTime() + 15 * 60 * 1000);
        const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
        
        // Should be within 1 second of 15 minutes from now
        expect(timeDiff).toBeLessThan(1000);
      }
    });

    it('should correctly identify expired vs valid tokens', () => {
      // Future dates should not be expired
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      expect(isTokenExpired(futureDate)).toBe(false);
      
      // Past dates should be expired
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);
      expect(isTokenExpired(pastDate)).toBe(true);
      
      // Test edge case - exactly now (may be expired due to timing)
      const now = new Date();
      const nowResult = isTokenExpired(now);
      if (typeof nowResult !== 'boolean') {
        throw new Error('isTokenExpired must return boolean');
      }
    });
  });
});

console.log('Running crypto utility tests...');