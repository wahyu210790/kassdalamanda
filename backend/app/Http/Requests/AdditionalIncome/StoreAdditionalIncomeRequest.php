<?php

namespace App\Http\Requests\AdditionalIncome;

use App\Http\Requests\Concerns\PesanValidasiIndonesia;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreAdditionalIncomeRequest extends FormRequest
{
    use PesanValidasiIndonesia;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'income_date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'integer', 'gt:0', 'max:1000000000'],
        ];
    }
}
