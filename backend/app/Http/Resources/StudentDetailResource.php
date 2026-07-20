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
        ];
    }
}
