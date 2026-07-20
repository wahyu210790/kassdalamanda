import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Info } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  academicYearId: number;
}

export function PaymentForm({ isOpen, onClose, academicYearId }: PaymentFormProps) {
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedMonths, setSelectedMonths] = useState<any[]>([]);

  // Fetch Students
  const { data: students = [] } = useQuery({
    queryKey: ['students-active', academicYearId],
    queryFn: async () => {
      const response = await api.get(`/students?academic_year_id=${academicYearId}`);
      // Filter only active students
      return response.data.data.filter((s: any) => s.status === 'active');
    },
    enabled: isOpen
  });

  // Fetch Student's Unpaid Details (Settings & Paid Months)
  const { data: studentDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['student-details', selectedStudent, academicYearId],
    queryFn: async () => {
      if (!selectedStudent) return null;
      const response = await api.get(`/students/${selectedStudent}`);
      return response.data.data;
    },
    enabled: !!selectedStudent && isOpen
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        student_id: selectedStudent,
        academic_year_id: academicYearId,
        payment_date: new Date().toISOString().split('T')[0],
        months: selectedMonths.map(m => ({
          month: m.month,
          year: m.year,
          payment_type: m.type
        }))
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
    onClose();
  };

  const handleMonthToggle = (monthStr: string, year: number, type: 'cash' | 'saving') => {
    const month = parseInt(monthStr);
    const existingIndex = selectedMonths.findIndex(m => m.month === month && m.year === year && m.type === type);
    
    if (existingIndex >= 0) {
      setSelectedMonths(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      setSelectedMonths(prev => [...prev, { month, year, type }]);
    }
  };

  // Generate 12 months for the academic year (July to June)
  const generateAcademicMonths = () => {
    const months = [];
    let currentMonth = 7; // July
    let currentYear = 2026; // Hardcoded start year for MVP

    for (let i = 0; i < 12; i++) {
      months.push({ month: currentMonth, year: currentYear });
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }
    return months;
  };

  const academicMonths = generateAcademicMonths();

  const isMonthPaid = (month: number, year: number, type: string) => {
    if (!studentDetails) return false;
    return studentDetails.payments?.some((p: any) => 
      p.months?.some((m: any) => m.month === month && m.year === year && m.payment_type === type)
    );
  };

  // Hitung total bayar berdasarkan nominal dari backend (setting)
  const calculateTotal = () => {
    if (!studentDetails) return 0;
    const cashAmount = studentDetails.settings?.monthly_cash_amount || 10000;
    const savingAmount = studentDetails.settings?.monthly_saving_amount || 5000;
    
    let total = 0;
    selectedMonths.forEach(m => {
      if (m.type === 'cash') total += cashAmount;
      if (m.type === 'saving') total += savingAmount;
    });
    return total;
  };

  const totalAmount = calculateTotal();

  const formatMonthName = (month: number) => {
    const date = new Date();
    date.setMonth(month - 1);
    return date.toLocaleString('id-ID', { month: 'long' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
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
            <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={mutation.isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih siswa..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((student: any) => (
                  <SelectItem key={student.id} value={student.id.toString()}>
                    {student.student_name}
                  </SelectItem>
                ))}
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
                    <h4 className="text-sm font-medium mb-3">Pilih Bulan (Centang yang dibayar)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {academicMonths.map(({ month, year }) => {
                        const monthName = formatMonthName(month);
                        const isCashPaid = isMonthPaid(month, year, 'cash');
                        const isSavingPaid = isMonthPaid(month, year, 'saving');
                        
                        const isCashSelected = selectedMonths.some(m => m.month === month && m.year === year && m.type === 'cash');
                        const isSavingSelected = selectedMonths.some(m => m.month === month && m.year === year && m.type === 'saving');

                        return (
                          <div key={`${month}-${year}`} className="border p-3 rounded-lg space-y-2 bg-card">
                            <div className="font-semibold text-sm border-b pb-1 mb-2">
                              {monthName} {year}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id={`cash-${month}-${year}`} 
                                disabled={isCashPaid || mutation.isPending}
                                checked={isCashPaid || isCashSelected}
                                onCheckedChange={() => handleMonthToggle(month.toString(), year, 'cash')}
                              />
                              <label
                                htmlFor={`cash-${month}-${year}`}
                                className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${isCashPaid ? 'text-muted-foreground' : ''}`}
                              >
                                Kas {isCashPaid && '(Lunas)'}
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id={`saving-${month}-${year}`} 
                                disabled={isSavingPaid || mutation.isPending}
                                checked={isSavingPaid || isSavingSelected}
                                onCheckedChange={() => handleMonthToggle(month.toString(), year, 'saving')}
                              />
                              <label
                                htmlFor={`saving-${month}-${year}`}
                                className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${isSavingPaid ? 'text-muted-foreground' : ''}`}
                              >
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
                    <div className="p-3 text-sm rounded-lg bg-destructive/15 text-destructive border border-destructive/20">
                      Terjadi kesalahan saat menyimpan transaksi.
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
              disabled={mutation.isPending || selectedMonths.length === 0 || !selectedStudent}
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
