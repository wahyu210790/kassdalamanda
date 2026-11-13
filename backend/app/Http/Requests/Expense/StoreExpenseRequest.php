<?php

namespace App\Http\Requests\Expense;

use App\Http\Requests\Concerns\PesanValidasiIndonesia;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreExpenseRequest extends FormRequest
{
    use PesanValidasiIndonesia;

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
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'category_id' => ['nullable', 'exists:expense_categories,id'],
            'source' => ['required', 'in:cash,saving,additional_income'],
            'title' => ['required', 'string', 'max:200'],
            'amount' => ['required', 'integer', 'gt:0', 'max:1000000000'],
            'expense_date' => ['required', 'date'],
            'description' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return array_merge($this->pesanDasarIndonesia(), [
            'title.required' => 'Keterangan wajib diisi.',
            'category_id.exists' => 'Kategori tidak ditemukan.',
            'source.required' => 'Diambil dari wajib dipilih.',
            'source.in' => 'Diambil dari tidak valid.',
            'amount.gt' => 'Nominal harus lebih dari 0.',
            'amount.max' => 'Nominal maksimal Rp 1.000.000.000.',
        ]);
    }

    public function attributes(): array
    {
        return array_merge($this->atributDasarIndonesia(), [
            'title' => 'Keterangan',
        ]);
    }
}
