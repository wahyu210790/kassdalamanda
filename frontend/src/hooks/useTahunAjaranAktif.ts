import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface AcademicYearActive {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export function useTahunAjaranAktif() {
  return useQuery<AcademicYearActive, any>({
    queryKey: ['tahun-ajaran-aktif'],
    queryFn: async () => {
      const response = await api.get('/academic-years/active');
      return response.data.data;
    },
    retry: 1,
  });
}
