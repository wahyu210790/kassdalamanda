import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Plus, Search, Trash, Pencil, Receipt, Wallet, Coins, Sparkles, Loader2 } from 'lucide-react';
import { cn, formatRupiah, formatTanggalIndonesia, labelDompet } from '@/lib/utils';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ExpenseForm, type ExpenseItem, type WalletsSummary } from './ExpenseForm';
import { useTahunAjaranAktif } from '@/hooks/useTahunAjaranAktif';
import { ambilSemuaHalaman } from '@/lib/ambilSemuaHalaman';

export function Expenses() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseItem | null>(null);

  const { 
    data: tahunAjaran, 
    isLoading: isYearLoading, 
    isError: isYearError, 
    error: yearError 
  } = useTahunAjaranAktif();
  const academicYearId = tahunAjaran?.id;

  const { data: expenses = [], isLoading: isExpensesLoading } = useQuery({
    queryKey: ['expenses', academicYearId],
    queryFn: async () => {
      if (!academicYearId) return [];
      return await ambilSemuaHalaman<ExpenseItem>(`/expenses?academic_year_id=${academicYearId}`);
    },
    enabled: !!academicYearId,
  });

  const { data: walletsSummary = null } = useQuery({
    queryKey: ['wallets-summary', academicYearId],
    queryFn: async () => {
      if (!academicYearId) return null;
      const res = await api.get(`/wallets/summary?academic_year_id=${academicYearId}`);
      return res.data.data as WalletsSummary;
    },
    enabled: !!academicYearId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['wallets-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['public-dashboard-summary'] });
      setDeletingExpense(null);
    }
  });

  const handleOpenCreate = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (expense: ExpenseItem) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const filteredExpenses = expenses.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.category && e.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    labelDompet(e.source).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const is404Year = (yearError as any)?.response?.status === 404;

  const showAdditionalIncomeCard = Boolean(
    walletsSummary &&
      (walletsSummary.additional_income.terkumpul !== 0 ||
        walletsSummary.additional_income.dipakai !== 0)
  );

  const getSourceBadgeClass = (source: string) => {
    if (source === 'cash') {
      return 'border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/40';
    }
    if (source === 'saving') {
      return 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/40';
    }
    return 'border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950/40';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pengeluaran</h2>
          <p className="text-muted-foreground mt-1">Catat penggunaan dana dari Saldo Kas, Saldo Tabungan, atau Pemasukan tambahan.</p>
        </div>
        <Button 
          onClick={handleOpenCreate} 
          className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1D4ED8] text-white" 
          disabled={!academicYearId || isYearLoading}
        >
          <Plus className="w-4 h-4 mr-2" />
          Catat Pengeluaran
        </Button>
      </div>

      {isYearError && (
        <div className="p-4 rounded-xl bg-destructive/15 text-destructive border border-destructive/20 text-sm font-medium">
          {is404Year 
            ? "Belum ada tahun ajaran aktif. Aktifkan tahun ajaran dulu." 
            : "Gagal memuat tahun ajaran. Coba muat ulang halaman."}
        </div>
      )}

      {/* Kartu Ringkas Sisa Dompet */}
      <div
        className={cn(
          'grid grid-cols-1 gap-4',
          showAdditionalIncomeCard ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        )}
      >
        <Card className="border-blue-200/80 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Sisa Saldo Kas</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {formatRupiah(walletsSummary?.cash.sisa ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Sisa Saldo Tabungan</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatRupiah(walletsSummary?.saving.sisa ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {showAdditionalIncomeCard && (
          <Card className="border-purple-200/80 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Sisa Pemasukan tambahan</p>
                <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                  {formatRupiah(walletsSummary?.additional_income.sisa ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari judul, kategori, atau dompet..." 
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            Total: {filteredExpenses.length} Transaksi
          </div>
        </div>

        {isYearLoading || isExpensesLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            Memuat data pengeluaran...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Receipt className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p>Tidak ada data pengeluaran ditemukan.</p>
          </div>
        ) : (
          <>
            {/* Tampilan Kartu di HP (< md) */}
            <div className="divide-y md:hidden">
              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-foreground break-words min-w-0">
                      {expense.title}
                    </p>
                    <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0">
                      -{formatRupiah(expense.amount)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {formatTanggalIndonesia(expense.expense_date)} · {expense.category || '-'}
                  </p>

                  {expense.description && (
                    <p className="text-xs text-muted-foreground break-words">
                      {expense.description}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">Diambil dari:</span>
                    <Badge variant="outline" className={getSourceBadgeClass(expense.source)}>
                      {labelDompet(expense.source)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] px-3"
                      onClick={() => handleOpenEdit(expense)}
                    >
                      <Pencil className="w-4 h-4 mr-1.5" />
                      Ubah
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] px-3 text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => setDeletingExpense(expense)}
                    >
                      <Trash className="w-4 h-4 mr-1.5" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tampilan Tabel di Laptop (md ke atas) */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Diambil dari</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead className="text-right w-[140px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className="group">
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatTanggalIndonesia(expense.expense_date)}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{expense.title}</div>
                        {expense.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {expense.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{expense.category || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={getSourceBadgeClass(expense.source)}
                        >
                          {labelDompet(expense.source)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-rose-600">
                        -{formatRupiah(expense.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 sm:h-9 sm:w-9 text-foreground hover:bg-muted"
                            aria-label="Ubah"
                            title="Ubah"
                            onClick={() => handleOpenEdit(expense)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon" 
                            className="h-11 w-11 sm:h-9 sm:w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50" 
                            aria-label="Hapus"
                            title="Hapus"
                            onClick={() => setDeletingExpense(expense)}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {academicYearId && (
        <ExpenseForm 
          isOpen={isFormOpen} 
          onClose={() => {
            setIsFormOpen(false);
            setEditingExpense(null);
          }} 
          academicYearId={academicYearId}
          editingExpense={editingExpense}
          walletsSummary={walletsSummary}
        />
      )}

      {/* Dialog Konfirmasi Hapus di dalam halaman */}
      <Dialog
        open={!!deletingExpense}
        onOpenChange={(open: boolean) => !open && setDeletingExpense(null)}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Hapus</DialogTitle>
            <DialogDescription>
              {deletingExpense
                ? `Yakin ingin menghapus pengeluaran "${deletingExpense.title}"? Ini akan mengembalikan saldo.`
                : ''}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingExpense(null)}
              disabled={deleteMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deletingExpense && deleteMutation.mutate(deletingExpense.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
