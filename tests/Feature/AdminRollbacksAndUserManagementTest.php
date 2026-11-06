<?php

namespace Tests\Feature;

use App\Models\AccountNotification;
use App\Models\BankStatementBatch;
use App\Models\BankTransaction;
use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\SupportAppeal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminRollbacksAndUserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function seedBaseUsers(): array
    {
        Role::firstOrCreate(['name' => 'admin']);
        Role::firstOrCreate(['name' => 'accountant']);
        Role::firstOrCreate(['name' => 'customer']);

        $admin = User::factory()->create([
            'name' => 'Chief Auditor Admin',
            'email' => 'admin@reconguard.test',
            'email_verified_at' => now(),
        ]);
        $admin->assignRole('admin');

        $accountant = User::factory()->create([
            'name' => 'Senior Accountant',
            'email' => 'accountant@reconguard.test',
            'email_verified_at' => now(),
        ]);
        $accountant->assignRole('accountant');

        $customer = User::factory()->create([
            'name' => 'Merchant Customer',
            'email' => 'customer@reconguard.test',
            'email_verified_at' => now(),
        ]);
        $customer->assignRole('customer');

        return compact('admin', 'accountant', 'customer');
    }

    #[Test]
    public function accountant_rollback_request_notifies_chief_auditors(): void
    {
        $users = $this->seedBaseUsers();
        $accountant = $users['accountant'];
        $admin = $users['admin'];

        $batch = BankStatementBatch::create([
            'uploaded_by' => $accountant->id,
            'payment_channel' => 'kbzpay',
            'original_filename' => 'KBZ_Statement_Nov2026.csv',
            'statement_date' => now()->toDateString(),
            'total_records' => 5,
            'total_credit_amount' => 500000.00,
            'status' => 'processed',
        ]);

        $response = $this->actingAs($accountant)->post("/bank-statements/{$batch->id}/request-rollback", [
            'reason' => 'Accidental duplicate file ingested',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $batch->refresh();
        $this->assertTrue((bool) $batch->rollback_requested);
        $this->assertEquals('Accidental duplicate file ingested', $batch->rollback_reason);

        // Verify notification dispatched to admin
        $this->assertDatabaseHas('account_notifications', [
            'user_id' => $admin->id,
            'type' => 'warning',
            'action_url' => '/admin/rollbacks',
        ]);
    }

    #[Test]
    public function customer_compliance_appeal_notifies_chief_auditors(): void
    {
        $users = $this->seedBaseUsers();
        $customer = $users['customer'];
        $admin = $users['admin'];
        $customer->update(['is_blacklisted' => true]);

        $response = $this->actingAs($customer)->post('/support/appeals', [
            'subject' => 'Dispute Wrongful Suspension',
            'message' => 'Please re-verify transaction #KBZ9948123.',
            'contact_phone' => '09770001122',
        ]);

        $response->assertRedirect();

        // Verify notification dispatched to admin
        $this->assertDatabaseHas('account_notifications', [
            'user_id' => $admin->id,
            'type' => 'info',
            'action_url' => '/admin/blacklist',
        ]);
    }

    #[Test]
    public function admin_can_view_pending_rollbacks_queue(): void
    {
        $users = $this->seedBaseUsers();
        $admin = $users['admin'];
        $accountant = $users['accountant'];

        $batch = BankStatementBatch::create([
            'uploaded_by' => $accountant->id,
            'payment_channel' => 'wavepay',
            'original_filename' => 'Wave_Corrupt_Nov.csv',
            'statement_date' => now()->toDateString(),
            'total_records' => 10,
            'total_credit_amount' => 750000.00,
            'status' => 'processed',
            'rollback_requested' => true,
            'rollback_reason' => 'Wrong account statement export',
            'rollback_requested_at' => now(),
            'rollback_requested_by' => $accountant->id,
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->get('/admin/rollbacks');

        $response->assertStatus(200);
        $response->assertInertia(
            fn($page) => $page->component('Admin/Rollbacks')
                ->has('pendingBatches', 1)
                ->where('pendingBatches.0.id', $batch->id)
                ->has('stats')
        );
    }

    #[Test]
    public function admin_can_approve_and_purge_rollback_batch(): void
    {
        $users = $this->seedBaseUsers();
        $admin = $users['admin'];
        $accountant = $users['accountant'];

        $batch = BankStatementBatch::create([
            'uploaded_by' => $accountant->id,
            'payment_channel' => 'cbpay',
            'original_filename' => 'CB_Purge_Test.csv',
            'statement_date' => now()->toDateString(),
            'total_records' => 1,
            'total_credit_amount' => 100000.00,
            'status' => 'processed',
            'rollback_requested' => true,
            'rollback_reason' => 'Duplicate upload',
            'rollback_requested_at' => now(),
            'rollback_requested_by' => $accountant->id,
        ]);

        BankTransaction::create([
            'batch_id' => $batch->id,
            'payment_channel' => 'cbpay',
            'bank_transaction_id' => 'CB-TEST-001',
            'transaction_datetime' => now(),
            'gross_amount' => 100000.00,
            'fee_amount' => 0.00,
            'net_amount' => 100000.00,
            'match_status' => 'unmatched',
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->delete("/admin/rollbacks/{$batch->id}/approve");

        $response->assertRedirect('/admin/rollbacks');
        $response->assertSessionHas('success');

        $this->assertDatabaseMissing('bank_statement_batches', ['id' => $batch->id]);
        $this->assertDatabaseMissing('bank_transactions', ['bank_transaction_id' => 'CB-TEST-001']);

        // Requester notified of approval
        $this->assertDatabaseHas('account_notifications', [
            'user_id' => $accountant->id,
            'type' => 'success',
        ]);
    }

    #[Test]
    public function admin_can_dismiss_rollback_request(): void
    {
        $users = $this->seedBaseUsers();
        $admin = $users['admin'];
        $accountant = $users['accountant'];

        $batch = BankStatementBatch::create([
            'uploaded_by' => $accountant->id,
            'payment_channel' => 'ayapay',
            'original_filename' => 'AYA_Valid_Statement.csv',
            'statement_date' => now()->toDateString(),
            'total_records' => 3,
            'total_credit_amount' => 300000.00,
            'status' => 'processed',
            'rollback_requested' => true,
            'rollback_reason' => 'Mistaken request',
            'rollback_requested_at' => now(),
            'rollback_requested_by' => $accountant->id,
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->patch("/admin/rollbacks/{$batch->id}/dismiss");

        $response->assertRedirect('/admin/rollbacks');
        $response->assertSessionHas('success');

        $batch->refresh();
        $this->assertFalse((bool) $batch->rollback_requested);
        $this->assertNull($batch->rollback_reason);

        // Requester notified of dismissal
        $this->assertDatabaseHas('account_notifications', [
            'user_id' => $accountant->id,
            'type' => 'info',
        ]);
    }

    #[Test]
    public function admin_can_view_staff_and_user_management(): void
    {
        $users = $this->seedBaseUsers();
        $admin = $users['admin'];

        $response = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->get('/admin/users');

        $response->assertStatus(200);
        $response->assertInertia(
            fn($page) => $page->component('Admin/Users/Index')
                ->has('users.data')
                ->has('stats')
        );
    }

    #[Test]
    public function admin_can_create_new_senior_accountant(): void
    {
        $users = $this->seedBaseUsers();
        $admin = $users['admin'];

        $response = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->post('/admin/users', [
                'name' => 'Daw Thida Win',
                'email' => 'thida.win@reconguard.test',
                'phone' => '09450008899',
                'nrc_number' => '12/DAGAMA(N)112233',
                'password' => 'SecurePass2026!',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $newAccountant = User::where('email', 'thida.win@reconguard.test')->first();
        $this->assertNotNull($newAccountant);
        $this->assertTrue($newAccountant->hasRole('accountant'));
        $this->assertEquals('12/DAGAMA(N)112233', $newAccountant->nrc_number);
    }

    #[Test]
    public function admin_can_inspect_user_financial_profile(): void
    {
        $users = $this->seedBaseUsers();
        $admin = $users['admin'];
        $customer = $users['customer'];

        $invoice = Invoice::create([
            'invoice_number' => 'INV-2026-INSPECT01',
            'user_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'amount' => 45000.00,
            'expected_channel' => 'kbzpay',
            'status' => 'reconciled',
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->getJson("/admin/users/{$customer->id}");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'user' => ['id', 'name', 'email', 'phone', 'nrc_number', 'roles'],
            'financials' => ['total_invoiced_mmk', 'total_paid_mmk', 'invoices_count'],
            'invoices',
            'paymentSlips',
            'appeals',
        ]);
        $this->assertEquals($customer->id, $response->json('user.id'));
    }

    #[Test]
    public function non_admin_cannot_access_rollbacks_or_user_management(): void
    {
        $users = $this->seedBaseUsers();
        $accountant = $users['accountant'];

        $res1 = $this->actingAs($accountant)->get('/admin/rollbacks');
        $res1->assertStatus(403);

        $res2 = $this->actingAs($accountant)->get('/admin/users');
        $res2->assertStatus(403);
    }
}
