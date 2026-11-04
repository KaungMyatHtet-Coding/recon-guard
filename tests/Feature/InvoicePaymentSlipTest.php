<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\User;
use App\Services\MockSlipImageService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class InvoicePaymentSlipTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected Invoice $invoice;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->customer = User::where('email', 'customer@reconguard.test')->firstOrFail();

        $this->invoice = Invoice::create([
            'invoice_number' => 'INV-TEST-0001',
            'user_id' => $this->customer->id,
            'customer_name' => $this->customer->name,
            'customer_phone' => $this->customer->phone,
            'description' => 'Test Hardware Purchase',
            'amount' => 500000.00,
            'expected_channel' => 'kbzpay',
            'status' => 'unpaid',
            'due_date' => now()->addDays(7),
        ]);
    }

    public function test_customer_can_view_their_invoices(): void
    {
        $response = $this->actingAs($this->customer)->get('/invoices');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Invoices/Index')
            ->has('invoices')
            ->has('stats')
        );
    }

    public function test_customer_strictly_filtered_to_own_invoices(): void
    {
        $otherCustomer = User::factory()->create([
            'email' => 'other_customer@reconguard.test',
            'phone' => '+959960999999',
        ]);
        $otherCustomer->assignRole('customer');

        Invoice::create([
            'invoice_number' => 'INV-OTHER-CONFIDENTIAL',
            'user_id' => $otherCustomer->id,
            'customer_name' => 'Other Merchant',
            'customer_phone' => '+959960999999',
            'description' => 'Confidential Server Order',
            'amount' => 9900000.00,
            'expected_channel' => 'wavepay',
            'status' => 'unpaid',
            'due_date' => now()->addDays(5),
        ]);

        $response = $this->actingAs($this->customer)->get('/invoices');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Invoices/Index')
            ->where('invoices.data', function ($invoices) {
                // Ensure none of the returned invoices belong to another customer
                foreach ($invoices as $inv) {
                    if ($inv['invoice_number'] === 'INV-OTHER-CONFIDENTIAL') {
                        return false;
                    }
                }
                return true;
            })
        );
    }

    public function test_customer_can_view_invoice_payment_portal(): void
    {
        $response = $this->actingAs($this->customer)->get("/invoices/{$this->invoice->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Invoices/Show')
            ->has('invoice')
            ->has('merchantAccounts')
            ->has('submittedSlips')
        );
    }

    public function test_customer_cannot_view_another_customers_invoice(): void
    {
        $otherCustomer = User::factory()->create([
            'email' => 'other_customer_private@reconguard.test',
        ]);
        $otherCustomer->assignRole('customer');

        $otherInvoice = Invoice::create([
            'invoice_number' => 'INV-SECRET-0003',
            'user_id' => $otherCustomer->id,
            'customer_name' => 'Other Customer',
            'customer_phone' => '+959960777888',
            'description' => 'Secret Services',
            'amount' => 120000.00,
            'expected_channel' => 'cbpay',
            'status' => 'unpaid',
            'due_date' => now()->addDays(3),
        ]);

        $response = $this->actingAs($this->customer)->get("/invoices/{$otherInvoice->id}");
        $response->assertForbidden();
    }

    public function test_admin_and_accountant_can_view_any_invoice(): void
    {
        $admin = User::where('email', 'admin@reconguard.test')->firstOrFail();

        $response = $this->actingAs($admin)->get("/invoices/{$this->invoice->id}");
        $response->assertOk();
    }

    public function test_analyze_slip_endpoint_extracts_receipt_fields(): void
    {
        Storage::fake('public');

        $slipService = app(MockSlipImageService::class);
        $slip = $slipService->generateReceiptImage('kbzpay', 'legit', [
            'transaction_id' => '01002026103099988877',
            'amount' => $this->invoice->amount,
            'sender_name' => $this->invoice->customer_name,
            'sender_phone' => '09960111222',
            'datetime' => now()->toDateTimeString(),
            'invoice_number' => $this->invoice->invoice_number,
        ]);

        $file = UploadedFile::fake()->createWithContent('slip.png', $slip['image_bytes']);

        $response = $this->actingAs($this->customer)->postJson("/invoices/{$this->invoice->id}/analyze-slip", [
            'slip_file' => $file,
            'channel' => 'kbzpay',
        ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'analysis' => [
                'channel' => 'kbzpay',
                'transaction_id' => '01002026103099988877',
                'exif_tamper_flag' => false,
            ],
        ]);
    }

    public function test_submit_legit_slip_updates_invoice_to_pending_verification(): void
    {
        Storage::fake('public');

        $slipService = app(MockSlipImageService::class);
        $slip = $slipService->generateReceiptImage('kbzpay', 'legit', [
            'transaction_id' => '01002026103055566677',
            'amount' => $this->invoice->amount,
            'sender_name' => $this->invoice->customer_name,
            'sender_phone' => '09960111222',
            'datetime' => now()->toDateTimeString(),
            'invoice_number' => $this->invoice->invoice_number,
        ]);

        $file = UploadedFile::fake()->createWithContent('slip_legit.png', $slip['image_bytes']);

        $response = $this->actingAs($this->customer)->post("/invoices/{$this->invoice->id}/submit-slip", [
            'slip_file' => $file,
            'payment_channel' => 'kbzpay',
            'extracted_transaction_id' => '01002026103055566677',
            'extracted_amount' => $this->invoice->amount,
            'sender_phone' => '09960111222',
            'sender_name' => $this->invoice->customer_name,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('payment_slips', [
            'invoice_id' => $this->invoice->id,
            'payment_channel' => 'kbzpay',
            'extracted_transaction_id' => '01002026103055566677',
            'verification_status' => 'pending_recon',
            'exif_tamper_flag' => false,
        ]);

        $this->assertEquals('pending_verification', $this->invoice->fresh()->status);
    }

    public function test_submit_tampered_slip_triggers_tampered_fraud_flag(): void
    {
        Storage::fake('public');

        $slipService = app(MockSlipImageService::class);
        $slip = $slipService->generateReceiptImage('kbzpay', 'tampered_amount', [
            'transaction_id' => '01002026103011122233',
            'amount' => 500000.00,
            'sender_name' => $this->invoice->customer_name,
            'sender_phone' => '09960111222',
            'datetime' => now()->toDateTimeString(),
            'invoice_number' => $this->invoice->invoice_number,
        ]);

        $file = UploadedFile::fake()->createWithContent('slip_tampered.png', $slip['image_bytes']);

        $response = $this->actingAs($this->customer)->post("/invoices/{$this->invoice->id}/submit-slip", [
            'slip_file' => $file,
            'payment_channel' => 'kbzpay',
            'extracted_transaction_id' => '01002026103011122233',
            'extracted_amount' => 500000.00,
            'sender_phone' => '09960111222',
            'sender_name' => $this->invoice->customer_name,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('warning');

        $this->assertDatabaseHas('payment_slips', [
            'invoice_id' => $this->invoice->id,
            'extracted_transaction_id' => '01002026103011122233',
            'verification_status' => 'tampered_fraud',
            'exif_tamper_flag' => true,
        ]);

        $this->assertEquals('fraud_flagged', $this->invoice->fresh()->status);
    }

    public function test_submit_duplicate_transaction_id_triggers_duplicate_fraud_flag(): void
    {
        Storage::fake('public');

        // Existing slip in KBZPay channel with ID 'KP-20261028-984210'
        $existingSlip = PaymentSlip::create([
            'invoice_id' => $this->invoice->id,
            'user_id' => $this->customer->id,
            'payment_channel' => 'kbzpay',
            'image_path' => 'slips/kbzpay/existing.jpg',
            'image_hash' => hash('sha256', 'existing_slip'),
            'extracted_transaction_id' => 'KP-20261028-984210',
            'extracted_amount' => 500000.00,
            'extracted_datetime' => now()->subDay(),
            'sender_phone' => $this->customer->phone,
            'sender_name' => $this->customer->name,
            'ocr_confidence' => 95,
            'exif_tamper_flag' => false,
            'verification_status' => 'matched',
        ]);

        $slipService = app(MockSlipImageService::class);
        $slip = $slipService->generateReceiptImage('kbzpay', 'duplicate_id', [
            'transaction_id' => $existingSlip->extracted_transaction_id,
            'amount' => $this->invoice->amount,
            'sender_name' => $this->invoice->customer_name,
            'sender_phone' => '09960111222',
            'datetime' => now()->toDateTimeString(),
            'invoice_number' => $this->invoice->invoice_number,
        ]);

        $file = UploadedFile::fake()->createWithContent('slip_dup.png', $slip['image_bytes']);

        $response = $this->actingAs($this->customer)->post("/invoices/{$this->invoice->id}/submit-slip", [
            'slip_file' => $file,
            'payment_channel' => 'kbzpay',
            'extracted_transaction_id' => $existingSlip->extracted_transaction_id,
            'extracted_amount' => $this->invoice->amount,
            'sender_phone' => '09960111222',
            'sender_name' => $this->invoice->customer_name,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');

        $this->assertDatabaseHas('payment_slips', [
            'invoice_id' => $this->invoice->id,
            'extracted_transaction_id' => $existingSlip->extracted_transaction_id,
            'verification_status' => 'duplicate_fraud',
        ]);

        $this->assertEquals('fraud_flagged', $this->invoice->fresh()->status);
    }
}
