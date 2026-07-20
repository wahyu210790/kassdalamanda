<?php

namespace App\Http\Requests\Expense;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateExpenseRequest extends FormRequest
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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'category_id' => ['required', 'exists:expense_categories,id'],
            'source' => ['required', 'in:cash,saving'],
            'title' => ['required', 'string', 'max:200'],
            'amount' => ['required', 'integer', 'gt:0'],
            'expense_date' => ['required', 'date'],
            'description' => ['nullable', 'string'],
        ];
    }
}
