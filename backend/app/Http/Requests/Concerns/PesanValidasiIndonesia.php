<?php

namespace App\Http\Requests\Concerns;

trait PesanValidasiIndonesia
{
    protected function pesanDasarIndonesia(): array
    {
        return [
            'required' => ':attribute wajib diisi.',
            'integer' => ':attribute harus berupa bilangan bulat.',
            'numeric' => ':attribute harus berupa angka.',
            'gt' => ':attribute harus lebih dari :value.',
            'gt.numeric' => ':attribute harus lebih dari :value.',
            'min' => ':attribute minimal :min.',
            'min.numeric' => ':attribute minimal :min.',
            'min.string' => ':attribute minimal :min karakter.',
            'min.array' => ':attribute minimal :min pilihan.',
            'max' => ':attribute maksimal :max.',
            'max.numeric' => ':attribute maksimal :max.',
            'max.string' => ':attribute maksimal :max karakter.',
            'date' => ':attribute harus berupa tanggal yang sah.',
            'exists' => ':attribute tidak ditemukan.',
            'in' => ':attribute tidak valid.',
            'string' => ':attribute harus berupa teks.',
            'email' => 'Format :attribute tidak valid.',
            'array' => ':attribute harus berupa daftar.',
            'between' => ':attribute harus antara :min sampai :max.',
            'between.numeric' => ':attribute harus antara :min sampai :max.',
            'after' => ':attribute harus setelah :date.',
            'amount.gt' => 'Nominal harus lebih dari 0.',
            'amount.max' => 'Nominal maksimal Rp 1.000.000.000.',
            'category_id.exists' => 'Kategori tidak ditemukan.',
            'source.required' => 'Diambil dari wajib dipilih.',
            'source.in' => 'Diambil dari tidak valid.',
        ];
    }

    public function messages(): array
    {
        return $this->pesanDasarIndonesia();
    }

    protected function atributDasarIndonesia(): array
    {
        return [
            'amount' => 'Nominal',
            'description' => 'Keterangan',
            'academic_year_id' => 'Tahun ajaran',
            'income_date' => 'Tanggal',
            'expense_date' => 'Tanggal',
            'payment_date' => 'Tanggal',
            'start_date' => 'Tanggal mulai',
            'end_date' => 'Tanggal selesai',
            'title' => 'Judul',
            'category_id' => 'Kategori',
            'source' => 'Diambil dari',
            'student_id' => 'Siswa',
            'months' => 'Bulan',
            'months.*.month' => 'Bulan',
            'months.*.year' => 'Tahun',
            'months.*.payment_type' => 'Jenis pembayaran',
            'email' => 'Email',
            'password' => 'Kata sandi',
            'student_name' => 'Nama siswa',
            'parent_name' => 'Nama wali',
            'phone' => 'Telepon',
            'name' => 'Nama',
            'status' => 'Status',
            'monthly_cash_amount' => 'Nominal kas bulanan',
            'monthly_saving_amount' => 'Nominal tabungan bulanan',
        ];
    }

    public function attributes(): array
    {
        return $this->atributDasarIndonesia();
    }
}
