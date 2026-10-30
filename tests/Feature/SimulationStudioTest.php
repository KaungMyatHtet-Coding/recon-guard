<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\User;
use App\Services\MockSlipImageService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SimulationStudioTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_guests_cannot_access_simulation_studio(): void
    {
        $response = $this->get('/simulation-studio');
        $response->assertRedirect('/login');
    }

    public function test_customer_cannot_access_simulation_studio(): void
    {
        $customer = User::where('email', 'customer1@reconguard.test')->firstOrFail();
        $response = $this->actingAs($customer)->get('/simulation-studio');
        $response->assertForbidden();
    }

    public function test_admin_and_accountant_can_access_simulation_studio(): void
    {
        $admin = User::where('email', 'admin@reconguard.test')->firstOrFail();
        $response = $this->actingAs($admin)->get('/simulation-studio');
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('SimulationStudio/Index')
            ->has('invoices')
            ->has('recentBatches')
            ->has('counts')
        );

        $accountant = User::where('email', 'accountant@reconguard.test')->firstOrFail();
        $response = $this->actingAs($accountant)->get('/simulation-studio');
        $response->assertOk();
    }

    public function test_bulk_dataset_generation(): void
    {
        Storage::fake('public');
        $admin = User::where('email', 'admin@reconguard.test')->firstOrFail();

        $initialInvoices = Invoice::count();
        $initialSlips = PaymentSlip::count();

        $response = $this->actingAs($admin)->post('/simulation-studio/generate-bulk', [
            'size' => 50,
            'channel' => 'all',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertGreaterThan($initialInvoices, Invoice::count());
        $this->assertGreaterThan($initialSlips, PaymentSlip::count());
    }

    public function test_channel_specific_csv_downloads_have_correct_headers(): void
    {
        $admin = User::where('email', 'admin@reconguard.test')->firstOrFail();

        // 1. KBZPay
        $response = $this->actingAs($admin)->get('/simulation-studio/download-csv/kbzpay');
        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type') ?? '');
        $this->assertStringContainsString('Transaction_No,Trade_Time,Payer_Phone,Payer_Name,Trans_Amount,Fee_Amount,Settlement_Amount,Remark', $response->streamedContent());

        // 2. WavePay
        $response = $this->actingAs($admin)->get('/simulation-studio/download-csv/wavepay');
        $response->assertOk();
        $this->assertStringContainsString('Wave_Txn_ID,Date_Time,Sender_MSISDN,Sender_Name,Gross_MMK,Commission_MMK,Net_MMK,Reference', $response->streamedContent());

        // 3. CB Pay
        $response = $this->actingAs($admin)->get('/simulation-studio/download-csv/cbpay');
        $response->assertOk();
        $this->assertStringContainsString('Ref_No,Value_Date,Debit_Account,Account_Holder,Credit_Amount,Charges,Net_Credit,Narrative', $response->streamedContent());

        // 4. AYA Pay
        $response = $this->actingAs($admin)->get('/simulation-studio/download-csv/ayapay');
        $response->assertOk();
        $this->assertStringContainsString('AYA_Trans_Ref,Transaction_Date,Customer_Phone,Customer_Name,Amount_MMK,Service_Fee,Total_Settled,Description', $response->streamedContent());
    }

    public function test_mock_slip_image_generator_service(): void
    {
        $service = app(MockSlipImageService::class);

        $result = $service->generateReceiptImage('kbzpay', 'legit', [
            'transaction_id' => '01002026103012345678',
            'amount' => 150000.00,
            'sender_name' => 'Ko Thura',
            'sender_phone' => '09790001234',
            'datetime' => '2026-10-30 14:00:00',
            'invoice_number' => 'INV-TEST-001',
        ]);

        $this->assertNotEmpty($result['image_bytes']);
        $this->assertEquals('image/png', $result['mime']);
        $this->assertNotEmpty($result['image_hash']);
        $this->assertFalse($result['metadata']['Tampered']);

        // Test tampered amount mode
        $tampered = $service->generateReceiptImage('wavepay', 'tampered_amount', [
            'transaction_id' => '9845120394',
            'amount' => 500000.00,
            'sender_name' => 'Ma Hnin Wai',
            'sender_phone' => '09960111222',
            'datetime' => '2026-10-30 14:00:00',
            'invoice_number' => 'INV-TEST-002',
        ]);

        $this->assertTrue($tampered['metadata']['Tampered']);
        $this->assertStringContainsString('Adobe Photoshop', $tampered['metadata']['Software']);
    }

    public function test_1_click_inject_slip_and_bank_row(): void
    {
        Storage::fake('public');
        $admin = User::where('email', 'admin@reconguard.test')->firstOrFail();
        $invoice = Invoice::firstOrFail();

        $response = $this->actingAs($admin)->post('/simulation-studio/inject-slip', [
            'invoice_id' => $invoice->id,
            'channel' => 'kbzpay',
            'mode' => 'tampered_amount',
            'txn_id' => 'KP-TEST-INJECT-001',
            'slip_amount' => 500000,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('payment_slips', [
            'invoice_id' => $invoice->id,
            'extracted_transaction_id' => 'KP-TEST-INJECT-001',
            'extracted_amount' => 500000,
            'verification_status' => 'tampered_fraud',
            'exif_tamper_flag' => true,
        ]);

        // Verify bank row received only 5,000 MMK for tampered mode!
        $this->assertDatabaseHas('bank_transactions', [
            'payment_channel' => 'kbzpay',
            'bank_transaction_id' => 'KP-TEST-INJECT-001',
            'gross_amount' => 5000.00,
        ]);
    }
}
