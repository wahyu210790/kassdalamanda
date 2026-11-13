import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Plus, Pencil, Trash, Sparkles, Loader2 } from 'lucide-react';
import { formatRupiah, formatTanggalIndonesia } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import { useTahunAjaranAktif } from '@/hooks/useTahunAjaranAktif';
import { ambilSemuaHalaman } from '@/lib/ambilSemuaHalaman';
import {
  AdditionalIncomeForm,
  type AdditionalIncomeItem,
} from './AdditionalIncomeForm';

interface WalletsSummaryResponse {
  cash: { terkumpul: number; dipakai: number; sisa: number };
  saving: { terkumpul: number; dipakai: number; sisa: number };
  additional_income: { terkumpul: number; dipakai: number; sisa: number };
}

export function AdditionalIncomes() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdditionalIncomeItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<AdditionalIncomeItem | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const {
    data: tahunAjaran,
    isLoading: isYearLoading,
    isError: isYearError,
    error: yearError,
  } = useTahunAjaranAktif();
  const academicYearId = tahunAjaran?.id;

  const { data: items = [], isLoading: isItemsLoading } = useQuery({
    queryKey: ['additional-incomes', academicYearId],
    queryFn: async () => {
      if (!academicYearId) return [];
      return await ambilSemuaHalaman<AdditionalIncomeItem>(
        `/additional-incomes?academic_year_id=${academicYearId}`
      );
    },
    enabled: !!academicYearId,
  });

  const { data: walletsData } = useQuery({
    queryKey: ['wallets-summary', academicYearId],
    queryFn: async () => {
      if (!academicYearId) return null;
      const res = await api.get(`/wallets/summary?academic_year_id=${academicYearId}`);
      return res.data.data as WalletsSummaryResponse;
    },
    enabled: !!academicYearId,
  });

  const walletSummary = walletsData?.additional_income ?? {
    terkumpul: 0,
    dipakai: 0,
    sisa: 0,
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/additional-incomes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additional-incomes'] });
      queryClient.invalidateQueries({ queryKey: ['wallets-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['public-dashboard-summary'] });
      setDeletingItem(null);
      setDeleteError('');
    },
    onError: (err: any) => {
      if (err.response?.status === 422) {
        const errorData = err.response.data;
        if (errorData.errors) {
          const fieldErrors = Object.values(errorData.errors).flat() as string[];
          setDeleteError(fieldErrors.join(' ') || errorData.message || 'Sisa tidak cukup.');
        } else {
          setDeleteError(errorData.message || 'Sisa tidak cukup.');
        }
      } else {
        setDeleteError('Gagal menghapus pemasukan tambahan.');
      }
    },
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: AdditionalIncomeItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (item: AdditionalIncomeItem) => {
    setDeleteError('');
    setDeletingItem(item);
  };

  const is404Year = (yearError as any)?.response?.status === 404;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pemasukan tambahan</h2>
          <p className="text-muted-foreground mt-1">
            Catat dana pemasukan tambahan di luar iuran kas dan tabungan siswa.
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
          disabled={!academicYearId || isYearLoading}
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Pemasukan tambahan
        </Button>
      </div>

      {isYearError && (
        <div className="p-4 rounded-xl bg-destructive/15 text-destructive border border-destructive/20 text-sm font-medium">
          {is404Year
            ? 'Belum ada tahun ajaran aktif. Aktifkan tahun ajaran dulu.'
            : 'Gagal memuat tahun ajaran. Coba muat ulang halaman.'}
        </div>
      )}

      {/* 3 Kartu Ringkas: Terkumpul, Sudah dipakai, Sisa */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Terkumpul</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {formatRupiah(walletSummary.terkumpul)}
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Sudah dipakai</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {formatRupiah(walletSummary.dipakai)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-purple-900/80 dark:text-purple-200">Sisa</p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
              {formatRupiah(walletSummary.sisa)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daftar Pemasukan tambahan */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {isYearLoading || isItemsLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            Memuat data pemasukan tambahan...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Sparkles className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p>Tidak ada data pemasukan tambahan ditemukan.</p>
          </div>
        ) : (
          <>
            {/* Tampilan Kartu di HP */}
            <div className="divide-y md:hidden">
              {items.map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold text-foreground break-words">
                        {item.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTanggalIndonesia(item.income_date)}
                      </p>
                    </div>
                    <span className="font-bold text-purple-700 dark:text-purple-300 shrink-0">
                      {formatRupiah(item.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] px-3"
                      onClick={() => handleOpenEdit(item)}
                    >
                      <Pencil className="w-4 h-4 mr-1.5" />
                      Ubah
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] px-3 text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => handleOpenDelete(item)}
                    >
                      <Trash className="w-4 h-4 mr-1.5" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tampilan Tabel di Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[150px]">Tanggal</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right w-[180px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatTanggalIndonesia(item.income_date)}
                      </TableCell>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-right font-bold text-purple-700 dark:text-purple-300">
                        {formatRupiah(item.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 px-3"
                            onClick={() => handleOpenEdit(item)}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1.5" />
                            Ubah
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={() => handleOpenDelete(item)}
                          >
                            <Trash className="w-3.5 h-3.5 mr-1.5" />
                            Hapus
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
        <AdditionalIncomeForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          academicYearId={academicYearId}
          editingItem={editingItem}
          walletSummary={walletSummary}
        />
      )}

      {/* Dialog Konfirmasi Hapus di dalam halaman */}
      <Dialog
        open={!!deletingItem}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setDeletingItem(null);
            setDeleteError('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Hapus</DialogTitle>
            <DialogDescription>
              {deletingItem
                ? `Yakin ingin menghapus pemasukan tambahan "${deletingItem.description}"?`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="p-3 text-sm rounded-lg bg-destructive/15 text-destructive border border-destructive/20 font-medium break-words">
              {deleteError}
            </div>
          )}

          <DialogFooter className="pt-4 border-t mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeletingItem(null);
                setDeleteError('');
              }}
              disabled={deleteMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
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
