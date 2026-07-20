<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DashboardResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'cash_balance' => $this->resource['cash_balance'] ?? 0,
            'saving_balance' => $this->resource['saving_balance'] ?? 0,
            'student_count' => $this->resource['student_count'] ?? 0,
            'cash_income' => $this->resource['cash_income'] ?? 0,
            'saving_income' => $this->resource['saving_income'] ?? 0,
            'cash_expense' => $this->resource['cash_expense'] ?? 0,
            'saving_expense' => $this->resource['saving_expense'] ?? 0,
            'payment_progress' => $this->resource['payment_progress'] ?? 0,
            'today_cash' => $this->resource['today_cash'] ?? 0,
            'today_saving' => $this->resource['today_saving'] ?? 0,
            'unpaid_count' => $this->resource['unpaid_count'] ?? 0,
        ];
    }
}
