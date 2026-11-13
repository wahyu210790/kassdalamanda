<?php

namespace Tests\Feature\PemasukanTambahan;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use App\Models\Admin;
use App\Models\AcademicYear;
use App\Models\Student;
use App\Models\ExpenseCategory;
use App\Models\Setting;
use App\Services\PaymentService;

class PemasukanTambahanTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(): Admin
    {
        return Admin::create([
            'name' => 'Admin Tes',
            'email' => 'admin.fitur01@contoh.test',
            'password' => Hash::make('password-tes-123'),
        ]);
    }

    private function createAcademicYear(): AcademicYear
    {
        return AcademicYear::create([
            'name' => '2026/2027',
            'start_date' => '2026-07-01',
            'end_date' => '2027-06-30',
            'is_active' => true,
        ]);
    }

    private function initSettings(): void
    {
        Setting::set('monthly_cash_amount', 10000);
        Setting::set('monthly_saving_amount', 5000);
    }

    public function test_01_tambah_pemasukan_tambahan_tidak_menambah_saldo_kas(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Siswa Satu',
            'parent_name' => 'Wali Satu',
            'phone' => '081200001001',
            'status' => 'active',
        ]);

        // Bayar kas 2 bulan = 20.000
        app(PaymentService::class)->createPayment([
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-10',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
                ['month' => 8, 'year' => 2026, 'payment_type' => 'cash'],
            ],
        ], $admin->id);

        Sanctum::actingAs($admin);

        // Tambah pemasukan tambahan 75.000
        $res = $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Donasi Buku Kelas',
            'amount' => 75000,
        ]);
        $res->assertStatus(201);

        // Cek ringkasan dompet admin
        $walletsRes = $this->getJson("/api/wallets/summary?academic_year_id={$ay->id}");
        $walletsRes->assertStatus(200);
        $walletsRes->assertJsonPath('data.additional_income.terkumpul', 75000);
        $walletsRes->assertJsonPath('data.additional_income.dipakai', 0);
        $walletsRes->assertJsonPath('data.additional_income.sisa', 75000);
        $walletsRes->assertJsonPath('data.cash.terkumpul', 20000);
        $walletsRes->assertJsonPath('data.cash.sisa', 20000);

        // Cek dashboard admin & publik: cash_balance tetap 20.000
        $dashRes = $this->getJson("/api/dashboard?academic_year_id={$ay->id}");
        $dashRes->assertStatus(200);
        $dashRes->assertJsonPath('data.cash_balance', 20000);

        $pubRes = $this->getJson('/api/public/dashboard/summary');
        $pubRes->assertStatus(200);
        $pubRes->assertJsonPath('data.cash.sisa', 20000);
        $pubRes->assertJsonPath('data.cash_balance', 20000);
        $pubRes->assertJsonPath('data.additional_income.terkumpul', 75000);
        $pubRes->assertJsonPath('data.additional_income.sisa', 75000);
    }

    public function test_02_ringkasan_publik_mengembalikan_null_jika_pemasukan_tambahan_kosong(): void
    {
        $this->createAcademicYear();

        $res = $this->getJson('/api/public/dashboard/summary');
        $res->assertStatus(200);
        $this->assertNull($res->json('data.additional_income'));
    }

    public function test_03_ringkasan_publik_menampilkan_rincian_pemasukan_tambahan_jika_ada(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();

        Sanctum::actingAs($admin);

        $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-14',
            'description' => 'Sumbangan Kegiatan Kelas',
            'amount' => 120000,
        ])->assertStatus(201);

        $res = $this->getJson('/api/public/dashboard/summary');
        $res->assertStatus(200);
        $res->assertJsonPath('data.additional_income.terkumpul', 120000);
        $res->assertJsonPath('data.additional_income.dipakai', 0);
        $res->assertJsonPath('data.additional_income.sisa', 120000);
        $res->assertJsonPath('data.additional_income.items.0.description', 'Sumbangan Kegiatan Kelas');
        $res->assertJsonPath('data.additional_income.items.0.amount', 120000);
        $res->assertJsonPath('data.additional_income.items.0.income_date', '2026-08-14');
    }

    public function test_04_simpan_pengeluaran_dari_additional_income_mengurangi_sisa_pos_tersebut_saja(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Siswa Dua',
            'parent_name' => 'Wali Dua',
            'phone' => '081200001002',
            'status' => 'active',
        ]);

        // Isi kas 10.000 dan tabungan 5.000
        app(PaymentService::class)->createPayment([
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-10',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
                ['month' => 7, 'year' => 2026, 'payment_type' => 'saving'],
            ],
        ], $admin->id);

        $category = ExpenseCategory::create(['name' => 'Perlengkapan']);

        Sanctum::actingAs($admin);

        // Isi pemasukan tambahan 50.000
        $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Dana Bazar',
            'amount' => 50000,
        ])->assertStatus(201);

        // Simpan pengeluaran 30.000 dari additional_income
        $expRes = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'additional_income',
            'title' => 'Beli Taplak Meja',
            'amount' => 30000,
            'expense_date' => '2026-08-05',
        ]);
        $expRes->assertStatus(201);

        $pubRes = $this->getJson('/api/public/dashboard/summary');
        $pubRes->assertStatus(200);
        $pubRes->assertJsonPath('data.additional_income.terkumpul', 50000);
        $pubRes->assertJsonPath('data.additional_income.dipakai', 30000);
        $pubRes->assertJsonPath('data.additional_income.sisa', 20000);
        $pubRes->assertJsonPath('data.cash.sisa', 10000);
        $pubRes->assertJsonPath('data.saving.sisa', 5000);
        $pubRes->assertJsonPath('data.expenses.total', 30000);
    }

    public function test_05_simpan_pengeluaran_melebihi_sisa_ditolak_422_di_semua_dompet(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Siswa Tiga',
            'parent_name' => 'Wali Tiga',
            'phone' => '081200001003',
            'status' => 'active',
        ]);

        // Kas = 10.000, Tabungan = 5.000
        app(PaymentService::class)->createPayment([
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-10',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
                ['month' => 7, 'year' => 2026, 'payment_type' => 'saving'],
            ],
        ], $admin->id);

        $category = ExpenseCategory::create(['name' => 'Kegiatan']);

        Sanctum::actingAs($admin);

        // Pemasukan tambahan = 15.000
        $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Sisa Lomba',
            'amount' => 15000,
        ])->assertStatus(201);

        // 1) Melebihi sisa cash (15.000 > 10.000) -> 422
        $resCash = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'cash',
            'title' => 'Pengeluaran Kas Lebih',
            'amount' => 15000,
            'expense_date' => '2026-08-02',
        ]);
        $resCash->assertStatus(422);
        $resCash->assertJsonPath('message', 'Nominal melebihi Sisa.');

        // 2) Melebihi sisa saving (6.000 > 5.000) -> 422
        $resSaving = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'saving',
            'title' => 'Pengeluaran Tabungan Lebih',
            'amount' => 6000,
            'expense_date' => '2026-08-02',
        ]);
        $resSaving->assertStatus(422);
        $resSaving->assertJsonPath('message', 'Nominal melebihi Sisa.');

        // 3) Melebihi sisa additional_income (20.000 > 15.000) -> 422
        $resAdd = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'additional_income',
            'title' => 'Pengeluaran Tambahan Lebih',
            'amount' => 20000,
            'expense_date' => '2026-08-02',
        ]);
        $resAdd->assertStatus(422);
        $resAdd->assertJsonPath('message', 'Nominal melebihi Sisa.');
    }

    public function test_06_ubah_pengeluaran_hitung_ulang_saldo_dan_validasi_batas_dompet(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Siswa Empat',
            'parent_name' => 'Wali Empat',
            'phone' => '081200001004',
            'status' => 'active',
        ]);

        // Kas = 20.000
        app(PaymentService::class)->createPayment([
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-10',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
                ['month' => 8, 'year' => 2026, 'payment_type' => 'cash'],
            ],
        ], $admin->id);

        $category = ExpenseCategory::create(['name' => 'Kebersihan']);

        Sanctum::actingAs($admin);

        // Pemasukan tambahan = 25.000
        $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Donasi Wali Murid',
            'amount' => 25000,
        ])->assertStatus(201);

        // Buat pengeluaran awal dari cash sebesar 15.000 (sisa cash jadi 5.000)
        $createRes = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'cash',
            'title' => 'Beli Sapu',
            'amount' => 15000,
            'expense_date' => '2026-08-03',
        ]);
        $createRes->assertStatus(201);
        $expenseId = $createRes->json('data.id');

        // a) Ubah di dompet yang sama (cash) menjadi 18.000 (<= sisa_sekarang 5.000 + nominal_lama 15.000 = 20.000) -> berhasil
        $updateSameRes = $this->putJson("/api/expenses/{$expenseId}", [
            'category_id' => $category->id,
            'source' => 'cash',
            'title' => 'Beli Sapu & Pengki',
            'amount' => 18000,
            'expense_date' => '2026-08-03',
        ]);
        $updateSameRes->assertStatus(200);

        $walletsAfterSame = $this->getJson("/api/wallets/summary?academic_year_id={$ay->id}");
        $walletsAfterSame->assertJsonPath('data.cash.sisa', 2000);

        // b) Pindah dompet dari cash ke additional_income sebesar 20.000 -> sisa cash kembali 20.000, sisa additional_income jadi 5.000
        $updateMoveRes = $this->putJson("/api/expenses/{$expenseId}", [
            'category_id' => $category->id,
            'source' => 'additional_income',
            'title' => 'Beli Sapu & Pengki',
            'amount' => 20000,
            'expense_date' => '2026-08-03',
        ]);
        $updateMoveRes->assertStatus(200);

        $walletsAfterMove = $this->getJson("/api/wallets/summary?academic_year_id={$ay->id}");
        $walletsAfterMove->assertJsonPath('data.cash.sisa', 20000);
        $walletsAfterMove->assertJsonPath('data.additional_income.dipakai', 20000);
        $walletsAfterMove->assertJsonPath('data.additional_income.sisa', 5000);

        // c) Ubah melebihi sisa dompet tujuan (pindah balik ke cash dengan 25.000 > 20.000) -> 422
        $updateOverRes = $this->putJson("/api/expenses/{$expenseId}", [
            'category_id' => $category->id,
            'source' => 'cash',
            'title' => 'Beli Lemari Kecil',
            'amount' => 25000,
            'expense_date' => '2026-08-03',
        ]);
        $updateOverRes->assertStatus(422);
        $updateOverRes->assertJsonPath('message', 'Nominal melebihi Sisa.');
    }

    public function test_07_hapus_pengeluaran_dari_additional_income_mengembalikan_sisa(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $category = ExpenseCategory::create(['name' => 'Konsumsi']);

        Sanctum::actingAs($admin);

        $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Kas Sosial',
            'amount' => 40000,
        ])->assertStatus(201);

        $expRes = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'additional_income',
            'title' => 'Air Mineral Kelas',
            'amount' => 15000,
            'expense_date' => '2026-08-05',
        ]);
        $expRes->assertStatus(201);
        $expenseId = $expRes->json('data.id');

        $this->getJson("/api/wallets/summary?academic_year_id={$ay->id}")
            ->assertJsonPath('data.additional_income.sisa', 25000);

        $this->deleteJson("/api/expenses/{$expenseId}")
            ->assertStatus(200);

        $this->getJson("/api/wallets/summary?academic_year_id={$ay->id}")
            ->assertJsonPath('data.additional_income.dipakai', 0)
            ->assertJsonPath('data.additional_income.sisa', 40000);
    }

    public function test_08_dan_09_hapus_atau_ubah_pemasukan_tambahan_dibawah_sudah_dipakai_ditolak_422(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $category = ExpenseCategory::create(['name' => 'Perlengkapan']);

        Sanctum::actingAs($admin);

        $incRes = $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Donasi Awal',
            'amount' => 50000,
        ]);
        $incRes->assertStatus(201);
        $incomeId = $incRes->json('data.id');

        // Pakai 30.000 dari pemasukan tambahan
        $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'additional_income',
            'title' => 'Beli Jam Dinding',
            'amount' => 30000,
            'expense_date' => '2026-08-04',
        ])->assertStatus(201);

        // 8) Hapus pemasukan tambahan saat sudah dipakai 30.000 (terkumpul baru 0 < 30.000) -> 422 "Sisa tidak cukup."
        $delRes = $this->deleteJson("/api/additional-incomes/{$incomeId}");
        $delRes->assertStatus(422);
        $delRes->assertJsonPath('message', 'Sisa tidak cukup.');

        // 9) Ubah pemasukan tambahan menjadi 20.000 (< 30.000 sudah dipakai) -> 422 "Sisa tidak cukup."
        $updFailRes = $this->putJson("/api/additional-incomes/{$incomeId}", [
            'income_date' => '2026-08-01',
            'description' => 'Donasi Awal Revisi Kecil',
            'amount' => 20000,
        ]);
        $updFailRes->assertStatus(422);
        $updFailRes->assertJsonPath('message', 'Sisa tidak cukup.');

        // Ubah menjadi 35.000 (>= 30.000 sudah dipakai) -> 200 berhasil
        $updOkRes = $this->putJson("/api/additional-incomes/{$incomeId}", [
            'income_date' => '2026-08-01',
            'description' => 'Donasi Awal Revisi Cukup',
            'amount' => 35000,
        ]);
        $updOkRes->assertStatus(200);
        $this->getJson("/api/wallets/summary?academic_year_id={$ay->id}")
            ->assertJsonPath('data.additional_income.terkumpul', 35000)
            ->assertJsonPath('data.additional_income.dipakai', 30000)
            ->assertJsonPath('data.additional_income.sisa', 5000);
    }
}
