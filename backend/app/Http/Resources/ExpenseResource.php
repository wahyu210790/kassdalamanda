<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use BackedEnum;

class ExpenseResource extends JsonResource
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
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category', fn() => $this->category?->name),
            'title' => $this->title,
            'source' => $this->source instanceof BackedEnum ? $this->source->value : $this->source,
            'amount' => (int) $this->amount,
            'expense_date' => $this->expense_date?->format('Y-m-d'),
            'description' => $this->description,
        ];
    }
}
