/**
 * Cryptographic Password Generation and Entropy Analysis Engine
 * Uses window.crypto.getRandomValues with rejection sampling to eliminate modulo bias.
 */

export interface GeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
}

export type StrengthLevel = 'Weak' | 'Fair' | 'Strong' | 'Excellent';

export interface PasswordAnalysis {
  strength: StrengthLevel;
  score: 1 | 2 | 3 | 4;
  entropyBits: number;
  poolSize: number;
  estimatedCrackTime: string;
  charTypesCount: number;
  details: {
    hasUpper: boolean;
    hasLower: boolean;
    hasNumbers: boolean;
    hasSymbols: boolean;
    isLongEnough: boolean;
  };
}

export interface PasswordHistoryItem {
  id: string;
  password: string;
  timestamp: number;
  length: number;
  strength: StrengthLevel;
  entropyBits: number;
}

// Character definitions
export const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
export const NUMBER_CHARS = '0123456789';
export const SYMBOL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// Characters prone to visual ambiguity
export const AMBIGUOUS_CHARS = new Set(['l', 'I', '1', 'O', '0', 'o', '|', '`', ';', ':']);

/**
 * Cryptographically secure random integer in range [0, max - 1]
 * Uses rejection sampling to eliminate modulo bias completely.
 */
export function getSecureRandomInt(max: number): number {
  if (max <= 0) return 0;
  if (max === 1) return 0;

  // Maximum multiple of max that fits in a 32-bit unsigned integer (2^32 = 4294967296)
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  let value: number;

  do {
    window.crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);

  return value % max;
}

/**
 * Filter character set removing ambiguous characters if requested
 */
export function filterChars(source: string, excludeAmbiguous: boolean): string {
  if (!excludeAmbiguous) return source;
  return source
    .split('')
    .filter((char) => !AMBIGUOUS_CHARS.has(char))
    .join('');
}

/**
 * Generates a cryptographically secure password adhering to specified criteria.
 * Guarantees at least one character from each enabled set, followed by uniform distribution.
 */
export function generateCryptographicPassword(options: GeneratorOptions): string {
  const {
    length = 16,
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSymbols,
    excludeAmbiguous,
  } = options;

  const validLength = Math.max(8, Math.min(64, length));

  // Build active pools
  const pools: { chars: string; type: string }[] = [];

  if (includeUppercase) {
    const chars = filterChars(UPPERCASE_CHARS, excludeAmbiguous);
    if (chars.length > 0) pools.push({ chars, type: 'upper' });
  }
  if (includeLowercase) {
    const chars = filterChars(LOWERCASE_CHARS, excludeAmbiguous);
    if (chars.length > 0) pools.push({ chars, type: 'lower' });
  }
  if (includeNumbers) {
    const chars = filterChars(NUMBER_CHARS, excludeAmbiguous);
    if (chars.length > 0) pools.push({ chars, type: 'number' });
  }
  if (includeSymbols) {
    const chars = filterChars(SYMBOL_CHARS, excludeAmbiguous);
    if (chars.length > 0) pools.push({ chars, type: 'symbol' });
  }

  // Fallback if all unchecked (should be guarded in UI as well)
  if (pools.length === 0) {
    const fallback = filterChars(LOWERCASE_CHARS, excludeAmbiguous);
    pools.push({ chars: fallback, type: 'lower' });
  }

  const combinedPool = pools.map((p) => p.chars).join('');
  const passwordChars: string[] = [];

  // Guarantee at least one character from each active character set
  for (const pool of pools) {
    if (passwordChars.length < validLength) {
      const idx = getSecureRandomInt(pool.chars.length);
      passwordChars.push(pool.chars[idx]);
    }
  }

  // Fill remaining length from combined pool
  while (passwordChars.length < validLength) {
    const idx = getSecureRandomInt(combinedPool.length);
    passwordChars.push(combinedPool[idx]);
  }

  // Cryptographic Fisher-Yates shuffle to avoid predictable leading character set positions
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    const temp = passwordChars[i];
    passwordChars[i] = passwordChars[j];
    passwordChars[j] = temp;
  }

  return passwordChars.join('');
}

/**
 * Calculates Shannon Information Entropy (bits) and evaluates password resilience.
 */
