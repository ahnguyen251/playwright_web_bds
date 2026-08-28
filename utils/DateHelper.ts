const pad = (value: number): string => String(value).padStart(2, '0');

export class DateHelper {
  public static format(date: Date, format: string): string {
    if (Number.isNaN(date.getTime())) {
      throw new Error('Không thể định dạng ngày không hợp lệ');
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
      throw new Error('Không thể cộng số ngày vào ngày không hợp lệ');
    }
    if (!Number.isInteger(days)) {
      throw new Error('Số ngày phải là số nguyên');
    }

    const result = new Date(date.getTime());
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }
}
