<?php

namespace Tests\Feature\TanpaKategoriPengeluaran;

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

class TanpaKategoriPengeluaranTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(): Admin
    {
        return Admin::create([
            'name' => 'Admin Fiktif',
            'email' => 'admin.tanpakategori@contoh.test',
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

    public function test_01_post_pengeluaran_tanpa_kategori_dari_cash_berhasil(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $this->assertEquals(0, ExpenseCategory::count());

        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Aldo Fiktif',
            'parent_name' => 'Wali Aldo Fiktif',
            'phone' => '081200008001',
            'status' => 'active',
        ]);

        // Kas terkumpul 20.000
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

        $res = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'cash',
            'title' => 'Beli Sapu dan Pengki Kelas',
            'amount' => 12000,
            'expense_date' => '2026-07-15',
            'description' => 'Toko depan sekolah',
        ]);

        $res->assertSuccessful();
        $this->assertNull($res->json('data.category_id'));

        $this->assertDatabaseHas('expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => null,
            'source' => 'cash',
            'title' => 'Beli Sapu dan Pengki Kelas',
            'amount' => 12000,
        ]);

        $this->getJson("/api/wallets/summary?academic_year_id={$ay->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.cash.terkumpul', 20000)
            ->assertJsonPath('data.cash.dipakai', 12000)
            ->assertJsonPath('data.cash.sisa', 8000);
    }

    public function test_02_post_pengeluaran_tanpa_kategori_dari_saving_berhasil(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $this->assertEquals(0, ExpenseCategory::count());

        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Bunga Fiktif',
            'parent_name' => 'Wali Bunga Fiktif',
            'phone' => '081200008002',
            'status' => 'active',
        ]);

        // Kas 10.000, Tabungan 10.000 (2 bulan)
        app(PaymentService::class)->createPayment([
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-10',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
                ['month' => 7, 'year' => 2026, 'payment_type' => 'saving'],
                ['month' => 8, 'year' => 2026, 'payment_type' => 'saving'],
            ],
        ], $admin->id);

        Sanctum::actingAs($admin);

        $res = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'saving',
            'title' => 'Penarikan Tabungan Kegiatan',
            'amount' => 6000,
            'expense_date' => '2026-08-12',
        ]);

        $res->assertSuccessful();
        $this->assertNull($res->json('data.category_id'));

        $this->getJson("/api/wallets/summary?academic_year_id={$ay->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.saving.terkumpul', 10000)
            ->assertJsonPath('data.saving.dipakai', 6000)
            ->assertJsonPath('data.saving.sisa', 4000)
            ->assertJsonPath('data.cash.sisa', 10000);
    }

    public function test_03_post_pengeluaran_tanpa_kategori_dari_additional_income_berhasil(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $this->assertEquals(0, ExpenseCategory::count());

        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Caca Fiktif',
            'parent_name' => 'Wali Caca Fiktif',
            'phone' => '081200008003',
            'status' => 'active',
        ]);

        app(PaymentService::class)->createPayment([
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-10',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
                ['month' => 7, 'year' => 2026, 'payment_type' => 'saving'],
            ],
        ], $admin->id);

        Sanctum::actingAs($admin);

        // Tambah pemasukan tambahan fiktif 50.000
        $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Sumbangan Buku Fiktif',
            'amount' => 50000,
        ])->assertSuccessful();

        $res = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'additional_income',
            'title' => 'Beli Rak Buku Pojok Baca',
            'amount' => 35000,
            'expense_date' => '2026-08-05',
        ]);

        $res->assertSuccessful();
        $this->assertNull($res->json('data.category_id'));

        $this->getJson("/api/wallets/summary?academic_year_id={$ay->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.additional_income.terkumpul', 50000)
            ->assertJsonPath('data.additional_income.dipakai', 35000)
            ->assertJsonPath('data.additional_income.sisa', 15000)
            ->assertJsonPath('data.cash.sisa', 10000)
            ->assertJsonPath('data.saving.sisa', 5000);
    }

    public function test_04_aturan_batas_sisa_dompet_tetap_berlaku_tanpa_kategori(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        Sanctum::actingAs($admin);

        $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Dana Awal Fiktif',
            'amount' => 10000,
        ])->assertSuccessful();

        $res = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'additional_income',
            'title' => 'Pengeluaran Melebihi Sisa',
            'amount' => 15000,
            'expense_date' => '2026-08-02',
        ]);

        $res->assertStatus(422)
            ->assertJsonPath('message', 'Nominal melebihi Sisa.');

        $this->assertDatabaseCount('expenses', 0);
    }

    public function test_05_post_tanpa_title_ditolak_422_dengan_pesan_memuat_keterangan(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();

        Sanctum::actingAs($admin);

        $res = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'cash',
            'title' => '',
            'amount' => 5000,
            'expense_date' => '2026-08-02',
        ]);

        $res->assertStatus(422);
        $titleError = $res->json('errors.title.0');
        $this->assertNotNull($titleError);
        $this->assertStringContainsString('Keterangan', $titleError);
    }

    public function test_06_endpoint_daftar_dashboard_dan_publik_aman_untuk_pengeluaran_tanpa_kategori(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();

        Sanctum::actingAs($admin);

        $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Dana Kelas Fiktif',
            'amount' => 40000,
        ])->assertSuccessful();

        $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'additional_income',
            'title' => 'Beli Kapur Tulis',
            'amount' => 15000,
            'expense_date' => '2026-08-10',
        ])->assertSuccessful();

        // 1) GET /api/expenses
        $listRes = $this->getJson("/api/expenses?academic_year_id={$ay->id}");
        $listRes->assertStatus(200)
            ->assertJsonPath('data.0.title', 'Beli Kapur Tulis')
            ->assertJsonPath('data.0.source', 'additional_income')
            ->assertJsonPath('data.0.expense_date', '2026-08-10')
            ->assertJsonPath('data.0.amount', 15000)
            ->assertJsonPath('data.0.category', null);

        // 2) GET /api/dashboard (recent_expenses)
        $dashRes = $this->getJson("/api/dashboard?academic_year_id={$ay->id}");
        $dashRes->assertStatus(200)
            ->assertJsonPath('data.recent_expenses.0.title', 'Beli Kapur Tulis')
            ->assertJsonPath('data.recent_expenses.0.source', 'additional_income')
            ->assertJsonPath('data.recent_expenses.0.expense_date', '2026-08-10')
            ->assertJsonPath('data.recent_expenses.0.amount', 15000)
            ->assertJsonPath('data.recent_expenses.0.category', null);

        // 3) GET /api/public/dashboard/summary
        $pubRes = $this->getJson('/api/public/dashboard/summary');
        $pubRes->assertStatus(200)
            ->assertJsonPath('data.expenses.total', 15000)
            ->assertJsonPath('data.expenses.items.0.title', 'Beli Kapur Tulis')
            ->assertJsonPath('data.expenses.items.0.source', 'additional_income')
            ->assertJsonPath('data.expenses.items.0.expense_date', '2026-08-10')
            ->assertJsonPath('data.expenses.items.0.amount', 15000);
    }

    public function test_07_put_ubah_pengeluaran_tanpa_category_id_berhasil_dan_patuh_aturan_sisa(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Dino Fiktif',
            'parent_name' => 'Wali Dino Fiktif',
            'phone' => '081200008007',
            'status' => 'active',
        ]);

        // Kas 10.000
        app(PaymentService::class)->createPayment([
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-10',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
            ],
        ], $admin->id);

        Sanctum::actingAs($admin);

        // Pemasukan tambahan 30.000
        $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Dana Kegiatan Fiktif',
            'amount' => 30000,
        ])->assertSuccessful();

        $createRes = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'cash',
            'title' => 'Beli Spidol Hitam',
            'amount' => 8000,
            'expense_date' => '2026-08-03',
        ]);
        $createRes->assertSuccessful();
        $expenseId = $createRes->json('data.id');

        // Ubah tanpa mengirim category_id, pindah dompet ke additional_income & ubah title/amount
        $updRes = $this->putJson("/api/expenses/{$expenseId}", [
            'source' => 'additional_income',
            'title' => 'Beli Spidol Hitam dan Biru',
            'amount' => 18000,
            'expense_date' => '2026-08-04',
        ]);
        $updRes->assertStatus(200)
            ->assertJsonPath('data.title', 'Beli Spidol Hitam dan Biru')
            ->assertJsonPath('data.source', 'additional_income')
            ->assertJsonPath('data.amount', 18000)
            ->assertJsonPath('data.category_id', null);

        $this->getJson("/api/wallets/summary?academic_year_id={$ay->id}")
            ->assertJsonPath('data.cash.sisa', 10000)
            ->assertJsonPath('data.additional_income.sisa', 12000);

        // Ubah melebihi sisa (35.000 > 30.000) -> 422 "Nominal melebihi Sisa."
        $this->putJson("/api/expenses/{$expenseId}", [
            'source' => 'additional_income',
            'title' => 'Beli Papan Tulis Baru',
            'amount' => 35000,
            'expense_date' => '2026-08-04',
        ])->assertStatus(422)
          ->assertJsonPath('message', 'Nominal melebihi Sisa.');
    }
}
