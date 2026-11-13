<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdditionalIncome\StoreAdditionalIncomeRequest;
use App\Http\Requests\AdditionalIncome\UpdateAdditionalIncomeRequest;
use App\Http\Resources\AdditionalIncomeResource;
use App\Models\AcademicYear;
use App\Models\AdditionalIncome;
use App\Services\AdditionalIncomeService;
use App\Services\ExpenseService;
use Illuminate\Http\Request;

class AdditionalIncomeController extends Controller
{
    public function __construct(
        private AdditionalIncomeService $service,
        private ExpenseService $expenseService
    ) {}

    public function index(Request $request)
    {
        $academicYearId = $request->query('academic_year_id')
            ?? AcademicYear::where('is_active', true)->value('id');

        $incomes = AdditionalIncome::where('academic_year_id', $academicYearId)
            ->orderByDesc('income_date')
            ->orderByDesc('id')
            ->paginate(20);

        return AdditionalIncomeResource::collection($incomes);
    }

    public function store(StoreAdditionalIncomeRequest $request)
    {
        $income = $this->service->create(
            $request->validated(),
            $request->user()->id
        );

        return new AdditionalIncomeResource($income);
    }

    public function show(AdditionalIncome $additional_income)
    {
        return new AdditionalIncomeResource($additional_income);
    }

    public function update(UpdateAdditionalIncomeRequest $request, AdditionalIncome $additional_income)
    {
        $updated = $this->service->update(
            $additional_income,
            $request->validated(),
            $request->user()->id
        );

        return new AdditionalIncomeResource($updated);
    }

    public function destroy(Request $request, AdditionalIncome $additional_income)
    {
        $this->service->delete($additional_income, $request->user()->id);

        return response()->json(['message' => 'Pemasukan tambahan berhasil dihapus']);
    }

    public function walletsSummary(Request $request)
    {
        $academicYearId = $request->query('academic_year_id')
            ?? AcademicYear::where('is_active', true)->value('id');

        if (!$academicYearId) {
            return response()->json([
                'data' => [
                    'cash' => ['terkumpul' => 0, 'dipakai' => 0, 'sisa' => 0],
                    'saving' => ['terkumpul' => 0, 'dipakai' => 0, 'sisa' => 0],
                    'additional_income' => ['terkumpul' => 0, 'dipakai' => 0, 'sisa' => 0],
                ],
            ]);
        }

        return response()->json([
            'data' => $this->expenseService->getWalletsSummary((int) $academicYearId),
        ]);
    }
}
