<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\PaymentMonth;
use App\Models\Expense;
use App\Models\Student;
use App\Models\AcademicYear;

class ReportService
{
    public function generateCashReport(int $academicYearId, ?string $startDate, ?string $endDate)
    {
        $query = PaymentMonth::with('student', 'payment')
            ->where('academic_year_id', $academicYearId)
            ->where('payment_type', 'cash');

        if ($startDate && $endDate) {
            $query->whereHas('payment', function($q) use ($startDate, $endDate) {
                $q->whereBetween('payment_date', [$startDate, $endDate]);
            });
        }

        $data = $query->get();
        $total = $data->sum('amount');
        $academicYear = AcademicYear::find($academicYearId);

        $pdf = Pdf::loadView('reports.cash', [
            'data' => $data,
            'total' => $total,
            'academicYear' => $academicYear,
            'startDate' => $startDate,
            'endDate' => $endDate,
        ]);

        return $pdf->download('laporan-kas.pdf');
    }

    // Metode serupa untuk Tabungan, Pengeluaran, dsb. akan diimplementasikan penuh nanti.
}
