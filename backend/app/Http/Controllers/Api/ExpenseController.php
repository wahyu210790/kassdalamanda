<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Services\ExpenseService;
use App\Http\Requests\Expense\StoreExpenseRequest;
use App\Http\Resources\ExpenseResource;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function __construct(private ExpenseService $service) {}

    public function index(Request $request)
    {
        $expenses = Expense::with(['category', 'admin'])
            ->where('academic_year_id', $request->query('academic_year_id'))
            ->when($request->query('source'), fn($q, $s) => $q->where('source', $s))
            ->orderByDesc('expense_date')
            ->orderByDesc('id')
            ->paginate(20);
            
        return ExpenseResource::collection($expenses);
    }

    public function store(StoreExpenseRequest $request)
    {
        $expense = $this->service->createExpense(
            $request->validated(), 
            $request->user()->id
        );
        
        return new ExpenseResource($expense->load('category'));
    }

    public function destroy(Request $request, Expense $expense)
    {
        $this->service->deleteExpense($expense, $request->user()->id);
        return response()->json(['message' => 'Pengeluaran berhasil dibatalkan']);
    }
}
