import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

const expenseSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter"),
  description: z.string().optional(),
  amount: z.coerce.number().min(500, "Nominal minimal Rp 500"),
  expense_date: z.string().min(1, "Tanggal wajib diisi"),
  expense_category_id: z.coerce.number().min(1, "Pilih kategori"),
  source: z.enum(['cash', 'saving']),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  academicYearId: number;
}

export function ExpenseForm({ isOpen, onClose, academicYearId }: ExpenseFormProps) {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');

  const { data: categories = [] } = useQuery({
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

  const watchSource = watch('source');
  const watchCategoryId = watch('expense_category_id');

  const mutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      const payload = { ...data, academic_year_id: academicYearId };
      const response = await api.post(`/expenses`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      handleClose();
    },
    onError: (err: any) => {
      if (err.response?.status === 422) {
        setErrorMsg(err.response.data.message || 'Validasi gagal');
      } else {
        setErrorMsg('Gagal menyimpan pengeluaran. Saldo mungkin tidak mencukupi.');
      }
    }
  });

  const onSubmit = (data: ExpenseFormValues) => {
    setErrorMsg('');
    mutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    setErrorMsg('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Catat Pengeluaran Baru</DialogTitle>
          <DialogDescription>
            Masukkan detail pengeluaran. Pastikan saldo mencukupi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Judul / Keperluan</label>
            <Input 
              placeholder="Contoh: Beli Sapu Kelas" 
              {...register('title')} 
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nominal (Rp)</label>
              <Input 
                type="number"
                placeholder="50000" 
                {...register('amount')} 
                className={errors.amount ? 'border-destructive' : ''}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal</label>
              <Input 
                type="date"
                {...register('expense_date')} 
                className={errors.expense_date ? 'border-destructive' : ''}
              />
              {errors.expense_date && <p className="text-xs text-destructive">{errors.expense_date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategori</label>
              <Select 
                value={watchCategoryId?.toString() || ''} 
                onValueChange={(val) => setValue('expense_category_id', parseInt(val))}
              >
                <SelectTrigger className={errors.expense_category_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.expense_category_id && <p className="text-xs text-destructive">{errors.expense_category_id.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sumber Dana</label>
              <Select 
                value={watchSource} 
                onValueChange={(val: 'cash' | 'saving') => setValue('source', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Uang Kas</SelectItem>
                  <SelectItem value="saving">Uang Tabungan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Keterangan Tambahan (Opsional)</label>
            <Textarea 
              placeholder="Catatan tambahan..." 
              {...register('description')} 
              rows={3}
            />
          </div>

          {errorMsg && (
            <div className="p-3 text-sm rounded-lg bg-destructive/15 text-destructive border border-destructive/20 font-medium">
              {errorMsg}
            </div>
          )}

          <DialogFooter className="pt-4 border-t mt-6">
            <Button type="button" variant="outline" onClick={handleClose} disabled={mutation.isPending}>
              Batal
            </Button>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Pengeluaran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
