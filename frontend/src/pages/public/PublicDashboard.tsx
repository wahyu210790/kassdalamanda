import { useState } from "react"
import { Search, Loader2, Info, CheckCircle2, XCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import api from "@/lib/axios"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"

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

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
  "Jul", "Ags", "Sep", "Okt", "Nov", "Des"
];

export function PublicDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [queryTerm, setQueryTerm] = useState("")

  const { data: searchResults, isLoading, isError, error } = useQuery({
    queryKey: ['public-student-search', queryTerm],
    queryFn: async () => {
      if (queryTerm.length < 3) return null;
      const res = await api.get(`/public/students/search?query=${queryTerm}`);
      return res.data.data as StudentSummary[];
    },
    enabled: queryTerm.length >= 3,
    retry: false
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.length >= 3) {
      setQueryTerm(searchTerm);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto px-2 sm:px-0">
      <div className="text-center space-y-3 sm:space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Cek Data Kas & Tabungan</h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-4 sm:px-0">
          Masukkan nama siswa untuk melihat transparansi status pembayaran uang kas dan total tabungan kelas.
        </p>
      </div>

      <Card className="shadow-lg border-primary/20 mx-2 sm:mx-0">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ketik minimal 3 huruf nama siswa..." 
                className="pl-10 h-12 text-base sm:text-lg rounded-xl"
              />
            </div>
            <Button type="submit" disabled={searchTerm.length < 3} className="h-12 w-full sm:w-auto px-8 rounded-xl font-medium">
              Cari Data
            </Button>
          </form>
          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <p className="text-xs text-muted-foreground mt-2 ml-2">Masukkan minimal 3 huruf.</p>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
          <p>Mencari data siswa...</p>
        </div>
      )}

      {isError && (
        <Card className="bg-destructive/10 border-destructive/20 text-destructive">
          <CardContent className="pt-6 flex items-center gap-3">
            <Info className="h-5 w-5 shrink-0" />
            <p>{(error as any)?.response?.data?.message || "Terjadi kesalahan saat mencari data."}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && searchResults?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-dashed">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Siswa tidak ditemukan</p>
          <p className="text-sm">Coba gunakan kata kunci nama yang berbeda.</p>
        </div>
      )}

      {!isLoading && searchResults && searchResults.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold px-1">Hasil Pencarian ({searchResults.length})</h2>
          {searchResults.map((student) => (
            <Card key={student.id} className="overflow-hidden shadow-md">
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
                      <div className="grid grid-cols-4 gap-2">
                        {MONTHS.map((month, index) => {
                          const isPaid = student.summary.kas_months.includes(index + 1);
                          return (
                            <div 
                              key={`kas-${index}`}
                              className={cn(
                                "flex flex-col items-center justify-center py-2 rounded-md border text-xs font-medium transition-colors",
                                isPaid 
                                  ? "bg-success/10 border-success/30 text-success" 
                                  : "bg-muted/30 border-border text-muted-foreground/60"
                              )}
                            >
                              {isPaid ? <CheckCircle2 className="h-4 w-4 mb-1" /> : <XCircle className="h-4 w-4 mb-1 opacity-40" />}
                              {month}
                            </div>
                          )
                        })}
                      </div>
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
                      <div className="grid grid-cols-4 gap-2">
                        {MONTHS.map((month, index) => {
                          const isPaid = student.summary.saving_months.includes(index + 1);
                          return (
                            <div 
                              key={`saving-${index}`}
                              className={cn(
                                "flex flex-col items-center justify-center py-2 rounded-md border text-xs font-medium transition-colors",
                                isPaid 
                                  ? "bg-primary/10 border-primary/30 text-primary" 
                                  : "bg-muted/30 border-border text-muted-foreground/60"
                              )}
                            >
                              {isPaid ? <CheckCircle2 className="h-4 w-4 mb-1" /> : <XCircle className="h-4 w-4 mb-1 opacity-40" />}
                              {month}
                            </div>
                          )
                        })}
                      </div>
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
