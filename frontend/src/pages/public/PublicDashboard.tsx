import { useState } from "react"
import { Search, Loader2, Info, CheckCircle2, XCircle, Wallet, PiggyBank, TrendingDown, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import api from "@/lib/axios"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
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

interface GlobalSummary {
  cash_balance: number;
  saving_balance: number;
  total_expense: number;
  student_count: number;
  academic_year?: AcademicYearInfo;
}

export function PublicDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [queryTerm, setQueryTerm] = useState("")

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
          } else if (isCurrentMonth) {
            statusLabel = 'Belum bayar';
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

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto px-2 sm:px-0">
      <div className="text-center space-y-3 sm:space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Cek Data Kas & Tabungan</h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-4 sm:px-0">
          Masukkan nama siswa untuk melihat transparansi status pembayaran uang kas dan total tabungan kelas.
        </p>
      </div>

      {/* Global Summary Cards - Mobile First Grid */}
      {!isLoadingSummary && summaryData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 px-2 sm:px-0">
          <Card className="bg-card shadow-sm border-blue-100 dark:border-blue-900/30">
            <CardContent className="p-4 flex flex-col items-center sm:items-start text-center sm:text-left space-y-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Saldo Kas</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(summaryData.cash_balance)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-emerald-100 dark:border-emerald-900/30">
            <CardContent className="p-4 flex flex-col items-center sm:items-start text-center sm:text-left space-y-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                <PiggyBank className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Saldo Tabungan</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(summaryData.saving_balance)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-rose-100 dark:border-rose-900/30">
            <CardContent className="p-4 flex flex-col items-center sm:items-start text-center sm:text-left space-y-2">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full">
                <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Pengeluaran</p>
                <p className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(summaryData.total_expense)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-purple-100 dark:border-purple-900/30">
            <CardContent className="p-4 flex flex-col items-center sm:items-start text-center sm:text-left space-y-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Siswa Aktif</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{summaryData.student_count}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                        <p className="text-sm font-medium text-muted-foreground">Status Uang Kas</p>
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
    </div>
  )
}
