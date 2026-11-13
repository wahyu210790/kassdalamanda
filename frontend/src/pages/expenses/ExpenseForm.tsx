import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn, formatRupiah, labelDompet } from '@/lib/utils';

const expenseSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter"),
  description: z.string().optional(),
  amount: z.number({ message: "Nominal wajib diisi" }).min(500, "Nominal minimal Rp 500"),
  expense_date: z.string().min(1, "Tanggal wajib diisi"),
  category_id: z.number({ message: "Kategori wajib dipilih." }).min(1, "Kategori wajib dipilih."),
  source: z.enum(['cash', 'saving', 'additional_income']),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export interface ExpenseItem {
  id: number;
  academic_year_id?: number;
  category_id?: number;
  title: string;
  description: string | null;
  amount: number;
  expense_date: string;
  source: 'cash' | 'saving' | 'additional_income';
  category: string;
}

export interface WalletsSummary {
  cash: { terkumpul: number; dipakai: number; sisa: number };
  saving: { terkumpul: number; dipakai: number; sisa: number };
  additional_income: { terkumpul: number; dipakai: number; sisa: number };
}

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  academicYearId: number;
  editingExpense?: ExpenseItem | null;
  walletsSummary?: WalletsSummary | null;
}

export function ExpenseForm({
  isOpen,
  onClose,
  academicYearId,
  editingExpense = null,
  walletsSummary = null,
}: ExpenseFormProps) {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const response = await api.get('/expense-categories');
      return response.data.data;
    },
    enabled: isOpen
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_date: new Date().toISOString().split('T')[0],
      source: 'cash',
    }
  });

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (editingExpense) {
        let resolvedCategoryId = editingExpense.category_id;
        if (!resolvedCategoryId && categories.length > 0 && editingExpense.category) {
          const found = categories.find((c: any) => c.name === editingExpense.category);
          if (found) resolvedCategoryId = found.id;
        }
        reset({
          title: editingExpense.title,
          description: editingExpense.description || '',
          amount: editingExpense.amount,
          expense_date: editingExpense.expense_date.slice(0, 10),
          category_id: resolvedCategoryId || 0,
          source: editingExpense.source || 'cash',
        });
      } else {
        reset({
          title: '',
          description: '',
          amount: undefined as unknown as number,
          expense_date: new Date().toISOString().split('T')[0],
          category_id: undefined as unknown as number,
          source: 'cash',
        });
      }
    }
  }, [isOpen, editingExpense, categories, reset]);

  const watchSource = watch('source') || 'cash';
  const watchCategoryId = watch('category_id');
  const watchAmount = watch('amount');

  const rawWalletSisa = walletsSummary?.[watchSource]?.sisa ?? 0;
  const availableSisa =
    editingExpense && editingExpense.source === watchSource
      ? rawWalletSisa + editingExpense.amount
      : rawWalletSisa;

  const numericAmount = typeof watchAmount === 'number' && !Number.isNaN(watchAmount) ? watchAmount : 0;
  const isOverBalance = walletsSummary !== null && numericAmount > availableSisa;

  const mutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      const payload = { ...data, academic_year_id: academicYearId };
      if (editingExpense) {
        const response = await api.put(`/expenses/${editingExpense.id}`, payload);
        return response.data;
      }
      const response = await api.post(`/expenses`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['wallets-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['public-dashboard-summary'] });
      handleClose();
    },
    onError: (err: any) => {
      if (err.response?.status === 422) {
        const errorData = err.response.data;
        if (errorData.errors) {
          const fieldErrors = Object.values(errorData.errors).flat() as string[];
          setErrorMsg(fieldErrors.join(' ') || errorData.message || 'Validasi gagal');
        } else {
          setErrorMsg(errorData.message || 'Validasi gagal');
        }
      } else {
        setErrorMsg('Gagal menyimpan pengeluaran. Saldo mungkin tidak mencukupi.');
      }
    }
  });

  const onSubmit = (data: ExpenseFormValues) => {
    if (isOverBalance) {
      setErrorMsg('Nominal melebihi Sisa.');
      return;
    }
    setErrorMsg('');
    mutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    setErrorMsg('');
    onClose();
  };

  const hasNoCategories = !isCategoriesLoading && categories.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingExpense ? 'Ubah Pengeluaran' : 'Catat Pengeluaran Baru'}
          </DialogTitle>
          <DialogDescription>
            Masukkan detail pengeluaran. Pastikan saldo mencukupi.
          </DialogDescription>
        </DialogHeader>

        {hasNoCategories && (
          <div className="p-3 text-sm rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <div>Belum ada kategori pengeluaran. Kategori perlu ditambahkan dulu sebelum mencatat pengeluaran.</div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Judul / Keperluan</label>
            <Input 
              placeholder="Contoh: Beli Sapu Kelas" 
              {...register('title')} 
              className={errors.title ? 'border-destructive' : ''}
              disabled={hasNoCategories || mutation.isPending}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nominal (Rp)</label>
              <Input 
                type="number"
                placeholder="50000" 
                {...register('amount', { valueAsNumber: true })} 
                className={cn(
                  (errors.amount || isOverBalance) &&
                    'border-destructive focus-visible:ring-destructive bg-destructive/5'
                )}
                disabled={hasNoCategories || mutation.isPending}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              {isOverBalance && (
                <p className="text-xs font-medium text-destructive">Nominal melebihi Sisa.</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal</label>
              <Input 
                type="date"
                {...register('expense_date')} 
                className={errors.expense_date ? 'border-destructive' : ''}
                disabled={hasNoCategories || mutation.isPending}
              />
              {errors.expense_date && <p className="text-xs text-destructive">{errors.expense_date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategori</label>
              <Select 
                value={watchCategoryId ? watchCategoryId.toString() : ''} 
                onValueChange={(val: string) => setValue('category_id', parseInt(val, 10), { shouldValidate: true })}
                disabled={hasNoCategories || mutation.isPending}
              >
                <SelectTrigger className={errors.category_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Diambil dari</label>
              <Select 
                value={watchSource} 
                onValueChange={(val: 'cash' | 'saving' | 'additional_income') =>
                  setValue('source', val, { shouldValidate: true })
                }
                disabled={hasNoCategories || mutation.isPending}
              >
                <SelectTrigger
                  className={cn(
                    isOverBalance && 'border-destructive ring-1 ring-destructive bg-destructive/5'
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Saldo Kas</SelectItem>
                  <SelectItem value="saving">Saldo Tabungan</SelectItem>
                  <SelectItem value="additional_income">Pemasukan tambahan</SelectItem>
                </SelectContent>
              </Select>
              {walletsSummary && (
                <div
                  className={cn(
                    'text-xs px-2.5 py-1.5 rounded-md border flex items-center justify-between',
                    isOverBalance
                      ? 'border-destructive bg-destructive/10 text-destructive font-semibold'
                      : 'border-border bg-muted/40 text-muted-foreground'
                  )}
                >
                  <span>Sisa {labelDompet(watchSource)}:</span>
                  <span className="font-semibold">{formatRupiah(availableSisa)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Keterangan Tambahan (Opsional)</label>
            <Textarea 
              placeholder="Catatan tambahan..." 
              {...register('description')} 
              rows={3}
              disabled={hasNoCategories || mutation.isPending}
            />
          </div>

          {errorMsg && !isOverBalance && (
            <div className="p-3 text-sm rounded-lg bg-destructive/15 text-destructive border border-destructive/20 font-medium break-words">
              {errorMsg}
            </div>
          )}

          <DialogFooter className="pt-4 border-t mt-6">
            <Button type="button" variant="outline" onClick={handleClose} disabled={mutation.isPending}>
              Batal
            </Button>
            <Button 
              type="submit" 
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              disabled={mutation.isPending || hasNoCategories || isOverBalance}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Pengeluaran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
