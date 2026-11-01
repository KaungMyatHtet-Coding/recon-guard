<?php

namespace Tests\Feature;

use App\Models\BankStatementBatch;
use App\Models\BankTransaction;
use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\ReconciliationMatch;
use App\Models\User;
use App\Services\ReconciliationEngineService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReconciliationEngineTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $accountant;
    protected User $customer;
    protected BankStatementBatch $batch;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'admin']);
        Role::firstOrCreate(['name' => 'accountant']);
        Role::firstOrCreate(['name' => 'customer']);

        $this->admin = User::factory()->create([
            'email' => 'admin_recon@reconguard.local',
        ]);
        $this->admin->assignRole('admin');

        $this->accountant = User::factory()->create([
            'email' => 'accountant_recon@reconguard.local',
        ]);
        $this->accountant->assignRole('accountant');

        $this->customer = User::factory()->create([
            'email' => 'customer_recon@reconguard.local',
            'phone' => '09250000001',
        ]);
        $this->customer->assignRole('customer');

        $this->batch = BankStatementBatch::create([
            'uploaded_by' => $this->accountant->id,
            'payment_channel' => 'kbzpay',
            'original_filename' => 'KBZPay_Demo_Statement.csv',
            'statement_date' => Carbon::today(),
            'total_records' => 10,
            'total_credit_amount' => 1000000.00,
            'status' => 'processed',
        ]);
    }

    public function test_customer_cannot_access_reconciliation(): void
    {
        $response = $this->actingAs($this->customer)->get('/reconciliation');
        $response->assertStatus(403);

        $runResponse = $this->actingAs($this->customer)->post('/reconciliation/run', []);
        $runResponse->assertStatus(403);
    }

    public function test_accountant_can_view_reconciliation_workbench(): void
    {
        $response = $this->actingAs($this->accountant)->get('/reconciliation');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Reconciliation/Index')
            ->has('metrics')
            ->has('matches')
            ->has('suspenseItems')
        );
    }

    public function test_exact_match_automation(): void
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-2026-EXACT-001',
            'user_id' => $this->customer->id,
            'customer_name' => 'U Kyaw Swar',
            'customer_phone' => '09250000001',
            'description' => 'Exact match invoice test',
            'amount' => 150000.00,
            'expected_channel' => 'kbzpay',
            'status' => 'pending_verification',
            'due_date' => Carbon::now()->addDays(5)->toDateString(),
        ]);

        $slip = PaymentSlip::create([
            'invoice_id' => $invoice->id,
            'user_id' => $this->customer->id,
            'payment_channel' => 'kbzpay',
            'image_path' => 'slips/mock_kbz.png',
            'image_hash' => hash('sha256', 'mock_content_1'),
            'extracted_transaction_id' => '01002026110100000001',
            'extracted_amount' => 150000.00,
            'extracted_datetime' => Carbon::now(),
            'sender_phone' => '09250000001',
            'sender_name' => 'U Kyaw Swar',
            'ocr_confidence' => 98,
            'exif_tamper_flag' => false,
            'verification_status' => 'pending_recon',
        ]);

        $bankTx = BankTransaction::create([
            'batch_id' => $this->batch->id,
            'payment_channel' => 'kbzpay',
            'bank_transaction_id' => '01002026110100000001',
            'transaction_datetime' => Carbon::now(),
            'sender_phone' => '09250000001',
            'sender_name' => 'U Kyaw Swar',
            'gross_amount' => 150000.00,
            'fee_amount' => 0.00,
            'net_amount' => 150000.00,
            'reference_note' => 'INV-2026-EXACT-001',
            'match_status' => 'unmatched',
        ]);

        $service = app(ReconciliationEngineService::class);
        $result = $service->run('kbzpay', $this->accountant);

        $this->assertEquals(1, $result['exact_matches']);
        $this->assertEquals(150000.00, $result['total_reconciled_mmk']);

        $this->assertDatabaseHas('reconciliation_matches', [
            'invoice_id' => $invoice->id,
            'payment_slip_id' => $slip->id,
            'bank_transaction_id' => $bankTx->id,
            'match_type' => 'exact_match',
            'confidence_score' => 100.00,
            'status' => 'auto_approved',
            'variance_amount' => 0.00,
        ]);

        $this->assertEquals('reconciled', $invoice->fresh()->status);
        $this->assertEquals('matched', $slip->fresh()->verification_status);
        $this->assertEquals('matched', $bankTx->fresh()->match_status);
    }

    public function test_fee_adjusted_match_automation(): void
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-2026-FEE-001',
            'user_id' => $this->customer->id,
            'customer_name' => 'Daw Mya Mya',
            'customer_phone' => '09790000002',
            'description' => 'Fee adjusted match test',
            'amount' => 250000.00,
            'expected_channel' => 'wavepay',
            'status' => 'pending_verification',
            'due_date' => Carbon::now()->addDays(5)->toDateString(),
        ]);

        $slip = PaymentSlip::create([
            'invoice_id' => $invoice->id,
            'user_id' => $this->customer->id,
            'payment_channel' => 'wavepay',
            'image_path' => 'slips/mock_wave.png',
            'image_hash' => hash('sha256', 'mock_content_2'),
            'extracted_transaction_id' => '9845120399',
            'extracted_amount' => 250000.00,
            'extracted_datetime' => Carbon::now(),
            'sender_phone' => '09790000002',
            'sender_name' => 'Daw Mya Mya',
            'ocr_confidence' => 95,
            'exif_tamper_flag' => false,
            'verification_status' => 'pending_recon',
        ]);

        $bankTx = BankTransaction::create([
            'batch_id' => $this->batch->id,
            'payment_channel' => 'wavepay',
            'bank_transaction_id' => '9845120399',
            'transaction_datetime' => Carbon::now(),
            'sender_phone' => '09790000002',
            'sender_name' => 'Daw Mya Mya',
            'gross_amount' => 250000.00,
            'fee_amount' => 500.00,
            'net_amount' => 249500.00,
            'reference_note' => 'WavePay settlement',
            'match_status' => 'unmatched',
        ]);

        $service = app(ReconciliationEngineService::class);
        $result = $service->run('wavepay', $this->accountant);

        $this->assertEquals(1, $result['fee_adjusted']);

        $this->assertDatabaseHas('reconciliation_matches', [
            'invoice_id' => $invoice->id,
            'match_type' => 'fee_adjusted_match',
            'confidence_score' => 95.00,
            'status' => 'auto_approved',
            'variance_amount' => 500.00,
        ]);

        $this->assertEquals('reconciled', $invoice->fresh()->status);
        $this->assertEquals('matched', $slip->fresh()->verification_status);
        $this->assertEquals('matched', $bankTx->fresh()->match_status);
    }

    public function test_fuzzy_match_via_levenshtein_distance(): void
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-2026-FUZZY-001',
            'user_id' => $this->customer->id,
            'customer_name' => 'Ko Thura',
            'customer_phone' => '09420000003',
            'description' => 'Fuzzy OCR match test',
            'amount' => 120000.00,
            'expected_channel' => 'cbpay',
            'status' => 'pending_verification',
            'due_date' => Carbon::now()->addDays(5)->toDateString(),
        ]);

        // OCR extracted ID has 1 character misread ('O' instead of '0')
        $slip = PaymentSlip::create([
            'invoice_id' => $invoice->id,
            'user_id' => $this->customer->id,
            'payment_channel' => 'cbpay',
            'image_path' => 'slips/mock_cb.png',
            'image_hash' => hash('sha256', 'mock_content_3'),
            'extracted_transaction_id' => 'CB20261101900O',
            'extracted_amount' => 120000.00,
            'extracted_datetime' => Carbon::now(),
            'sender_phone' => '09420000003',
            'sender_name' => 'Ko Thura',
            'ocr_confidence' => 88,
            'exif_tamper_flag' => false,
            'verification_status' => 'pending_recon',
        ]);

        $bankTx = BankTransaction::create([
            'batch_id' => $this->batch->id,
            'payment_channel' => 'cbpay',
            'bank_transaction_id' => 'CB202611019000',
            'transaction_datetime' => Carbon::now(),
            'sender_phone' => '09420000003',
            'sender_name' => 'Ko Thura',
            'gross_amount' => 120000.00,
            'fee_amount' => 0.00,
            'net_amount' => 120000.00,
            'reference_note' => 'Order payment',
            'match_status' => 'unmatched',
        ]);

        $service = app(ReconciliationEngineService::class);
        $result = $service->run('cbpay', $this->accountant);

        $this->assertEquals(1, $result['fuzzy_matches']);

        $this->assertDatabaseHas('reconciliation_matches', [
            'invoice_id' => $invoice->id,
            'payment_slip_id' => $slip->id,
            'bank_transaction_id' => $bankTx->id,
            'match_type' => 'fuzzy_match',
            'status' => 'pending_review',
        ]);

        $this->assertEquals('discrepancy', $invoice->fresh()->status);
        $this->assertEquals('fuzzy_match', $slip->fresh()->verification_status);
        $this->assertEquals('fuzzy_matched', $bankTx->fresh()->match_status);
    }

    public function test_tampered_amount_fraud_caught(): void
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-2026-FRAUD-001',
            'user_id' => $this->customer->id,
            'customer_name' => 'Ma Hnin Wai',
            'customer_phone' => '09960000004',
            'description' => 'Tampered amount test',
            'amount' => 500000.00,
            'expected_channel' => 'ayapay',
            'status' => 'pending_verification',
            'due_date' => Carbon::now()->addDays(5)->toDateString(),
        ]);

        // Slip claims 500,000 MMK
        $slip = PaymentSlip::create([
            'invoice_id' => $invoice->id,
            'user_id' => $this->customer->id,
            'payment_channel' => 'ayapay',
            'image_path' => 'slips/mock_aya_tampered.png',
            'image_hash' => hash('sha256', 'mock_content_4'),
            'extracted_transaction_id' => 'AYA-99201999',
            'extracted_amount' => 500000.00,
            'extracted_datetime' => Carbon::now(),
            'sender_phone' => '09960000004',
            'sender_name' => 'Ma Hnin Wai',
            'ocr_confidence' => 92,
            'exif_tamper_flag' => false,
            'verification_status' => 'pending_recon',
        ]);

        // Bank statement only recorded 5,000 MMK!
        $bankTx = BankTransaction::create([
            'batch_id' => $this->batch->id,
            'payment_channel' => 'ayapay',
            'bank_transaction_id' => 'AYA-99201999',
            'transaction_datetime' => Carbon::now(),
            'sender_phone' => '09960000004',
            'sender_name' => 'Ma Hnin Wai',
            'gross_amount' => 5000.00,
            'fee_amount' => 0.00,
            'net_amount' => 5000.00,
            'reference_note' => 'AYA Pay transaction',
            'match_status' => 'unmatched',
        ]);

        $service = app(ReconciliationEngineService::class);
        $result = $service->run('ayapay', $this->accountant);

        $this->assertEquals(1, $result['fraud_caught']);

        $this->assertDatabaseHas('reconciliation_matches', [
            'invoice_id' => $invoice->id,
            'payment_slip_id' => $slip->id,
            'bank_transaction_id' => $bankTx->id,
            'match_type' => 'amount_mismatch_fraud',
            'confidence_score' => 99.00,
            'status' => 'rejected_fraud',
            'variance_amount' => 495000.00,
        ]);

        $this->assertEquals('fraud_flagged', $invoice->fresh()->status);
        $this->assertEquals('tampered_fraud', $slip->fresh()->verification_status);
        $this->assertEquals('disputed', $bankTx->fresh()->match_status);
    }

    public function test_accountant_can_manually_approve_fuzzy_match(): void
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-2026-MANUAL-001',
            'user_id' => $this->customer->id,
            'customer_name' => 'U Min Min',
            'customer_phone' => '09250000005',
            'description' => 'Manual review test',
            'amount' => 300000.00,
            'expected_channel' => 'kbzpay',
            'status' => 'discrepancy',
            'due_date' => Carbon::now()->addDays(5)->toDateString(),
        ]);

        $slip = PaymentSlip::create([
            'invoice_id' => $invoice->id,
            'user_id' => $this->customer->id,
            'payment_channel' => 'kbzpay',
            'image_path' => 'slips/test.png',
            'image_hash' => hash('sha256', 'mock_5'),
            'extracted_transaction_id' => '0100202611018888888X',
            'extracted_amount' => 300000.00,
            'extracted_datetime' => Carbon::now(),
            'verification_status' => 'fuzzy_match',
        ]);

        $bankTx = BankTransaction::create([
            'batch_id' => $this->batch->id,
            'payment_channel' => 'kbzpay',
            'bank_transaction_id' => '01002026110188888888',
            'transaction_datetime' => Carbon::now(),
            'gross_amount' => 300000.00,
            'fee_amount' => 0.00,
            'net_amount' => 300000.00,
            'match_status' => 'fuzzy_matched',
        ]);

        $match = ReconciliationMatch::create([
            'invoice_id' => $invoice->id,
            'payment_slip_id' => $slip->id,
            'bank_transaction_id' => $bankTx->id,
            'match_type' => 'fuzzy_match',
            'confidence_score' => 85.00,
            'invoice_amount' => 300000.00,
            'slip_amount' => 300000.00,
            'bank_amount' => 300000.00,
            'variance_amount' => 0.00,
            'status' => 'pending_review',
        ]);

        $response = $this->actingAs($this->accountant)->patch("/reconciliation/matches/{$match->id}/approve", [
            'notes' => 'Customer confirmed last character was a blurred 8.',
        ]);

        $response->assertRedirect('/reconciliation');
        $this->assertEquals('approved_by_accountant', $match->fresh()->status);
        $this->assertEquals('reconciled', $invoice->fresh()->status);
        $this->assertEquals('matched', $slip->fresh()->verification_status);
        $this->assertEquals('matched', $bankTx->fresh()->match_status);
    }

    public function test_accountant_can_reject_discrepancy(): void
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-2026-REJECT-001',
            'user_id' => $this->customer->id,
            'customer_name' => 'Daw Khin Than',
            'customer_phone' => '09250000006',
            'description' => 'Manual reject test',
            'amount' => 80000.00,
            'expected_channel' => 'wavepay',
            'status' => 'discrepancy',
            'due_date' => Carbon::now()->addDays(5)->toDateString(),
        ]);

        $slip = PaymentSlip::create([
            'invoice_id' => $invoice->id,
            'user_id' => $this->customer->id,
            'payment_channel' => 'wavepay',
            'image_path' => 'slips/test_rej.png',
            'image_hash' => hash('sha256', 'mock_6'),
            'extracted_transaction_id' => '9845777777',
            'extracted_amount' => 80000.00,
            'verification_status' => 'fuzzy_match',
        ]);

        $bankTx = BankTransaction::create([
            'batch_id' => $this->batch->id,
            'payment_channel' => 'wavepay',
            'bank_transaction_id' => '9845777778',
            'transaction_datetime' => Carbon::now(),
            'gross_amount' => 80000.00,
            'fee_amount' => 0.00,
            'net_amount' => 80000.00,
            'match_status' => 'fuzzy_matched',
        ]);

        $match = ReconciliationMatch::create([
            'invoice_id' => $invoice->id,
            'payment_slip_id' => $slip->id,
            'bank_transaction_id' => $bankTx->id,
            'match_type' => 'fuzzy_match',
            'confidence_score' => 75.00,
            'invoice_amount' => 80000.00,
            'slip_amount' => 80000.00,
            'bank_amount' => 80000.00,
            'variance_amount' => 0.00,
            'status' => 'pending_review',
        ]);

        $response = $this->actingAs($this->accountant)->patch("/reconciliation/matches/{$match->id}/reject", [
            'reason' => 'Payer name does not match order customer at all.',
        ]);

        $response->assertRedirect('/reconciliation');
        $this->assertEquals('rejected_fraud', $match->fresh()->status);
        $this->assertEquals('fraud_flagged', $invoice->fresh()->status);
        $this->assertEquals('tampered_fraud', $slip->fresh()->verification_status);
        $this->assertEquals('disputed', $bankTx->fresh()->match_status);
    }
}
