import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Plus, Search, MoreVertical, Edit, Trash, AlertTriangle } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StudentForm } from './StudentForm';

interface Student {
  id: number;
  academic_year_id: number;
  student_name: string;
  parent_name: string;
  phone: string | null;
  status: string;
}

export function Students() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>();
  const [academicYearId] = useState(1); // Hardcoded untuk MVP, bisa diubah nanti dinamis

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', academicYearId],
    queryFn: async () => {
      const response = await api.get(`/students?academic_year_id=${academicYearId}`);
      return response.data.data as Student[];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/students/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    }
  });

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Yakin ingin menonaktifkan/menghapus siswa ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setTimeout(() => setEditingStudent(undefined), 200);
  };

  const filteredStudents = students.filter(s => 
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.parent_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manajemen Siswa</h2>
          <p className="text-muted-foreground mt-1">Kelola data siswa untuk tahun ajaran aktif.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Siswa
        </Button>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center gap-4 bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari nama siswa atau orang tua..." 
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            Total: {filteredStudents.length} Siswa
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px] text-center">No</TableHead>
                <TableHead>Nama Siswa</TableHead>
                <TableHead>Nama Orang Tua</TableHead>
                <TableHead>No. HP (WhatsApp)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Memuat data siswa...
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <AlertTriangle className="w-8 h-8 text-muted-foreground/30 mb-2" />
                      <p>Tidak ada data siswa ditemukan.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student, index) => (
                  <TableRow key={student.id} className="group">
                    <TableCell className="text-center font-medium">{index + 1}</TableCell>
                    <TableCell className="font-semibold">{student.student_name}</TableCell>
                    <TableCell>{student.parent_name}</TableCell>
                    <TableCell>
                      {student.phone ? (
                        <a href={`https://wa.me/${student.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {student.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className={student.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none border-0' : ''}>
                        {student.status === 'active' ? 'Aktif' : 'Non-Aktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEdit(student)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(student.id, student.student_name)}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <StudentForm 
        isOpen={isFormOpen} 
        onClose={closeForm} 
        student={editingStudent} 
        academicYearId={academicYearId}
      />
    </div>
  );
}
