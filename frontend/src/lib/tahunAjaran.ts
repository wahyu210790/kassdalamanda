export interface AcademicMonthItem {
  month: number;
  year: number;
  monthNameShort: string;
  monthNameLong: string;
}

export function parseStartDate(startDate?: string | null): { startMonth: number; startYear: number } {
  if (startDate) {
    const parts = startDate.split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
        return { startMonth: month, startYear: year };
      }
    }
  }
  
  // Fallback berdasarkan jam perangkat
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  if (currentMonth >= 7) {
    return { startMonth: 7, startYear: currentYear };
  } else {
    return { startMonth: 7, startYear: currentYear - 1 };
  }
}

export function daftarBulanTahunAjaran(startDate?: string | null): AcademicMonthItem[] {
  const { startMonth, startYear } = parseStartDate(startDate);
  const months: AcademicMonthItem[] = [];

  let m = startMonth;
  let y = startYear;

  for (let i = 0; i < 12; i++) {
    const d = new Date(y, m - 1, 1);
    months.push({
      month: m,
      year: y,
      monthNameShort: d.toLocaleString('id-ID', { month: 'short' }),
      monthNameLong: d.toLocaleString('id-ID', { month: 'long' }),
    });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return months;
}

export function tahunUntukBulan(month: number, startDate?: string | null): number {
  const months = daftarBulanTahunAjaran(startDate);
  const found = months.find((item) => item.month === month);
  return found ? found.year : new Date().getFullYear();
}

export type BulanTimelineStatus = 'past' | 'current' | 'future';

export function getBulanTimelineStatus(
  month: number,
  year: number,
  now: Date = new Date()
): BulanTimelineStatus {
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1; // 1-12

  if (year === curYear && month === curMonth) {
    return 'current';
  }

  if (year < curYear || (year === curYear && month < curMonth)) {
    return 'past';
  }

  return 'future';
}
