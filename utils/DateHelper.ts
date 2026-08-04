const pad = (value: number): string => String(value).padStart(2, '0');

export class DateHelper {
  public static format(date: Date, format: string): string {
    if (Number.isNaN(date.getTime())) {
      throw new Error('Cannot format an invalid date');
    }

    const day = pad(date.getUTCDate());
    const month = pad(date.getUTCMonth() + 1);
    const year = String(date.getUTCFullYear());

    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        throw new Error(`Unsupported date format: ${format}`);
    }
  }

  public static addDays(date: Date, days: number): Date {
    if (Number.isNaN(date.getTime())) {
      throw new Error('Cannot add days to an invalid date');
    }
    if (!Number.isInteger(days)) {
      throw new Error('Days must be an integer');
    }

    const result = new Date(date.getTime());
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }
}
