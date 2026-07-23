<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\AcademicYearController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\ReportController;

use App\Http\Controllers\Api\PublicController;

Route::post('/login', [AuthController::class, 'login']);

Route::prefix('public')->group(function () {
    Route::get('/dashboard/summary', [PublicController::class, 'getSummary']);
    Route::get('/students/search', [PublicController::class, 'searchStudent']);
});

Route::get('/test-payment', function() {
    $data = [
        'student_id' => \App\Models\Student::first()->id ?? 1,
        'academic_year_id' => 1,
        'payment_date' => '2026-07-23',
        'months' => [
            ['month' => 7, 'year' => 2026, 'payment_type' => 'cash']
        ]
    ];
    try {
        app(\App\Services\PaymentService::class)->createPayment($data, 1);
        return response()->json(['message' => 'Success']);
    } catch (\Exception $e) {
        return response()->json([
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ], 500);
    }
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Academic Years
    Route::get('/academic-years/active', [AcademicYearController::class, 'active']);
    Route::post('/academic-years/{academic_year}/activate', [AcademicYearController::class, 'activate']);
    Route::apiResource('academic-years', AcademicYearController::class)->only(['index', 'store']);

    // Students
    Route::apiResource('students', StudentController::class);

    // Payments
    Route::apiResource('payments', PaymentController::class)->only(['index', 'store', 'show', 'destroy']);

    // Expenses & Categories
    Route::get('/expense-categories', [ExpenseCategoryController::class, 'index']);
    Route::apiResource('expenses', ExpenseController::class)->only(['index', 'store', 'destroy']);

    // Settings
    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update']);

    // Reports
    Route::get('/reports/cash', [ReportController::class, 'cashReport']);
});
