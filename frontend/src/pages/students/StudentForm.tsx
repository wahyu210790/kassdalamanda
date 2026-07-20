import { useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';

const studentSchema = z.object({
  student_name: z.string().min(2, "Nama siswa minimal 2 karakter"),
  parent_name: z.string().min(2, "Nama orang tua minimal 2 karakter"),
  phone: z.string().optional().nullable(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  student?: any;
  academicYearId: number;
}

export function StudentForm({ isOpen, onClose, student, academicYearId }: StudentFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!student;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      student_name: '',
      parent_name: '',
      phone: '',
    }
  });

  useEffect(() => {
    if (student) {
      reset({
        student_name: student.student_name,
        parent_name: student.parent_name,
        phone: student.phone || '',
      });
    } else {
      reset({
        student_name: '',
        parent_name: '',
        phone: '',
      });
    }
  }, [student, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: StudentFormValues) => {
      if (isEditing) {
        const response = await api.put(`/students/${student.id}`, data);
        return response.data;
      } else {
        const response = await api.post(`/students?academic_year_id=${academicYearId}`, data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onClose();
      reset();
    },
  });

  const onSubmit = (data: StudentFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Perbarui informasi siswa di bawah ini.' 
              : 'Masukkan data siswa baru untuk tahun ajaran aktif.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="student_name">Nama Siswa</label>
            <Input 
              id="student_name" 
              placeholder="Contoh: Budi Santoso" 
              {...register('student_name')} 
              className={errors.student_name ? 'border-destructive' : ''}
            />
            {errors.student_name && <p className="text-xs text-destructive">{errors.student_name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="parent_name">Nama Orang Tua</label>
            <Input 
              id="parent_name" 
              placeholder="Contoh: Bapak Santoso" 
              {...register('parent_name')} 
              className={errors.parent_name ? 'border-destructive' : ''}
            />
            {errors.parent_name && <p className="text-xs text-destructive">{errors.parent_name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="phone">Nomor WA / HP (Opsional)</label>
            <Input 
              id="phone" 
              placeholder="Contoh: 081234567890" 
              {...register('phone')} 
            />
            <p className="text-[11px] text-muted-foreground">Disarankan diawali dengan 62 atau 08 untuk format WhatsApp.</p>
          </div>

          {mutation.isError && (
            <div className="p-3 text-sm rounded-lg bg-destructive/15 text-destructive border border-destructive/20">
              Terjadi kesalahan. Silakan coba lagi.
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Simpan Perubahan' : 'Tambahkan Siswa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
