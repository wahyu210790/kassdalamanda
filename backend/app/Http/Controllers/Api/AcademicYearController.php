<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Services\AcademicYearService;
use App\Http\Requests\AcademicYear\StoreAcademicYearRequest;
use App\Http\Resources\AcademicYearResource;
use Illuminate\Http\Request;

class AcademicYearController extends Controller
{
    public function __construct(private AcademicYearService $service) {}

    public function index()
    {
        $years = AcademicYear::orderByDesc('start_date')->get();
        return AcademicYearResource::collection($years);
    }

    public function active()
    {
        $year = AcademicYear::active()->first();
        if (!$year) {
            return response()->json(['message' => 'Tidak ada tahun ajaran aktif'], 404);
        }
        return new AcademicYearResource($year);
    }

    public function store(StoreAcademicYearRequest $request)
    {
        $year = AcademicYear::create($request->validated());
        return new AcademicYearResource($year);
    }

    public function activate(AcademicYear $academicYear)
    {
        $year = $this->service->activate($academicYear);
        return new AcademicYearResource($year);
    }
}
