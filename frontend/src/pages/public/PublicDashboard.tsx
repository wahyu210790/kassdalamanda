import { useState } from "react"
import { Search, Loader2, Info, CheckCircle2, XCircle, Wallet, Coins, TrendingDown, Users, Sparkles, ChevronRight, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import api from "@/lib/axios"
import { useQuery } from "@tanstack/react-query"
import { cn, formatTanggalIndonesia, labelDompet } from "@/lib/utils"
import { daftarBulanTahunAjaran, getBulanTimelineStatus } from "@/lib/tahunAjaran"

interface StudentSummary {
  id: number;
  student_name: string;
  parent_name: string;
  summary: {
    total_kas_paid: number;
    total_saving_paid: number;
    kas_months: number[];
    saving_months: number[];
  };
}

interface AcademicYearInfo {
  name: string;
  start_date: string;
  end_date: string;
}

interface WalletBreakdown {
  terkumpul: number;
  dipakai: number;
  sisa: number;
}

interface AdditionalIncomePublicItem {
  id: number;
  income_date: string;
  description: string;
  amount: number;
}

interface AdditionalIncomePublic extends WalletBreakdown {
  items: AdditionalIncomePublicItem[];
}

interface ExpensePublicItem {
  id: number;
  expense_date: string;
  title: string;
  amount: number;
  source: 'cash' | 'saving' | 'additional_income';
  description?: string | null;
}

interface GlobalSummary {
  cash_balance: number;
  saving_balance: number;
  total_expense: number;
  student_count: number;
  academic_year?: AcademicYearInfo;
  cash?: WalletBreakdown;
  saving?: WalletBreakdown;
  additional_income?: AdditionalIncomePublic | null;
  expenses?: {
    total: number;
    items: ExpensePublicItem[];
  };
}

type ActiveDetailSheet = 'cash' | 'saving' | 'additional_income' | 'expenses' | null;

export function PublicDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [queryTerm, setQueryTerm] = useState("")
  const [activeSheet, setActiveSheet] = useState<ActiveDetailSheet>(null)

  const { data: searchResults, isLoading, isError, error } = useQuery({
    queryKey: ['public-student-search', queryTerm],
    queryFn: async () => {
      if (queryTerm.length < 3) return null;
      const res = await api.get(`/public/students/search?query=${encodeURIComponent(queryTerm)}`);
      return res.data.data as StudentSummary[];
    },
    enabled: queryTerm.length >= 3,
    retry: false
  });

  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['public-dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/public/dashboard/summary');
      return res.data.data as GlobalSummary;
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim().length >= 3) {
      setQueryTerm(searchTerm.trim());
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const academicMonths = daftarBulanTahunAjaran(summaryData?.academic_year?.start_date);

  const cashSummary: WalletBreakdown = summaryData?.cash ?? {
    terkumpul: summaryData?.cash_balance ?? 0,
    dipakai: 0,
    sisa: summaryData?.cash_balance ?? 0,
  };

  const savingSummary: WalletBreakdown = summaryData?.saving ?? {
    terkumpul: summaryData?.saving_balance ?? 0,
    dipakai: 0,
    sisa: summaryData?.saving_balance ?? 0,
  };

  const additionalIncomeSummary = summaryData?.additional_income ?? null;
  const allExpenseItems = summaryData?.expenses?.items ?? [];
  const totalExpenses = summaryData?.expenses?.total ?? summaryData?.total_expense ?? 0;

  const renderMonthChips = (paidMonths: number[], type: 'kas' | 'tabungan') => {
    return (
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {academicMonths.map(({ month, year, monthNameShort, monthNameLong }) => {
          const isPaid = paidMonths.includes(month);
          const timeline = getBulanTimelineStatus(month, year);
          const isCurrentMonth = timeline === 'current';
          const isFuture = timeline === 'future';

          let statusLabel = '';
          if (isPaid) {
            statusLabel = 'Lunas';
          } else if (isFuture) {
            statusLabel = 'Belum jatuh tempo';
          } else {
            statusLabel = 'Belum bayar';
          }

          const chipAriaLabel = `${monthNameLong} ${year}: ${statusLabel}`;

          return (
            <div
              key={`${type}-${month}-${year}`}
              aria-label={chipAriaLabel}
              title={chipAriaLabel}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 rounded-md text-xs font-medium transition-all text-center select-none",
                isPaid
                  ? "bg-success/15 border border-success/40 text-success font-semibold"
                  : isFuture
                    ? "bg-transparent border border-dashed border-muted-foreground/30 text-muted-foreground/60"
                    : "bg-muted/30 border border-border text-muted-foreground",
                isCurrentMonth && "ring-2 ring-primary ring-offset-1 font-semibold"
              )}
            >
              {isPaid ? (
                <CheckCircle2 className="h-4 w-4 mb-1 text-success shrink-0" />
              ) : isFuture ? (
                <div className="h-4 w-4 mb-1 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></span>
                </div>
              ) : (
                <XCircle className="h-4 w-4 mb-1 text-muted-foreground/80 shrink-0" />
              )}
              <span className="leading-tight">{monthNameShort}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!activeSheet || !summaryData) return null;

    let title = '';
    let walletSummary: WalletBreakdown | null = null;
    let expenseSectionTitle = '';
    let filteredExpenses: ExpensePublicItem[] = [];

    if (activeSheet === 'cash') {
      title = 'Saldo Kas';
      walletSummary = cashSummary;
      expenseSectionTitle = 'Pengeluaran dari Saldo Kas';
      filteredExpenses = allExpenseItems.filter((item) => item.source === 'cash');
    } else if (activeSheet === 'saving') {
      title = 'Saldo Tabungan';
      walletSummary = savingSummary;
      expenseSectionTitle = 'Pengeluaran dari Saldo Tabungan';
      filteredExpenses = allExpenseItems.filter((item) => item.source === 'saving');
    } else if (activeSheet === 'additional_income' && additionalIncomeSummary) {
      title = 'Pemasukan tambahan';
      walletSummary = {
        terkumpul: additionalIncomeSummary.terkumpul,
        dipakai: additionalIncomeSummary.dipakai,
        sisa: additionalIncomeSummary.sisa,
      };
      expenseSectionTitle = 'Pengeluaran dari Pemasukan tambahan';
      filteredExpenses = allExpenseItems.filter((item) => item.source === 'additional_income');
    } else if (activeSheet === 'expenses') {
      title = 'Pengeluaran';
      filteredExpenses = allExpenseItems;
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
        onClick={() => setActiveSheet(null)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="public-sheet-title"
          className="bg-background w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border shadow-xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
            <h3 id="public-sheet-title" className="text-lg font-bold text-foreground">
              {title}
            </h3>
            <button
              type="button"
              aria-label="Tutup"
              onClick={() => setActiveSheet(null)}
              className="inline-flex items-center justify-center h-11 w-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xl leading-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {walletSummary && (
              <div className="grid grid-cols-3 gap-2.5 bg-muted/40 p-3.5 rounded-xl border">
                <div>
                  <p className="text-xs text-muted-foreground">Terkumpul</p>
                  <p className="text-sm sm:text-base font-semibold text-foreground mt-0.5">
                    {formatCurrency(walletSummary.terkumpul)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sudah dipakai</p>
                  <p className="text-sm sm:text-base font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                    {formatCurrency(walletSummary.dipakai)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sisa</p>
                  <p className="text-sm sm:text-base font-bold text-primary mt-0.5">
                    {formatCurrency(walletSummary.sisa)}
                  </p>
                </div>
              </div>
            )}

            {activeSheet === 'expenses' && (
              <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Pengeluaran</span>
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(totalExpenses)}
                </span>
              </div>
            )}

            {activeSheet === 'additional_income' && additionalIncomeSummary && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Daftar Pemasukan tambahan
                </h4>
                {additionalIncomeSummary.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3 text-center border rounded-xl border-dashed">
                    Belum ada pemasukan tambahan
                  </p>
                ) : (
                  <div className="divide-y border rounded-xl bg-card">
                    {additionalIncomeSummary.items.map((inc) => (
                      <div key={inc.id} className="p-3.5 flex items-start justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-sm font-medium text-foreground break-words">
                            {inc.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTanggalIndonesia(inc.income_date)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300 shrink-0">
                          {formatCurrency(inc.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2.5">
              {activeSheet !== 'expenses' && (
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {expenseSectionTitle}
                </h4>
              )}
              {filteredExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center border rounded-xl border-dashed">
                  {activeSheet === 'expenses'
                    ? 'Belum ada pengeluaran'
                    : 'Belum ada pengeluaran dari pos ini'}
                </p>
              ) : (
                <div className="divide-y border rounded-xl bg-card">
                  {filteredExpenses.map((exp) => (
                    <div key={exp.id} className="p-3.5 flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-medium text-foreground break-words">
                          {exp.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatTanggalIndonesia(exp.expense_date)}</span>
                          {activeSheet === 'expenses' && (
                            <span>• Diambil dari: {labelDompet(exp.source)}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                        {formatCurrency(exp.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t bg-muted/20 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveSheet(null)}
              className="w-full min-h-[44px] font-medium"
            >
              Tutup
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto px-2 sm:px-0">
      <div className="text-center space-y-3 sm:space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Cek Data Kas & Tabungan</h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-4 sm:px-0">
          Masukkan nama siswa untuk melihat transparansi pembayaran uang kas dan tabungan kelas.
        </p>
      </div>

      {/* Kotak Pencarian Siswa (Paling Atas) */}
      <Card className="shadow-lg border-primary/20 mx-2 sm:mx-0">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama siswa..." 
                className="pl-10 h-12 text-base rounded-xl"
              />
            </div>
            <Button type="submit" disabled={searchTerm.trim().length < 3} className="h-12 w-full sm:w-auto px-8 rounded-xl font-medium">
              Cari Data
            </Button>
          </form>
          <div className="mt-2 ml-1 space-y-1">
            <p className="text-xs text-muted-foreground">
              Ketik minimal 3 huruf, lalu tekan Cari Data.
            </p>
            {searchTerm.length > 0 && searchTerm.trim().length < 3 && (
              <p className="text-xs text-destructive">Masukkan minimal 3 huruf.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hasil Pencarian Siswa (Tepat di bawah kotak cari, di atas ringkasan kelas) */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
          <p>Mencari data siswa...</p>
        </div>
      )}

      {isError && (
        <Card className="bg-destructive/10 border-destructive/20 text-destructive mx-2 sm:mx-0">
          <CardContent className="pt-6 flex items-center gap-3">
            <Info className="h-5 w-5 shrink-0" />
            <p>{(error as any)?.response?.data?.message || "Terjadi kesalahan saat mencari data."}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && searchResults?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-dashed mx-2 sm:mx-0">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Siswa tidak ditemukan</p>
          <p className="text-sm">Coba gunakan kata kunci nama yang berbeda.</p>
        </div>
      )}

      {!isLoading && searchResults && searchResults.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold px-1">Hasil Pencarian ({searchResults.length})</h2>
          {searchResults.map((student) => (
            <Card key={student.id} className="overflow-hidden shadow-md mx-2 sm:mx-0">
              <CardHeader className="bg-primary/5 pb-4 border-b">
                <CardTitle className="text-2xl text-primary">{student.student_name}</CardTitle>
                <CardDescription>Nama Wali: {student.parent_name}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x">
                  
                  {/* Uang Kas Section */}
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Uang Kas</p>
                        <p className="text-2xl font-bold text-success">{formatCurrency(student.summary.total_kas_paid)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Riwayat Pembayaran Kas</p>
                      {renderMonthChips(student.summary.kas_months, 'kas')}
                    </div>
                  </div>

                  {/* Tabungan Section */}
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Tabungan</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(student.summary.total_saving_paid)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Bulan Menabung</p>
                      {renderMonthChips(student.summary.saving_months, 'tabungan')}
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Legenda Status Bulan */}
      <div className="bg-muted/30 border rounded-xl p-4 mx-2 sm:mx-0 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Keterangan Status Bulan:</span>
          {summaryData?.academic_year?.name && (
            <span className="text-xs text-muted-foreground">
              Tahun ajaran {summaryData.academic_year.name} (Juli–Juni)
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-foreground font-medium">Lunas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-muted-foreground" />
            <span>Belum bayar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded border border-dashed border-muted-foreground/60 flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40"></span>
            </div>
            <span>Belum jatuh tempo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded border-2 border-primary bg-background"></div>
            <span>Bulan ini</span>
          </div>
        </div>
      </div>

      {/* Ringkasan Kelas dalam SATU Kotak */}
      {!isLoadingSummary && summaryData && (
        <Card className="bg-card shadow-sm border mx-2 sm:mx-0 overflow-hidden">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg font-semibold text-foreground">
                Tahun Ajaran {summaryData.academic_year?.name ?? "-"}
              </CardTitle>
              <span className="text-xs text-muted-foreground">Ketuk pos untuk rincian</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3 sm:space-y-4">
            {/* Baris Atas Desktop: Saldo Kas, Saldo Tabungan, Pemasukan tambahan (jika ada) */}
            <div
              className={cn(
                "grid grid-cols-1 gap-3",
                additionalIncomeSummary ? "md:grid-cols-3" : "md:grid-cols-2"
              )}
            >
              {/* 1. Saldo Kas (Biru, paling menonjol, ikon Wallet) */}
              <button
                type="button"
                onClick={() => setActiveSheet('cash')}
                className="w-full min-h-[44px] flex items-center justify-between gap-3 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100/70 dark:hover:bg-blue-900/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-blue-900/80 dark:text-blue-200">Saldo Kas</p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-700 dark:text-blue-300 truncate">
                      {formatCurrency(cashSummary.sisa)}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
              </button>

              {/* 2. Saldo Tabungan (Hijau, ikon Coins) */}
              <button
                type="button"
                onClick={() => setActiveSheet('saving')}
                className="w-full min-h-[44px] flex items-center justify-between gap-3 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Saldo Tabungan</p>
                    <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
                      {formatCurrency(savingSummary.sisa)}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              </button>

              {/* 3. Pemasukan tambahan (Ungu muda, HANYA tampil jika additional_income !== null) */}
              {additionalIncomeSummary !== null && (
                <button
                  type="button"
                  onClick={() => setActiveSheet('additional_income')}
                  className="w-full min-h-[44px] flex items-center justify-between gap-3 p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/60 dark:bg-purple-950/20 hover:bg-purple-100/60 dark:hover:bg-purple-900/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-xl shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Pemasukan tambahan</p>
                      <p className="text-lg sm:text-2xl font-bold text-purple-700 dark:text-purple-300 truncate">
                        {formatCurrency(additionalIncomeSummary.sisa)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Baris Bawah Desktop: Pengeluaran dan Siswa Aktif */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* 4. Pengeluaran (Bisa diklik) */}
              <button
                type="button"
                onClick={() => setActiveSheet('expenses')}
                className="w-full min-h-[44px] flex items-center justify-between gap-3 p-3.5 rounded-xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/15 hover:bg-rose-100/50 dark:hover:bg-rose-900/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Pengeluaran</p>
                    <p className="text-base sm:text-xl font-bold text-rose-600 dark:text-rose-400 truncate">
                      {formatCurrency(totalExpenses)}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
              </button>

              {/* 5. Siswa Aktif (Angka saja, TIDAK bisa diklik) */}
              <div className="w-full min-h-[44px] flex items-center justify-between gap-3 p-3.5 rounded-xl border bg-muted/20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Siswa Aktif</p>
                    <p className="text-base sm:text-xl font-bold text-foreground">
                      {summaryData.student_count}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {renderDetailModal()}
    </div>
  )
}
