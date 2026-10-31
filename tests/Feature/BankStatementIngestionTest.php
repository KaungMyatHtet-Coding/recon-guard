<?php

namespace Tests\Feature;

use App\Models\BankStatementBatch;
use App\Models\BankTransaction;
use App\Models\User;
use App\Services\SyntheticDatasetService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class BankStatementIngestionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $accountant;
    protected User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'admin']);
        Role::firstOrCreate(['name' => 'accountant']);
        Role::firstOrCreate(['name' => 'customer']);

        $this->admin = User::factory()->create([
            'email' => 'admin_test@reconguard.local',
        ]);
        $this->admin->assignRole('admin');

        $this->accountant = User::factory()->create([
            'email' => 'accountant_test@reconguard.local',
        ]);
        $this->accountant->assignRole('accountant');

        $this->customer = User::factory()->create([
            'email' => 'customer_test@reconguard.local',
        ]);
        $this->customer->assignRole('customer');
    }

    public function test_customer_cannot_access_bank_statements(): void
    {
        $response = $this->actingAs($this->customer)->get('/bank-statements');
        $response->assertStatus(403);

        $uploadResponse = $this->actingAs($this->customer)->post('/bank-statements/upload', []);
        $uploadResponse->assertStatus(403);
    }

    public function test_accountant_can_view_bank_statements_index(): void
    {
        $response = $this->actingAs($this->accountant)->get('/bank-statements');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('BankStatements/Index')
            ->has('metrics')
            ->has('batches')
            ->has('transactions')
        );
    }

    public function test_accountant_can_upload_and_parse_kbzpay_statement_csv(): void
    {
        $csvContent = implode("\n", [
            "Transaction_No,Trade_Time,Payer_Phone,Payer_Name,Trans_Amount,Fee_Amount,Settlement_Amount,Remark",
            "01002026103100000001,2026-10-31 10:15:00,09250000001,U Kyaw Swar,150000.00,0.00,150000.00,Order Payment",
            "01002026103100000002,2026-10-31 11:20:00,09250000002,Daw Mya Mya,250000.00,500.00,249500.00,Invoice INV-002",
        ]);

        $file = UploadedFile::fake()->createWithContent('kbzpay_nov_statement.csv', $csvContent);

        $response = $this->actingAs($this->accountant)->post('/bank-statements/upload', [
            'statement_file' => $file,
            'payment_channel' => 'kbzpay',
        ]);

        $response->assertRedirect('/bank-statements');
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('bank_statement_batches', [
            'payment_channel' => 'kbzpay',
            'original_filename' => 'kbzpay_nov_statement.csv',
            'total_records' => 2,
            'total_credit_amount' => 400000.00,
            'status' => 'processed',
        ]);

        $this->assertDatabaseHas('bank_transactions', [
            'payment_channel' => 'kbzpay',
            'bank_transaction_id' => '01002026103100000001',
            'gross_amount' => 150000.00,
            'fee_amount' => 0.00,
            'net_amount' => 150000.00,
            'match_status' => 'unmatched',
        ]);

        $this->assertDatabaseHas('bank_transactions', [
            'payment_channel' => 'kbzpay',
            'bank_transaction_id' => '01002026103100000002',
            'gross_amount' => 250000.00,
            'fee_amount' => 500.00,
            'net_amount' => 249500.00,
            'match_status' => 'unmatched',
        ]);
    }

    public function test_accountant_can_upload_and_parse_wavepay_statement_csv(): void
    {
        $csvContent = implode("\n", [
            "Wave_Txn_ID,Date_Time,Sender_MSISDN,Sender_Name,Gross_MMK,Commission_MMK,Net_MMK,Reference",
            "9845120391,2026-10-31 09:30:00,09790000001,Ko Thura,75000.00,300.00,74700.00,REF-WAVE-001",
            "9845120392,2026-10-31 10:45:00,09790000002,Ma Hnin Wai,120000.00,400.00,119600.00,REF-WAVE-002",
        ]);

        $file = UploadedFile::fake()->createWithContent('wavepay_batch.csv', $csvContent);

        $response = $this->actingAs($this->accountant)->post('/bank-statements/upload', [
            'statement_file' => $file,
            'payment_channel' => 'wavepay',
        ]);

        $response->assertRedirect('/bank-statements');
        $this->assertDatabaseHas('bank_transactions', [
            'payment_channel' => 'wavepay',
            'bank_transaction_id' => '9845120391',
            'gross_amount' => 75000.00,
            'fee_amount' => 300.00,
            'net_amount' => 74700.00,
        ]);
    }

    public function test_accountant_can_upload_and_parse_cbpay_statement_csv(): void
    {
        $csvContent = implode("\n", [
            "Ref_No,Value_Date,Debit_Account,Account_Holder,Credit_Amount,Charges,Net_Credit,Narrative",
            "CB202610319001,2026-10-31,09420000001,U Min Min,500000.00,0.00,500000.00,Settlement Order",
        ]);

        $file = UploadedFile::fake()->createWithContent('cbpay_statement.csv', $csvContent);

        $response = $this->actingAs($this->accountant)->post('/bank-statements/upload', [
            'statement_file' => $file,
            'payment_channel' => 'cbpay',
        ]);

        $response->assertRedirect('/bank-statements');
        $this->assertDatabaseHas('bank_transactions', [
            'payment_channel' => 'cbpay',
            'bank_transaction_id' => 'CB202610319001',
            'gross_amount' => 500000.00,
        ]);
    }

    public function test_accountant_can_upload_and_parse_ayapay_statement_csv(): void
    {
        $csvContent = implode("\n", [
            "AYA_Trans_Ref,Transaction_Date,Customer_Phone,Customer_Name,Amount_MMK,Service_Fee,Total_Settled,Description",
            "AYA-99201001,2026-10-31 14:10:00,09960000001,Daw Khin Than,320000.00,200.00,319800.00,Retail purchase",
        ]);

        $file = UploadedFile::fake()->createWithContent('ayapay_report.csv', $csvContent);

        $response = $this->actingAs($this->accountant)->post('/bank-statements/upload', [
            'statement_file' => $file,
            'payment_channel' => 'ayapay',
        ]);

        $response->assertRedirect('/bank-statements');
        $this->assertDatabaseHas('bank_transactions', [
            'payment_channel' => 'ayapay',
            'bank_transaction_id' => 'AYA-99201001',
            'gross_amount' => 320000.00,
        ]);
    }

    public function test_auto_detection_works_for_bank_statement_csv(): void
    {
        $csvContent = implode("\n", [
            "Transaction_No,Trade_Time,Payer_Phone,Payer_Name,Trans_Amount,Fee_Amount,Settlement_Amount,Remark",
            "01002026103199999999,2026-10-31 16:00:00,09250000001,U Kyaw Swar,88000.00,0.00,88000.00,Auto detect test",
        ]);

        $file = UploadedFile::fake()->createWithContent('unknown_statement.csv', $csvContent);

        $response = $this->actingAs($this->accountant)->post('/bank-statements/upload', [
            'statement_file' => $file,
            'payment_channel' => 'auto',
        ]);

        $response->assertRedirect('/bank-statements');
        $this->assertDatabaseHas('bank_statement_batches', [
            'payment_channel' => 'kbzpay',
            'original_filename' => 'unknown_statement.csv',
        ]);
    }

    public function test_invalid_csv_headers_are_rejected(): void
    {
        $csvContent = implode("\n", [
            "Invalid_Col_1,Invalid_Col_2,Amount",
            "abc,123,456",
        ]);

        $file = UploadedFile::fake()->createWithContent('corrupt.csv', $csvContent);

        $response = $this->actingAs($this->accountant)->post('/bank-statements/upload', [
            'statement_file' => $file,
            'payment_channel' => 'kbzpay',
        ]);

        $response->assertSessionHasErrors(['statement_file']);
    }

    public function test_reuploading_same_csv_prevents_duplicate_transactions(): void
    {
        $csvContent = implode("\n", [
            "Wave_Txn_ID,Date_Time,Sender_MSISDN,Sender_Name,Gross_MMK,Commission_MMK,Net_MMK,Reference",
            "9845999991,2026-10-31 09:30:00,09790000001,Ko Thura,50000.00,0.00,50000.00,REF-1",
            "9845999992,2026-10-31 10:45:00,09790000002,Ma Hnin Wai,60000.00,0.00,60000.00,REF-2",
        ]);

        $file1 = UploadedFile::fake()->createWithContent('wave_batch_1.csv', $csvContent);

        $this->actingAs($this->accountant)->post('/bank-statements/upload', [
            'statement_file' => $file1,
            'payment_channel' => 'wavepay',
        ]);

        $this->assertEquals(2, BankTransaction::where('payment_channel', 'wavepay')->count());

        // Upload exact same transactions a second time
        $file2 = UploadedFile::fake()->createWithContent('wave_batch_duplicate.csv', $csvContent);

        $response2 = $this->actingAs($this->accountant)->post('/bank-statements/upload', [
            'statement_file' => $file2,
            'payment_channel' => 'wavepay',
        ]);

        $response2->assertRedirect('/bank-statements');
        $response2->assertSessionHas('success');

        // Verify total transaction count did NOT duplicate to 4
        $this->assertEquals(2, BankTransaction::where('payment_channel', 'wavepay')->count());
    }

    public function test_can_view_batch_details_and_transactions(): void
    {
        $batch = BankStatementBatch::create([
            'uploaded_by' => $this->accountant->id,
            'payment_channel' => 'kbzpay',
            'original_filename' => 'test_kbz.csv',
            'statement_date' => '2026-10-31',
            'total_records' => 1,
            'total_credit_amount' => 100000.00,
            'status' => 'processed',
        ]);

        BankTransaction::create([
            'batch_id' => $batch->id,
            'payment_channel' => 'kbzpay',
            'bank_transaction_id' => '01009999999999999999',
            'transaction_datetime' => '2026-10-31 12:00:00',
            'gross_amount' => 100000.00,
            'fee_amount' => 0.00,
            'net_amount' => 100000.00,
            'match_status' => 'unmatched',
        ]);

        $response = $this->actingAs($this->accountant)->get("/bank-statements/{$batch->id}");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('BankStatements/Show')
            ->has('batch')
            ->has('transactions')
        );
    }

    public function test_can_delete_and_rollback_batch(): void
    {
        $batch = BankStatementBatch::create([
            'uploaded_by' => $this->accountant->id,
            'payment_channel' => 'cbpay',
            'original_filename' => 'wrong_file.csv',
            'statement_date' => '2026-10-31',
            'total_records' => 1,
            'total_credit_amount' => 50000.00,
            'status' => 'processed',
        ]);

        BankTransaction::create([
            'batch_id' => $batch->id,
            'payment_channel' => 'cbpay',
            'bank_transaction_id' => 'CB_ROLLBACK_TEST_01',
            'transaction_datetime' => '2026-10-31 10:00:00',
            'gross_amount' => 50000.00,
            'fee_amount' => 0.00,
            'net_amount' => 50000.00,
            'match_status' => 'unmatched',
        ]);

        $this->assertDatabaseHas('bank_statement_batches', ['id' => $batch->id]);
        $this->assertDatabaseHas('bank_transactions', ['bank_transaction_id' => 'CB_ROLLBACK_TEST_01']);

        $response = $this->actingAs($this->accountant)->delete("/bank-statements/{$batch->id}");

        $response->assertRedirect('/bank-statements');
        $this->assertDatabaseMissing('bank_statement_batches', ['id' => $batch->id]);
        $this->assertDatabaseMissing('bank_transactions', ['bank_transaction_id' => 'CB_ROLLBACK_TEST_01']);
    }
}
