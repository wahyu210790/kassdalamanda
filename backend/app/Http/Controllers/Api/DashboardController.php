<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __construct(private DashboardService $service) {}

    public function index(Request $request): JsonResponse
    {
        $academicYearId = $request->query('academic_year_id');
        
        if (!$academicYearId) {
            $activeYear = AcademicYear::active()->first();
            if (!$activeYear) {
                return response()->json(['message' => 'Tahun ajaran aktif tidak ditemukan'], 404);
            }
            $academicYearId = $activeYear->id;
        }

        $summary = $this->service->getSummary((int) $academicYearId);
        $recentExpenses = $this->service->getRecentExpenses((int) $academicYearId);

        return response()->json([
            'data' => array_merge($summary, [
                'recent_expenses' => $recentExpenses
            ])
        ]);
    }
}
