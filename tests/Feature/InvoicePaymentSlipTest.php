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

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_customer_can_view_their_invoices(): void
    {
        $customer = User::where('email', 'customer1@reconguard.test')->firstOrFail();
        $response = $this->actingAs($customer)->get('/invoices');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Invoices/Index')
            ->has('invoices')
            ->has('stats')
        );
    }

    public function test_customer_can_view_invoice_payment_portal(): void
    {
        $customer = User::where('email', 'customer1@reconguard.test')->firstOrFail();
        $invoice = Invoice::where('user_id', $customer->id)->firstOrFail();

        $response = $this->actingAs($customer)->get("/invoices/{$invoice->id}");

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
        $customer1 = User::where('email', 'customer1@reconguard.test')->firstOrFail();
        $customer2 = User::where('email', 'customer2@reconguard.test')->firstOrFail();

        $invoiceOfCustomer2 = Invoice::where('user_id', $customer2->id)->firstOrFail();

        $response = $this->actingAs($customer1)->get("/invoices/{$invoiceOfCustomer2->id}");
        $response->assertForbidden();
    }

    public function test_admin_and_accountant_can_view_any_invoice(): void
    {
        $admin = User::where('email', 'admin@reconguard.test')->firstOrFail();
        $invoice = Invoice::firstOrFail();

        $response = $this->actingAs($admin)->get("/invoices/{$invoice->id}");
        $response->assertOk();
    }

    public function test_analyze_slip_endpoint_extracts_receipt_fields(): void
    {
        Storage::fake('public');
        $customer = User::where('email', 'customer1@reconguard.test')->firstOrFail();
        $invoice = Invoice::where('user_id', $customer->id)->firstOrFail();

        $slipService = app(MockSlipImageService::class);
        $slip = $slipService->generateReceiptImage('kbzpay', 'legit', [
            'transaction_id' => '01002026103099988877',
            'amount' => $invoice->amount,
            'sender_name' => $invoice->customer_name,
            'sender_phone' => '09960111222',
            'datetime' => now()->toDateTimeString(),
            'invoice_number' => $invoice->invoice_number,
        ]);

        $file = UploadedFile::fake()->createWithContent('slip.png', $slip['image_bytes']);

        $response = $this->actingAs($customer)->postJson("/invoices/{$invoice->id}/analyze-slip", [
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
        $customer = User::where('email', 'customer1@reconguard.test')->firstOrFail();
        $invoice = Invoice::where('user_id', $customer->id)->where('status', 'unpaid')->firstOrFail();

        $slipService = app(MockSlipImageService::class);
        $slip = $slipService->generateReceiptImage('kbzpay', 'legit', [
            'transaction_id' => '01002026103055566677',
            'amount' => $invoice->amount,
            'sender_name' => $invoice->customer_name,
            'sender_phone' => '09960111222',
            'datetime' => now()->toDateTimeString(),
            'invoice_number' => $invoice->invoice_number,
        ]);

        $file = UploadedFile::fake()->createWithContent('slip_legit.png', $slip['image_bytes']);

        $response = $this->actingAs($customer)->post("/invoices/{$invoice->id}/submit-slip", [
            'slip_file' => $file,
            'payment_channel' => 'kbzpay',
            'extracted_transaction_id' => '01002026103055566677',
            'extracted_amount' => $invoice->amount,
            'sender_phone' => '09960111222',
            'sender_name' => $invoice->customer_name,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('payment_slips', [
            'invoice_id' => $invoice->id,
            'payment_channel' => 'kbzpay',
            'extracted_transaction_id' => '01002026103055566677',
            'verification_status' => 'pending_recon',
            'exif_tamper_flag' => false,
        ]);

        $this->assertEquals('pending_verification', $invoice->fresh()->status);
    }

    public function test_submit_tampered_slip_triggers_tampered_fraud_flag(): void
    {
        Storage::fake('public');
        $customer = User::where('email', 'customer1@reconguard.test')->firstOrFail();
        $invoice = Invoice::where('user_id', $customer->id)->firstOrFail();

        $slipService = app(MockSlipImageService::class);
        $slip = $slipService->generateReceiptImage('kbzpay', 'tampered_amount', [
            'transaction_id' => '01002026103011122233',
            'amount' => 500000.00,
            'sender_name' => $invoice->customer_name,
            'sender_phone' => '09960111222',
            'datetime' => now()->toDateTimeString(),
            'invoice_number' => $invoice->invoice_number,
        ]);

        $file = UploadedFile::fake()->createWithContent('slip_tampered.png', $slip['image_bytes']);

        $response = $this->actingAs($customer)->post("/invoices/{$invoice->id}/submit-slip", [
            'slip_file' => $file,
            'payment_channel' => 'kbzpay',
            'extracted_transaction_id' => '01002026103011122233',
            'extracted_amount' => 500000.00,
            'sender_phone' => '09960111222',
            'sender_name' => $invoice->customer_name,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('warning');

        $this->assertDatabaseHas('payment_slips', [
            'invoice_id' => $invoice->id,
            'extracted_transaction_id' => '01002026103011122233',
            'verification_status' => 'tampered_fraud',
            'exif_tamper_flag' => true,
        ]);

        $this->assertEquals('fraud_flagged', $invoice->fresh()->status);
    }

    public function test_submit_duplicate_transaction_id_triggers_duplicate_fraud_flag(): void
    {
        Storage::fake('public');
        $customer = User::where('email', 'customer1@reconguard.test')->firstOrFail();
        $invoice = Invoice::where('user_id', $customer->id)->firstOrFail();

        // Existing slip in KBZPay channel with ID 'KP-20261028-984210'
        $existingSlip = PaymentSlip::where('payment_channel', 'kbzpay')->firstOrFail();

        $slipService = app(MockSlipImageService::class);
        $slip = $slipService->generateReceiptImage('kbzpay', 'duplicate_id', [
            'transaction_id' => $existingSlip->extracted_transaction_id,
            'amount' => $invoice->amount,
            'sender_name' => $invoice->customer_name,
            'sender_phone' => '09960111222',
            'datetime' => now()->toDateTimeString(),
            'invoice_number' => $invoice->invoice_number,
        ]);

        $file = UploadedFile::fake()->createWithContent('slip_dup.png', $slip['image_bytes']);

        $response = $this->actingAs($customer)->post("/invoices/{$invoice->id}/submit-slip", [
            'slip_file' => $file,
            'payment_channel' => 'kbzpay',
            'extracted_transaction_id' => $existingSlip->extracted_transaction_id,
            'extracted_amount' => $invoice->amount,
            'sender_phone' => '09960111222',
            'sender_name' => $invoice->customer_name,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');

        $this->assertDatabaseHas('payment_slips', [
            'invoice_id' => $invoice->id,
            'extracted_transaction_id' => $existingSlip->extracted_transaction_id,
            'verification_status' => 'duplicate_fraud',
        ]);

        $this->assertEquals('fraud_flagged', $invoice->fresh()->status);
    }
}
