import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, Info, Check } from 'lucide-react';
import { formatRupiah, tanggalHariIniWIB } from '@/lib/utils';
import { daftarBulanTahunAjaran } from '@/lib/tahunAjaran';
import { useTahunAjaranAktif } from '@/hooks/useTahunAjaranAktif';

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  academicYearId?: number;
  startDate?: string | null;
}

export function PaymentForm({ isOpen, onClose, academicYearId: propYearId, startDate: propStartDate }: PaymentFormProps) {
  const queryClient = useQueryClient();
  const { data: tahunAjaranAktif } = useTahunAjaranAktif();
  const effectiveYearId = propYearId || tahunAjaranAktif?.id;
  const effectiveStartDate = propStartDate ?? tahunAjaranAktif?.start_date;

  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedMonths, setSelectedMonths] = useState<Array<{ month: number; year: number; type: 'cash' | 'saving' }>>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch Students for this academic year
  const { data: students = [] } = useQuery({
    queryKey: ['students-active', effectiveYearId],
    queryFn: async () => {
      if (!effectiveYearId) return [];
      const response = await api.get(`/students?academic_year_id=${effectiveYearId}`);
      // Filter only active students
      return response.data.data.filter((s: any) => s.status === 'active');
    },
    enabled: isOpen && !!effectiveYearId
  });

  const filteredStudents = students.filter((s: any) => 
    s.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch Student's Unpaid Details (Settings & Paid Months)
  const { data: studentDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['student-details', selectedStudent, effectiveYearId],
    queryFn: async () => {
      if (!selectedStudent) return null;
      const response = await api.get(`/students/${selectedStudent}`);
      return response.data.data;
    },
    enabled: !!selectedStudent && isOpen && !!effectiveYearId
  });

  const academicMonths = daftarBulanTahunAjaran(effectiveStartDate);

  const isMonthPaid = (month: number, type: 'cash' | 'saving'): boolean => {
    if (!studentDetails || !studentDetails.payments) return false;
    return studentDetails.payments.some((p: any) => 
      p.months?.some((m: any) => {
        const matchType = m.payment_type === type;
        const matchMonth = m.month === month;
        const matchYear = !m.academic_year_id || !effectiveYearId || m.academic_year_id === effectiveYearId;
        return matchType && matchMonth && matchYear;
      })
    );
  };

  const handleMonthToggle = (month: number, year: number, type: 'cash' | 'saving') => {
    // Tolak bulan yang sudah lunas (pertahanan ganda)
    if (isMonthPaid(month, type)) return;

    const existingIndex = selectedMonths.findIndex(
      m => m.month === month && m.year === year && m.type === type
    );
    
    if (existingIndex >= 0) {
      setSelectedMonths(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      setSelectedMonths(prev => [...prev, { month, year, type }]);
    }
  };

  const handleStudentChange = (val: string) => {
    setSelectedStudent(val);
    setSelectedMonths([]); // Kosongkan pilihan bulan saat ganti murid
  };

  const mutation = useMutation({
    mutationFn: async () => {
      // Hanya kirim bulan yang belum lunas
      const validMonths = selectedMonths
        .filter(m => !isMonthPaid(m.month, m.type))
        .map(m => ({
          month: m.month,
          year: m.year,
          payment_type: m.type
        }));

      const payload = {
        student_id: selectedStudent,
        academic_year_id: effectiveYearId,
        payment_date: tanggalHariIniWIB(),
        months: validMonths
      };
      const response = await api.post(`/payments`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
      handleClose();
    },
  });

  const handleClose = () => {
    setSelectedStudent("");
    setSelectedMonths([]);
    setSearchQuery("");
    onClose();
  };

  // Hitung total bayar berdasarkan nominal dari backend (setting), hanya bulan belum lunas
  const calculateTotal = () => {
    if (!studentDetails) return 0;
    const cashAmount = studentDetails.settings?.monthly_cash_amount || 10000;
    const savingAmount = studentDetails.settings?.monthly_saving_amount || 5000;
    
    let total = 0;
    selectedMonths.forEach(m => {
      if (!isMonthPaid(m.month, m.type)) {
        if (m.type === 'cash') total += cashAmount;
        if (m.type === 'saving') total += savingAmount;
      }
    });
    return total;
  };

  const totalAmount = calculateTotal();
  const validSelectedCount = selectedMonths.filter(m => !isMonthPaid(m.month, m.type)).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Catat Pembayaran Baru</DialogTitle>
          <DialogDescription>
            Pilih siswa dan bulan yang akan dibayar (Kas / Tabungan).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pilih Siswa</label>
            <Select value={selectedStudent} onValueChange={handleStudentChange} disabled={mutation.isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih siswa..." />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2 pb-1 sticky top-0 bg-popover z-10">
                  <Input 
                    placeholder="🔍 Cari nama siswa..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="h-8"
                  />
                </div>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student: any) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.student_name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-sm text-center text-muted-foreground">Siswa tidak ditemukan</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedStudent && (
            <>
              {detailsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex bg-blue-500/10 text-blue-700 p-3 rounded-lg items-start gap-3">
                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="text-sm space-y-1">
                      <p><strong>Info Nominal per Bulan:</strong></p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li>Kas: {formatRupiah(studentDetails?.settings?.monthly_cash_amount || 10000)}</li>
                        <li>Tabungan: {formatRupiah(studentDetails?.settings?.monthly_saving_amount || 5000)}</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-1">Pilih Bulan (Centang yang dibayar)</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Bulan yang sudah lunas ditandai “Lunas” dan tidak bisa dicentang lagi.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {academicMonths.map(({ month, year, monthNameLong }) => {
                        const isCashPaid = isMonthPaid(month, 'cash');
                        const isSavingPaid = isMonthPaid(month, 'saving');
                        
                        const isCashSelected = selectedMonths.some(m => m.month === month && m.year === year && m.type === 'cash');
                        const isSavingSelected = selectedMonths.some(m => m.month === month && m.year === year && m.type === 'saving');

                        return (
                          <div key={`${month}-${year}`} className="border p-3 rounded-lg space-y-2 bg-card">
                            <div className="font-semibold text-sm border-b pb-1 mb-2">
                              {monthNameLong} {year}
                            </div>
                            
                            {/* Opsi Kas */}
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id={`cash-${month}-${year}`} 
                                disabled={isCashPaid || mutation.isPending}
                                checked={isCashPaid || isCashSelected}
                                onCheckedChange={() => handleMonthToggle(month, year, 'cash')}
                              />
                              <label
                                htmlFor={`cash-${month}-${year}`}
                                className={`text-sm font-medium leading-none flex items-center gap-1 ${
                                  isCashPaid 
                                    ? 'text-success font-semibold cursor-not-allowed' 
                                    : 'cursor-pointer'
                                }`}
                              >
                                {isCashPaid && <Check className="w-3.5 h-3.5 text-success" />}
                                Kas {isCashPaid && '(Lunas)'}
                              </label>
                            </div>

                            {/* Opsi Tabungan */}
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id={`saving-${month}-${year}`} 
                                disabled={isSavingPaid || mutation.isPending}
                                checked={isSavingPaid || isSavingSelected}
                                onCheckedChange={() => handleMonthToggle(month, year, 'saving')}
                              />
                              <label
                                htmlFor={`saving-${month}-${year}`}
                                className={`text-sm font-medium leading-none flex items-center gap-1 ${
                                  isSavingPaid 
                                    ? 'text-success font-semibold cursor-not-allowed' 
                                    : 'cursor-pointer'
                                }`}
                              >
                                {isSavingPaid && <Check className="w-3.5 h-3.5 text-success" />}
                                Tabungan {isSavingPaid && '(Lunas)'}
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-muted/50 p-4 rounded-xl border">
                    <span className="font-medium">Total Tagihan (Estimasi)</span>
                    <span className="text-2xl font-bold text-primary">{formatRupiah(totalAmount)}</span>
                  </div>
                  
                  {mutation.isError && (
                    <div className="p-3 text-sm rounded-lg bg-destructive/15 text-destructive border border-destructive/20 break-words">
                      Terjadi kesalahan: {
                        (mutation.error as any)?.response?.data?.message || 
                        (mutation.error as any)?.message || 
                        "Kesalahan tidak diketahui"
                      }
                      {(mutation.error as any)?.response?.data?.errors && (
                        <div className="mt-2 text-xs">
                          {JSON.stringify((mutation.error as any).response.data.errors)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={mutation.isPending}>
              Batal
            </Button>
            <Button 
              type="button" 
              onClick={() => mutation.mutate()} 
              disabled={mutation.isPending || validSelectedCount === 0 || !selectedStudent}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Pembayaran
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
