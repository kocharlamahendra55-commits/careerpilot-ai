import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production.');
}

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set; using an insecure development fallback.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'STUDENT' | 'RECRUITER' | 'ADMIN';
  iat?: number;
  exp?: number;
}

// Password operations
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT operations
export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d', // Token expires in 7 days
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// Cookie operations
export function setSessionCookie(token: string): Headers {
  const headers = new Headers();
  
  // Set HTTP-only cookie (remove Secure for local development)
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = [
    `session=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${7 * 24 * 60 * 60}`
  ];
  
  if (isProduction) {
    cookieOptions.splice(1, 0, 'Secure');
  }
  
  headers.set('Set-Cookie', cookieOptions.join('; '));
  
  return headers;
}

export function clearSessionCookie(): Headers {
  const headers = new Headers();

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = [
    'session=',
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0'
  ];

  if (isProduction) {
    cookieOptions.splice(1, 0, 'Secure');
  }

  headers.set('Set-Cookie', cookieOptions.join('; '));

  return headers;
}

export function getTokenFromRequest(req: NextRequest): string | null {
  // Try to get token from cookie first
  const sessionCookie = req.cookies.get('session');
  if (sessionCookie?.value) {
    return sessionCookie.value;
  }

  // Fallback to Authorization header
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

export function getUserFromRequest(req: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  
  return verifyToken(token);
}

// Middleware helper
export function requireAuth(roles?: ('STUDENT' | 'RECRUITER' | 'ADMIN')[]): (req: NextRequest) => JWTPayload | null {
  return (req: NextRequest) => {
    const user = getUserFromRequest(req);
    
    if (!user) return null;
    
    if (roles && !roles.includes(user.role)) {
      return null; // User doesn't have required role
    }
    
    return user;
  };
}

// Session operations for server-side requests
export async function getSession(): Promise<JWTPayload | null> {
  try {
    // This function is for server-side use where we don't have access to NextRequest
    // For API routes, use getUserFromRequest instead
    return null;
  } catch (error) {
    console.error('Session retrieval failed:', error);
    return null;
  }
}
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}