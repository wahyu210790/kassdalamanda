<?php

namespace App\Http\Requests\Payment;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'student_id' => ['required', 'exists:students,id'],
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'payment_date' => ['required', 'date'],
            'note' => ['nullable', 'string'],
            'months' => ['required', 'array', 'min:1'],
            'months.*.month' => ['required', 'integer', 'between:1,12'],
            'months.*.year' => ['required', 'integer'],
            'months.*.payment_type' => ['required', 'in:cash,saving'],
        ];
    }
}
