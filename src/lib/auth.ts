import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Hash password using PBKDF2-SHA256 (Passlib compatible)
 * Format: $pbkdf2-sha256$29000$salt$hash
 */
export async function hashPassword(password: string): Promise<string> {
  const iterations = 29000;
  const saltLength = 32;
  const keyLength = 32;
  
  // Generate random salt
  const salt = crypto.randomBytes(saltLength);
  
  // Hash password using PBKDF2-SHA256
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    keyLength,
    'sha256'
  );
  
  // Convert to base64 (Passlib uses adapted base64)
  const saltB64 = salt.toString('base64').replace(/\+/g, '.').replace(/=/g, '');
  const hashB64 = hash.toString('base64').replace(/\+/g, '.').replace(/=/g, '');
  
  // Return in Passlib format: $pbkdf2-sha256$iterations$salt$hash
  return `$pbkdf2-sha256$${iterations}$${saltB64}$${hashB64}`;
}

/**
 * Verify password against PBKDF2-SHA256 hash (Passlib compatible)
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    // Parse the hash format: $pbkdf2-sha256$iterations$salt$hash
    const parts = hashedPassword.split('$');
    
    if (parts.length !== 5 || parts[1] !== 'pbkdf2-sha256') {
      return false;
    }
    
    const iterations = parseInt(parts[2], 10);
    const saltB64 = parts[3];
    const hashB64 = parts[4];
    
    // Convert base64 back (reverse the Passlib adapted base64)
    const salt = Buffer.from(saltB64.replace(/\./g, '+') + '==', 'base64');
    const expectedHash = Buffer.from(hashB64.replace(/\./g, '+') + '==', 'base64');
    
    // Hash the provided password with the same salt
    const keyLength = expectedHash.length;
    const actualHash = crypto.pbkdf2Sync(
      password,
      salt,
      iterations,
      keyLength,
      'sha256'
    );
    
    // Compare hashes using timing-safe comparison
    return crypto.timingSafeEqual(expectedHash, actualHash);
  } catch {
    return false;
  }
}

export function generateToken(userId: number, role?: string): string {
  const payload: any = { userId };
  if (role) {
    payload.role = role;
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: number; role?: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role?: string };
    return decoded;
  } catch (error) {
    return null;
  }
}
