import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function nomorWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }
  if (digits.startsWith('62')) {
    return digits;
  }
  if (digits.startsWith('8')) {
    return '62' + digits;
  }
  return digits;
}

const BULAN_PENDEK_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des',
];

export function formatTanggalIndonesia(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const clean = String(dateStr).slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const monthIdx = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    if (!Number.isNaN(year) && monthIdx >= 0 && monthIdx < 12 && !Number.isNaN(day)) {
      return `${day} ${BULAN_PENDEK_ID[monthIdx]} ${year}`;
    }
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return `${d.getDate()} ${BULAN_PENDEK_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function labelDompet(source: string | null | undefined): string {
  if (source === 'cash') return 'Saldo Kas';
  if (source === 'saving') return 'Saldo Tabungan';
  if (source === 'additional_income') return 'Pemasukan tambahan';
  return source || '-';
}

export function tanggalHariIniWIB(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