export function analyzePassword(password: string, options?: GeneratorOptions): PasswordAnalysis {
  if (!password || password.length === 0) {
    return {
      strength: 'Weak',
      score: 1,
      entropyBits: 0,
      poolSize: 0,
      estimatedCrackTime: 'Instant',
      charTypesCount: 0,
      details: {
        hasUpper: false,
        hasLower: false,
        hasNumbers: false,
        hasSymbols: false,
        isLongEnough: false,
      },
    };
  }

  let poolSize = 0;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^A-Za-z0-9]/.test(password);

  if (hasUpper) poolSize += 26;
  if (hasLower) poolSize += 26;
  if (hasNumbers) poolSize += 10;
  if (hasSymbols) poolSize += 32;

  // Account for ambiguous exclusions if options provided
  if (options?.excludeAmbiguous) {
    poolSize = Math.max(10, poolSize - 8);
  }

  const charTypesCount = [hasUpper, hasLower, hasNumbers, hasSymbols].filter(Boolean).length;
  const length = password.length;
  const isLongEnough = length >= 12;

  // Entropy = L * log2(poolSize)
  const entropyBits = Math.round(length * (Math.log2(Math.max(2, poolSize))));

  // Evaluate tier based on standard NIST/EFF entropy thresholds:
  // < 45 bits: Weak
  // 45 - 65 bits: Fair
  // 65 - 85 bits: Strong
  // >= 85 bits: Excellent
  let strength: StrengthLevel;
  let score: 1 | 2 | 3 | 4;

  if (entropyBits < 45 || length < 10 || charTypesCount < 2) {
    strength = 'Weak';
    score = 1;
  } else if (entropyBits < 65 || length < 12 || charTypesCount < 3) {
    strength = 'Fair';
    score = 2;
  } else if (entropyBits < 85 || length < 16) {
    strength = 'Strong';
    score = 3;
  } else {
    strength = 'Excellent';
    score = 4;
  }

  // Realistic offline GPU cluster brute force assumption: 100 billion guesses/sec (10^11)
  const guessesPerSecond = 1e11;
  // Average attempts required is 0.5 * poolSize^length
  // Using log to avoid floating point overflow with large passwords
  const log10Guesses = length * Math.log10(Math.max(2, poolSize)) - Math.log10(2);
  const log10Seconds = log10Guesses - 11; // 10^11 guesses/sec

  let estimatedCrackTime = 'Instant';
  if (log10Seconds <= 0) {
    estimatedCrackTime = 'Instant';
  } else if (log10Seconds < 1.77) {
    // < 60s
    estimatedCrackTime = `${Math.max(1, Math.round(Math.pow(10, log10Seconds)))} seconds`;
  } else if (log10Seconds < 3.55) {
    // < 1 hour
    const mins = Math.round(Math.pow(10, log10Seconds) / 60);
    estimatedCrackTime = `${mins} min${mins === 1 ? '' : 's'}`;
  } else if (log10Seconds < 4.93) {
    // < 1 day
    const hours = Math.round(Math.pow(10, log10Seconds) / 3600);
    estimatedCrackTime = `${hours} hour${hours === 1 ? '' : 's'}`;
  } else if (log10Seconds < 7.49) {
    // < 1 year
    const days = Math.round(Math.pow(10, log10Seconds) / 86400);
    estimatedCrackTime = `${days} days`;
  } else if (log10Seconds < 9.49) {
    // < 100 years
    const years = Math.round(Math.pow(10, log10Seconds) / 31536000);
    estimatedCrackTime = `${years} years`;
  } else if (log10Seconds < 13) {
    const millionYears = Math.round(Math.pow(10, log10Seconds - 6) / 31.536);
    estimatedCrackTime = `${millionYears.toLocaleString()} million years`;
  } else {
    estimatedCrackTime = 'Centuries / Impractical';
  }

  return {
    strength,
    score,
    entropyBits,
    poolSize,
    estimatedCrackTime,
    charTypesCount,
    details: {
      hasUpper,
      hasLower,
      hasNumbers,
      hasSymbols,
      isLongEnough,
    },
  };
}

/**
 * Character category identifier for colored syntax rendering
 */
export function getCharCategory(char: string): 'upper' | 'lower' | 'number' | 'symbol' | 'ambiguous' {
  if (AMBIGUOUS_CHARS.has(char)) return 'ambiguous';
  if (/[A-Z]/.test(char)) return 'upper';
  if (/[a-z]/.test(char)) return 'lower';
  if (/[0-9]/.test(char)) return 'number';
  return 'symbol';
}
