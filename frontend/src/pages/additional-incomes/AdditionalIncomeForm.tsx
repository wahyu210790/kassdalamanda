import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const additionalIncomeSchema = z.object({
  income_date: z.string().min(1, 'Tanggal wajib diisi'),
  description: z.string().trim().min(1, 'Keterangan wajib diisi'),
  amount: z.number({ message: 'Jumlah harus berupa angka' }).min(1, 'Jumlah harus lebih dari 0'),
});

type AdditionalIncomeFormValues = z.infer<typeof additionalIncomeSchema>;

export interface AdditionalIncomeItem {
  id: number;
  academic_year_id: number;
  income_date: string;
  description: string;
  amount: number;
  created_at?: string;
}

interface AdditionalIncomeFormProps {
  isOpen: boolean;
  onClose: () => void;
  academicYearId: number;
  editingItem: AdditionalIncomeItem | null;
  walletSummary: {
    terkumpul: number;
    dipakai: number;
    sisa: number;
  };
}

export function AdditionalIncomeForm({
  isOpen,
  onClose,
  academicYearId,
  editingItem,
  walletSummary,
}: AdditionalIncomeFormProps) {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AdditionalIncomeFormValues>({
    resolver: zodResolver(additionalIncomeSchema),
    defaultValues: {
      income_date: new Date().toISOString().split('T')[0],
      description: '',
      amount: undefined as unknown as number,
    },
  });

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (editingItem) {
        reset({
          income_date: editingItem.income_date.slice(0, 10),
          description: editingItem.description,
          amount: editingItem.amount,
        });
      } else {
        reset({
          income_date: new Date().toISOString().split('T')[0],
          description: '',
          amount: undefined as unknown as number,
        });
      }
    }
  }, [isOpen, editingItem, reset]);

  const watchAmount = watch('amount');
  const numericAmount = typeof watchAmount === 'number' && !Number.isNaN(watchAmount) ? watchAmount : 0;

  const isInsufficientOnEdit = Boolean(
    editingItem &&
      numericAmount > 0 &&
      walletSummary.terkumpul - editingItem.amount + numericAmount < walletSummary.dipakai
  );

  const mutation = useMutation({
    mutationFn: async (data: AdditionalIncomeFormValues) => {
      if (editingItem) {
        const res = await api.put(`/additional-incomes/${editingItem.id}`, data);
        return res.data;
      }
      const res = await api.post('/additional-incomes', {
        ...data,
        academic_year_id: academicYearId,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additional-incomes'] });
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
          setErrorMsg(fieldErrors.join(' ') || errorData.message || 'Sisa tidak cukup.');
        } else {
          setErrorMsg(errorData.message || 'Sisa tidak cukup.');
        }
      } else {
        setErrorMsg('Gagal menyimpan pemasukan tambahan.');
      }
    },
  });

  const onSubmit = (data: AdditionalIncomeFormValues) => {
    if (isInsufficientOnEdit) {
      setErrorMsg('Sisa tidak cukup.');
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Ubah Pemasukan tambahan' : 'Tambah Pemasukan tambahan'}
          </DialogTitle>
          <DialogDescription>
            Catat dana pemasukan tambahan kelas untuk tahun ajaran aktif.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="income_date" className="text-sm font-medium">
              Tanggal
            </label>
            <Input
              id="income_date"
              type="date"
              {...register('income_date')}
              className={errors.income_date ? 'border-destructive' : ''}
              disabled={mutation.isPending}
            />
            {errors.income_date && (
              <p className="text-xs text-destructive">{errors.income_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Keterangan
            </label>
            <Textarea
              id="description"
              placeholder="Masukkan keterangan pemasukan tambahan..."
              rows={3}
              {...register('description')}
              className={errors.description ? 'border-destructive' : ''}
              disabled={mutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Keterangan ini akan tampil di halaman publik.
            </p>
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Jumlah (Rp)
            </label>
            <Input
              id="amount"
              type="number"
              placeholder="50000"
              {...register('amount', { valueAsNumber: true })}
              className={cn(
                (errors.amount || isInsufficientOnEdit) &&
                  'border-destructive focus-visible:ring-destructive'
              )}
              disabled={mutation.isPending}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
            {isInsufficientOnEdit && (
              <p className="text-xs font-medium text-destructive">Sisa tidak cukup.</p>
            )}
          </div>

          {errorMsg && !isInsufficientOnEdit && (
            <div className="p-3 text-sm rounded-lg bg-destructive/15 text-destructive border border-destructive/20 font-medium break-words">
              {errorMsg}
            </div>
          )}

          <DialogFooter className="pt-4 border-t mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              disabled={mutation.isPending || isInsufficientOnEdit}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
