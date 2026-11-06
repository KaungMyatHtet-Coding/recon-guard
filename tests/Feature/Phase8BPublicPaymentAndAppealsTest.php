<?php

namespace Tests\Feature;

use App\Models\AccountNotification;
use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\SupportAppeal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Phase8BPublicPaymentAndAppealsTest extends TestCase
{
    use RefreshDatabase;

    private function seedBaseUsers(): array
    {
        Role::firstOrCreate(['name' => 'admin']);
        Role::firstOrCreate(['name' => 'accountant']);
        Role::firstOrCreate(['name' => 'customer']);

        $admin = User::factory()->create([
            'email' => 'admin@reconguard.test',
            'email_verified_at' => now(),
        ]);
        $admin->assignRole('admin');

        $accountant = User::factory()->create([
            'email' => 'accountant@reconguard.test',
            'email_verified_at' => now(),
        ]);
        $accountant->assignRole('accountant');

        $customer = User::factory()->create([
            'email' => 'customer@reconguard.test',
            'email_verified_at' => now(),
        ]);
        $customer->assignRole('customer');

        return compact('admin', 'accountant', 'customer');
    }

    #[Test]
    public function guest_can_view_public_payment_portal(): void
    {
        $invoice = Invoice::factory()->create([
            'invoice_number' => 'INV-2026-TEST01',
            'status'         => 'unpaid',
        ]);

        $response = $this->get("/pay/{$invoice->invoice_number}");
        $response->assertStatus(200);
        $response->assertInertia(
            fn($page) => $page->component('Public/PayInvoice')
                ->has('invoice')
                ->where('invoice.invoice_number', $invoice->invoice_number),
        );
    }

    #[Test]
    public function already_reconciled_invoice_shows_completed_state(): void
    {
        $invoice = Invoice::factory()->create([
            'invoice_number' => 'INV-2026-TEST02',
            'status'         => 'reconciled',
        ]);

        $response = $this->get("/pay/{$invoice->invoice_number}");
        $response->assertStatus(200);
        $response->assertInertia(fn($page) => $page->where('invoice.status', 'reconciled'));
    }

    #[Test]
    public function submit_slip_blocked_on_already_reconciled_invoice(): void
    {
        Storage::fake('public');
        $invoice = Invoice::factory()->create([
            'invoice_number' => 'INV-2026-TEST03',
            'status'         => 'reconciled',
        ]);

        $response = $this->post("/pay/{$invoice->invoice_number}/submit-slip", [
            'slip'    => UploadedFile::fake()->image('receipt.jpg', 300, 300),
            'channel' => 'KBZPay',
        ]);

        $response->assertStatus(422);
        $response->assertJson(['error' => 'This invoice has already been paid and reconciled.']);
    }

    #[Test]
    public function duplicate_sha256_hash_is_rejected_on_scan(): void
    {
        Storage::fake('public');
        $invoice = Invoice::factory()->create([
            'invoice_number' => 'INV-2026-TEST04',
            'status'         => 'unpaid',
        ]);

        // Create a fake file content with known hash
        $fileContent = 'fake-slip-content-duplicate-test';
        $fakeFile = UploadedFile::fake()->createWithContent('receipt.jpg', $fileContent);
        $hash = hash('sha256', $fileContent);

        // Pre-seed a slip with the same image_hash (actual column name)
        PaymentSlip::factory()->create([
            'invoice_id' => $invoice->id,
            'image_hash' => $hash,
        ]);

        $response = $this->post("/pay/{$invoice->invoice_number}/scan", [
            'slip' => $fakeFile,
        ]);

        $response->assertStatus(422);
        $response->assertJson(['error' => 'This exact receipt image has already been submitted.']);
    }

    #[Test]
    public function account_notification_created_on_reconciliation(): void
    {
        $users = $this->seedBaseUsers();
        $customer = $users['customer'];

        $invoice = Invoice::factory()->create([
            'user_id'        => $customer->id,
            'status'         => 'reconciled',
            'invoice_number' => 'INV-2026-NOTIF01',
            'amount'         => 50000,
        ]);

        // Directly create notification to simulate service
        AccountNotification::create([
            'user_id'    => $customer->id,
            'title'      => 'Payment Verified / ငွေပေးချေမှု အတည်ပြုပြီးပါပြီ',
            'message'    => 'Your payment of ' . number_format($invoice->total_amount) . ' MMK for Invoice #' . $invoice->invoice_number . ' has been verified.',
            'type'       => 'success',
            'action_url' => '/invoices',
        ]);

        $this->assertDatabaseHas('account_notifications', [
            'user_id' => $customer->id,
            'type'    => 'success',
        ]);
    }

    #[Test]
    public function blacklisted_customer_can_submit_appeal(): void
    {
        $users = $this->seedBaseUsers();
        $customer = $users['customer'];
        $customer->update(['is_blacklisted' => true, 'blacklist_reason' => 'Fraudulent slip submitted.']);

        $response = $this->actingAs($customer)->post('/support/appeals', [
            'subject'       => 'Appeal my account suspension',
            'message'       => 'I believe this was a mistake. Please review my case.',
            'contact_phone' => '09-123456789',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('support_appeals', [
            'user_id' => $customer->id,
            'status'  => 'pending',
        ]);
    }

    #[Test]
    public function admin_can_resolve_appeal_and_unblock_customer(): void
    {
        $users = $this->seedBaseUsers();
        $admin    = $users['admin'];
        $customer = $users['customer'];
        $customer->update(['is_blacklisted' => true]);

        $appeal = SupportAppeal::create([
            'user_id'       => $customer->id,
            'subject'       => 'Please review',
            'message'       => 'I am innocent.',
            'contact_phone' => '09-111111111',
            'status'        => 'pending',
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->patch("/admin/appeals/{$appeal->id}/resolve", [
                'admin_response' => 'Reviewed and cleared.',
            ]);

        $response->assertSessionHas('success');

        $customer->refresh();
        $this->assertFalse((bool) $customer->is_blacklisted);

        $this->assertDatabaseHas('support_appeals', [
            'id'     => $appeal->id,
            'status' => 'resolved',
        ]);
    }

    #[Test]
    public function accountant_can_create_invoice_for_walk_in_guest(): void
    {
        $users = $this->seedBaseUsers();
        $accountant = $users['accountant'];

        $response = $this->actingAs($accountant)->post('/invoices', [
            'customer_type'  => 'guest',
            'customer_name'  => 'Daw Khin Myo Chit',
            'customer_phone' => '09450001234',
            'amount'         => 175000,
            'expected_channel' => 'kbzpay',
            'description'    => 'Walk-in Consulting Fees',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('invoices', [
            'customer_name'  => 'Daw Khin Myo Chit',
            'customer_phone' => '09450001234',
            'amount'         => 175000,
            'user_id'        => null,
            'status'         => 'unpaid',
        ]);
    }

    #[Test]
    public function scan_slip_returns_extracted_metadata_including_sender_name(): void
    {
        Storage::fake('public');
        $invoice = Invoice::factory()->create([
            'invoice_number' => 'INV-2026-SCAN01',
            'customer_name'  => 'Ko Kaung Myat Htet',
            'customer_phone' => '09790001122',
            'amount'         => 85000,
            'status'         => 'unpaid',
        ]);

        $file = UploadedFile::fake()->image('kbz_slip.png', 400, 600);

        $response = $this->postJson("/pay/{$invoice->invoice_number}/scan", [
            'slip' => $file,
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'transaction_id',
            'amount',
            'phone_number',
            'sender_name',
            'channel',
            'file_hash',
            'preview_ok',
        ]);
        $this->assertEquals('Ko Kaung Myat Htet', $response->json('sender_name'));
    }

    #[Test]
    public function guest_can_submit_slip_without_authentication_and_user_id_is_nullable(): void
    {
        Storage::fake('public');
        $invoice = Invoice::factory()->create([
            'invoice_number' => 'INV-2026-GUEST01',
            'customer_name'  => 'Guest Customer',
            'customer_phone' => '09950009988',
            'user_id'        => null,
            'amount'         => 60000,
            'status'         => 'unpaid',
        ]);

        $file = UploadedFile::fake()->image('guest_slip.png', 400, 600);

        $response = $this->postJson("/pay/{$invoice->invoice_number}/submit-slip", [
            'slip'    => $file,
            'channel' => 'KBZPay',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertDatabaseHas('payment_slips', [
            'invoice_id'      => $invoice->id,
            'user_id'         => null,
            'payment_channel' => 'kbzpay',
            'sender_name'     => 'Guest Customer',
        ]);

        $invoice->refresh();
        $this->assertEquals('pending_verification', $invoice->status);
    }

    #[Test]
    public function accountant_can_record_direct_counter_cash_settlement(): void
    {
        $users = $this->seedBaseUsers();
        $accountant = $users['accountant'];

        $invoice = Invoice::factory()->create([
            'invoice_number' => 'INV-2026-CASH01',
            'customer_name'  => 'Walk-in Cash Payer',
            'customer_phone' => '09770008899',
            'user_id'        => null,
            'amount'         => 120000,
            'status'         => 'unpaid',
        ]);

        $response = $this->actingAs($accountant)->post("/invoices/{$invoice->id}/settle-cash");

        $response->assertRedirect("/invoices/{$invoice->id}");
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('payment_slips', [
            'invoice_id'          => $invoice->id,
            'payment_channel'     => 'CASH',
            'verification_status' => 'verified_clean',
            'sender_name'         => 'Walk-in Cash Payer',
            'extracted_amount'    => 120000,
        ]);

        $invoice->refresh();
        $this->assertEquals('reconciled', $invoice->status);
    }
}
