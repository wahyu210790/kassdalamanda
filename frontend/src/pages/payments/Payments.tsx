import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Plus, Search, Trash, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PaymentForm } from './PaymentForm';

interface PaymentMonth {
  id: number;
  month: number;
  year: number;
  payment_type: string;
}

interface Payment {
  id: number;
  student: {
    student_name: string;
  };
  total_amount: number;
  payment_date: string;
  months: PaymentMonth[];
}

export function Payments() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [academicYearId] = useState(1);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', academicYearId],
    queryFn: async () => {
      const response = await api.get(`/payments?academic_year_id=${academicYearId}`);
      return response.data.data as Payment[];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    }
  });

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Yakin ingin membatalkan/menghapus transaksi dari ${name}? Ini akan mengurangi saldo kas/tabungan.`)) {
      deleteMutation.mutate(id);
    }
  };

  const filteredPayments = payments.filter(p => 
    p.student?.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMonthName = (month: number) => {
    const date = new Date();
    date.setMonth(month - 1);
    return date.toLocaleString('id-ID', { month: 'short' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pembayaran</h2>
          <p className="text-muted-foreground mt-1">Kelola transaksi kas dan tabungan siswa.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Catat Pembayaran
        </Button>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari nama siswa..." 
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            Menampilkan: {filteredPayments.length} Transaksi
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Tanggal</TableHead>
                <TableHead>Nama Siswa</TableHead>
                <TableHead>Jenis & Bulan dibayar</TableHead>
                <TableHead className="text-right">Total Nominal</TableHead>
                <TableHead className="text-right w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Memuat data transaksi...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <AlertTriangle className="w-8 h-8 text-muted-foreground/30 mb-2" />
                      <p>Tidak ada data pembayaran ditemukan.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className="group">
                    <TableCell className="font-medium whitespace-nowrap">
                      {payment.payment_date}
                    </TableCell>
                    <TableCell className="font-semibold">{payment.student.student_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {payment.months.map((m) => (
                          <Badge 
                            key={m.id} 
                            variant="secondary" 
                            className={`text-xs ${
                              m.payment_type === 'cash' 
                                ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' 
                                : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                            }`}
                          >
                            {m.payment_type === 'cash' ? 'Kas' : 'Tabungan'}: {formatMonthName(m.month)} {m.year}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">
                      {formatRupiah(payment.total_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => handleDelete(payment.id, payment.student.student_name)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PaymentForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        academicYearId={academicYearId}
      />
    </div>
  );
}
