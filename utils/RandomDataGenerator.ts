import { randomBytes, randomInt } from 'node:crypto';

const normalizePrefix = (prefix: string): string => {
  const normalized = prefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
  return normalized || 'test';
};

export class RandomDataGenerator {
  public static string(prefix = 'data', bytes = 6): string {
    if (!Number.isInteger(bytes) || bytes < 1) {
      throw new Error('Số byte ngẫu nhiên phải là số nguyên dương');
    }
    return `${normalizePrefix(prefix)}-${randomBytes(bytes).toString('hex')}`;
  }

  public static email(prefix = 'user'): string {
    return `${normalizePrefix(prefix)}.${randomBytes(6).toString('hex')}@example.test`;
  }

  public static phoneNumber(): string {
    return `09${String(randomInt(0, 100_000_000)).padStart(8, '0')}`;
  }

  public static integer(minimum: number, maximum: number): number {
    if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum > maximum) {
      throw new Error('Biên số nguyên ngẫu nhiên phải là các số nguyên hợp lệ');
    }
    return randomInt(minimum, maximum + 1);
  }
}
