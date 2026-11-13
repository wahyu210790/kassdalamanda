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

    public function test_08_aturan_panjang_keterangan_min_3_max_200_pada_post_dan_put(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        Sanctum::actingAs($admin);

        // Siapkan saldo pemasukan tambahan fiktif 100.000
        $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Dana Operasional Fiktif',
            'amount' => 100000,
        ])->assertSuccessful();

        // 1) POST dengan title "ab" (2 karakter) -> 422 "Keterangan minimal 3 karakter."
        $res2Char = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'additional_income',
            'title' => 'ab',
            'amount' => 5000,
            'expense_date' => '2026-08-02',
        ]);
        $res2Char->assertStatus(422)
            ->assertJsonPath('errors.title.0', 'Keterangan minimal 3 karakter.');
        $this->assertDatabaseCount('expenses', 0);

        // 2) POST dengan title 1 karakter -> 422 "Keterangan minimal 3 karakter."
        $res1Char = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'additional_income',
            'title' => 'a',
            'amount' => 5000,
            'expense_date' => '2026-08-02',
        ]);
        $res1Char->assertStatus(422)
            ->assertJsonPath('errors.title.0', 'Keterangan minimal 3 karakter.');
        $this->assertDatabaseCount('expenses', 0);

        // 3) POST dengan title tepat 3 karakter -> sukses, tersimpan
        $res3Char = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'additional_income',
            'title' => 'Pel',
            'amount' => 5000,
            'expense_date' => '2026-08-02',
        ]);
        $res3Char->assertSuccessful();
        $expenseId = $res3Char->json('data.id');
        $this->assertDatabaseHas('expenses', [
            'id' => $expenseId,
            'title' => 'Pel',
        ]);

        // 4) POST dengan title 201 karakter -> 422 "Keterangan maksimal 200 karakter."
        $title201 = str_repeat('K', 201);
        $res201Char = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'additional_income',
            'title' => $title201,
            'amount' => 5000,
            'expense_date' => '2026-08-03',
        ]);
        $res201Char->assertStatus(422)
            ->assertJsonPath('errors.title.0', 'Keterangan maksimal 200 karakter.');
        $this->assertDatabaseCount('expenses', 1);

        // 5) POST dengan title tepat 200 karakter -> sukses
        $title200 = str_repeat('M', 200);
        $res200Char = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'additional_income',
            'title' => $title200,
            'amount' => 5000,
            'expense_date' => '2026-08-03',
        ]);
        $res200Char->assertSuccessful()
            ->assertJsonPath('data.title', $title200);
        $this->assertDatabaseCount('expenses', 2);

        // 6) PUT ubah pengeluaran: title "ab" ditolak 422 pesan min; title 201 ditolak 422 pesan max
        $this->putJson("/api/expenses/{$expenseId}", [
            'source' => 'additional_income',
            'title' => 'ab',
            'amount' => 5000,
            'expense_date' => '2026-08-02',
        ])->assertStatus(422)
          ->assertJsonPath('errors.title.0', 'Keterangan minimal 3 karakter.');

        $this->putJson("/api/expenses/{$expenseId}", [
            'source' => 'additional_income',
            'title' => $title201,
            'amount' => 5000,
            'expense_date' => '2026-08-02',
        ])->assertStatus(422)
          ->assertJsonPath('errors.title.0', 'Keterangan maksimal 200 karakter.');
    }

    public function test_09_down_migrasi_category_id_melempar_exception_jika_masih_ada_null(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();

        Sanctum::actingAs($admin);

        $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Dana Tes Migrasi Fiktif',
            'amount' => 30000,
        ])->assertSuccessful();

        $createRes = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'additional_income',
            'title' => 'Beli Penghapus Papan',
            'amount' => 10000,
            'expense_date' => '2026-08-02',
        ]);
        $createRes->assertSuccessful();
        $expenseId = $createRes->json('data.id');

        $migration = require base_path('database/migrations/2026_11_13_000002_make_expenses_category_id_nullable.php');

        // 7) Panggil down() saat masih ada category_id null -> harus melempar RuntimeException
        $thrown = null;
        try {
            $migration->down();
        } catch (\RuntimeException $e) {
            $thrown = $e;
        }

        $this->assertNotNull($thrown, 'Method down() harus melempar RuntimeException saat ada category_id null.');
        $this->assertStringContainsString('tanpa kategori', $thrown->getMessage());
        $this->assertStringContainsString('category_id', $thrown->getMessage());

        // Baris pengeluaran tetap ada dan category_id tetap null
        $this->assertDatabaseHas('expenses', [
            'id' => $expenseId,
            'title' => 'Beli Penghapus Papan',
            'category_id' => null,
        ]);

        // Skema tetap nullable (bisa simpan pengeluaran baru tanpa kategori)
        $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'additional_income',
            'title' => 'Beli Kapur Warna',
            'amount' => 5000,
            'expense_date' => '2026-08-03',
        ])->assertSuccessful();

        // 8) Kasus tanpa baris NULL: down() tidak melempar
        $cat = ExpenseCategory::create(['name' => 'Perlengkapan Fiktif']);
        \Illuminate\Support\Facades\DB::table('expenses')->update(['category_id' => $cat->id]);

        $migration->down();
        $migration->up();
    }

    public function test_10_ringkasan_galat_validasi_berbahasa_indonesia_tanpa_more_errors(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $res = $this->postJson('/api/expenses', []);

        $res->assertStatus(422);
        $message = (string) $res->json('message');
        $this->assertNotEmpty($message);
        $this->assertStringNotContainsString('more error', $message);
        $this->assertStringContainsString('kesalahan lain', $message);
    }
}
