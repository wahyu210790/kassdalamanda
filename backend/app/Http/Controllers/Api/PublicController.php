<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\AcademicYear;
use Illuminate\Http\Request;

class PublicController extends Controller
{
    public function searchStudent(Request $request)
    {
        $query = $request->query('query');
        
        if (!$query || strlen($query) < 3) {
            return response()->json([
                'message' => 'Masukkan minimal 3 huruf nama siswa.'
            ], 400);
        }

        $activeYear = AcademicYear::where('is_active', true)->first();
        if (!$activeYear) {
            return response()->json([
                'message' => 'Tidak ada tahun ajaran aktif.'
            ], 400);
        }

        $students = Student::where('academic_year_id', $activeYear->id)
            ->where('student_name', 'LIKE', '%' . $query . '%')
            ->where('status', 'active')
            ->with(['paymentMonths'])
            ->get()
            ->map(function ($student) {
                return [
                    'id' => $student->id,
                    'student_name' => $student->student_name,
                    'parent_name' => $student->parent_name,
                    'summary' => [
                        'total_kas_paid' => $student->paymentMonths->where('payment_type', \App\Enums\PaymentType::Cash)->sum('amount'),
                        'total_saving_paid' => $student->paymentMonths->where('payment_type', \App\Enums\PaymentType::Saving)->sum('amount'),
                        'kas_months' => $student->paymentMonths->where('payment_type', \App\Enums\PaymentType::Cash)->pluck('month')->values(),
                        'saving_months' => $student->paymentMonths->where('payment_type', \App\Enums\PaymentType::Saving)->pluck('month')->values(),
                    ]
                ];
            });

        return response()->json([
            'data' => $students
        ]);
    }
}
