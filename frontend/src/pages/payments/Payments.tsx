import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Plus, Search, Trash, AlertTriangle } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PaymentForm } from './PaymentForm';
import { useTahunAjaranAktif } from '@/hooks/useTahunAjaranAktif';
import { tahunUntukBulan } from '@/lib/tahunAjaran';
import { ambilSemuaHalaman } from '@/lib/ambilSemuaHalaman';

interface PaymentMonth {
  id?: number;
  month: number;
  year?: number;
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

  const { 
    data: tahunAjaran, 
    isLoading: isYearLoading, 
    isError: isYearError, 
    error: yearError 
  } = useTahunAjaranAktif();
  const academicYearId = tahunAjaran?.id;

  const { data: payments = [], isLoading: isPaymentsLoading } = useQuery({
    queryKey: ['payments', academicYearId],
    queryFn: async () => {
      if (!academicYearId) return [];
      return await ambilSemuaHalaman<Payment>(`/payments?academic_year_id=${academicYearId}`);
    },
    enabled: !!academicYearId,
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
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleString('id-ID', { month: 'short' });
  };

  const is404Year = (yearError as any)?.response?.status === 404;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pembayaran</h2>
          <p className="text-muted-foreground mt-1">Kelola transaksi kas dan tabungan siswa.</p>
        </div>
        <Button 
          onClick={() => setIsFormOpen(true)} 
          className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          disabled={!academicYearId || isYearLoading}
        >
          <Plus className="w-4 h-4 mr-2" />
          Catat Pembayaran
        </Button>
      </div>

      {isYearError && (
        <div className="p-4 rounded-xl bg-destructive/15 text-destructive border border-destructive/20 text-sm font-medium">
          {is404Year 
            ? "Belum ada tahun ajaran aktif. Aktifkan tahun ajaran dulu." 
            : "Gagal memuat tahun ajaran. Coba muat ulang halaman."}
        </div>
      )}

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
              {isYearLoading || isPaymentsLoading ? (
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
                    <TableCell className="font-semibold">{payment.student?.student_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {payment.months.map((m) => {
                          const year = tahunUntukBulan(m.month, tahunAjaran?.start_date);
                          return (
                            <Badge 
                              key={`${payment.id}-${m.payment_type}-${m.month}`} 
                              variant="secondary" 
                              className={`text-xs ${
                                m.payment_type === 'cash' 
                                  ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                              }`}
                            >
                              {m.payment_type === 'cash' ? 'Kas' : 'Tabungan'}: {formatMonthName(m.month)} {year}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">
                      {formatRupiah(payment.total_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-11 w-11 sm:h-8 sm:w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" 
                        aria-label="Batalkan transaksi"
                        title="Batalkan transaksi"
                        onClick={() => handleDelete(payment.id, payment.student?.student_name)}
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
        startDate={tahunAjaran?.start_date}
      />
    </div>
  );
}
