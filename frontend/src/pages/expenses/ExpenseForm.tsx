import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { cn, formatRupiah, labelDompet, tanggalHariIniWIB } from '@/lib/utils';

const expenseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Keterangan wajib diisi.")
    .min(3, "Keterangan minimal 3 karakter."),
  description: z.string().optional(),
  amount: z
    .number({ message: "Nominal harus lebih dari 0." })
    .min(1, "Nominal harus lebih dari 0.")
    .max(1000000000, "Nominal maksimal Rp 1.000.000.000."),
  expense_date: z.string().min(1, "Tanggal wajib diisi"),
  source: z.enum(['cash', 'saving', 'additional_income'], {
    message: "Diambil dari wajib dipilih.",
  }),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export interface ExpenseItem {
  id: number;
  academic_year_id?: number;
  category_id?: number | null;
  title: string;
  description: string | null;
  amount: number;
  expense_date: string;
  source: 'cash' | 'saving' | 'additional_income';
  category?: string | null;
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
      expense_date: tanggalHariIniWIB(),
    }
  });

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (editingExpense) {
        reset({
          title: editingExpense.title,
          description: editingExpense.description || '',
          amount: editingExpense.amount,
          expense_date: editingExpense.expense_date.slice(0, 10),
          source: editingExpense.source,
        });
      } else {
        reset({
          title: '',
          description: '',
          amount: undefined as unknown as number,
          expense_date: tanggalHariIniWIB(),
          source: undefined as unknown as ExpenseFormValues['source'],
        });
      }
    }
  }, [isOpen, editingExpense, reset]);

  const watchSource = watch('source');
  const watchAmount = watch('amount');

  const rawWalletSisa = watchSource ? (walletsSummary?.[watchSource]?.sisa ?? 0) : 0;
  const availableSisa =
    watchSource && editingExpense && editingExpense.source === watchSource
      ? rawWalletSisa + editingExpense.amount
      : rawWalletSisa;

  const numericAmount = typeof watchAmount === 'number' && !Number.isNaN(watchAmount) ? watchAmount : 0;
  const isEditingSameSourceNotIncreasing = Boolean(
    editingExpense && watchSource === editingExpense.source && numericAmount > 0 && numericAmount <= editingExpense.amount
  );
  const isOverBalance =
    walletsSummary !== null &&
    Boolean(watchSource) &&
    !isEditingSameSourceNotIncreasing &&
    numericAmount > availableSisa;

  const isEditingFromAdditionalIncome = editingExpense?.source === 'additional_income';
  const hasAdditionalIncomeData = Boolean(
    walletsSummary &&
      (walletsSummary.additional_income.terkumpul !== 0 ||
        walletsSummary.additional_income.dipakai !== 0)
  );
  const showAdditionalIncomeOption = hasAdditionalIncomeData || isEditingFromAdditionalIncome;
  const isAdditionalIncomeZeroDisabled =
    !isEditingFromAdditionalIncome &&
    hasAdditionalIncomeData &&
    (walletsSummary?.additional_income.sisa ?? 0) <= 0;

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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Keterangan (untuk apa uangnya) <span className="text-destructive">*</span>
            </label>
            <Input 
              placeholder="Contoh: Beli Sapu Kelas" 
              {...register('title')} 
              className={errors.title ? 'border-destructive' : ''}
              disabled={mutation.isPending}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nominal (Rp) <span className="text-destructive">*</span>
              </label>
              <Input 
                type="number"
                placeholder="50000" 
                {...register('amount', { valueAsNumber: true })} 
                className={cn(
                  (errors.amount || isOverBalance) &&
                    'border-destructive focus-visible:ring-destructive bg-destructive/5'
                )}
                disabled={mutation.isPending}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              {isOverBalance && (
                <p className="text-xs font-medium text-destructive">Nominal melebihi Sisa.</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Tanggal <span className="text-destructive">*</span>
              </label>
              <Input 
                type="date"
                {...register('expense_date')} 
                className={errors.expense_date ? 'border-destructive' : ''}
                disabled={mutation.isPending}
              />
              {errors.expense_date && <p className="text-xs text-destructive">{errors.expense_date.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Diambil dari <span className="text-destructive">*</span>
            </label>
            <Select 
              value={watchSource || ''} 
              onValueChange={(val: 'cash' | 'saving' | 'additional_income') =>
                setValue('source', val, { shouldValidate: true })
              }
              disabled={mutation.isPending}
            >
              <SelectTrigger
                className={cn(
                  'w-full',
                  errors.source && 'border-destructive',
                  isOverBalance && 'border-destructive ring-1 ring-destructive bg-destructive/5'
                )}
              >
                <SelectValue placeholder="Pilih..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Saldo Kas</SelectItem>
                <SelectItem value="saving">Saldo Tabungan</SelectItem>
                {showAdditionalIncomeOption && (
                  <SelectItem
                    value="additional_income"
                    disabled={isAdditionalIncomeZeroDisabled}
                  >
                    {isAdditionalIncomeZeroDisabled
                      ? 'Pemasukan tambahan (Sisa Rp 0)'
                      : 'Pemasukan tambahan'}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.source && <p className="text-xs text-destructive">{errors.source.message}</p>}
            {walletsSummary && watchSource && (
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Catatan tambahan (opsional)</label>
            <Textarea 
              placeholder="Catatan tambahan..." 
              {...register('description')} 
              rows={3}
              disabled={mutation.isPending}
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
              disabled={mutation.isPending || !watchSource || isOverBalance}
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
