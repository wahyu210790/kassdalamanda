<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentDetailResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'academic_year_id' => $this->academic_year_id,
            'student_name' => $this->student_name,
            'parent_name' => $this->parent_name,
            'phone' => $this->phone,
            'status' => $this->status,
            'summary' => $this->when(isset($this->summary), $this->summary),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'settings' => [
                'monthly_cash_amount' => (int) \App\Models\Setting::get('monthly_cash_amount', 10000),
                'monthly_saving_amount' => (int) \App\Models\Setting::get('monthly_saving_amount', 5000),
            ],
        ];
    }
}
