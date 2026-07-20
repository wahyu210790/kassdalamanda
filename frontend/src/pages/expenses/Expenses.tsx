import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Plus, Search, Trash, AlertTriangle, Receipt } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ExpenseForm } from './ExpenseForm';

interface Expense {
  id: number;
  title: string;
  description: string | null;
  amount: number;
  expense_date: string;
  source: string;
  category: {
    id: number;
    name: string;
  };
}

export function Expenses() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [academicYearId] = useState(1);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', academicYearId],
    queryFn: async () => {
      const response = await api.get(`/expenses?academic_year_id=${academicYearId}`);
      return response.data.data as Expense[];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    }
  });

  const handleDelete = (id: number, title: string) => {
    if (window.confirm(`Yakin ingin menghapus pengeluaran "${title}"? Ini akan mengembalikan saldo.`)) {
      deleteMutation.mutate(id);
    }
  };

  const filteredExpenses = expenses.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pengeluaran</h2>
          <p className="text-muted-foreground mt-1">Catat penggunaan dana kas dan tabungan.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto" variant="destructive">
          <Plus className="w-4 h-4 mr-2" />
          Catat Pengeluaran
        </Button>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari judul atau kategori..." 
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            Total: {filteredExpenses.length} Transaksi
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Tanggal</TableHead>
                <TableHead>Judul</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Sumber Dana</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead className="text-right w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Memuat data pengeluaran...
                  </TableCell>
                </TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Receipt className="w-8 h-8 text-muted-foreground/30 mb-2" />
                      <p>Tidak ada data pengeluaran ditemukan.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="group">
                    <TableCell className="font-medium whitespace-nowrap">
                      {expense.expense_date}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{expense.title}</div>
                      {expense.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {expense.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{expense.category?.name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          expense.source === 'cash' 
                            ? 'border-blue-200 text-blue-700 bg-blue-50' 
                            : 'border-emerald-200 text-emerald-700 bg-emerald-50'
                        }
                      >
                        {expense.source === 'cash' ? 'Uang Kas' : 'Uang Tabungan'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-rose-600">
                      -{formatRupiah(expense.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => handleDelete(expense.id, expense.title)}
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

      <ExpenseForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        academicYearId={academicYearId}
      />
    </div>
  );
}
