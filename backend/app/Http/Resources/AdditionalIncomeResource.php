<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdditionalIncomeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'academic_year_id' => $this->academic_year_id,
            'income_date' => $this->income_date?->format('Y-m-d'),
            'description' => $this->description,
            'amount' => (int) $this->amount,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
