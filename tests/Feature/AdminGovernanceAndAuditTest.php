<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\ReconciliationMatch;
use App\Models\SystemSetting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminGovernanceAndAuditTest extends TestCase
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
            'email' => 'chief_auditor@reconguard.local',
        ]);
        $this->admin->assignRole('admin');

        $this->accountant = User::factory()->create([
            'email' => 'accountant_gov@reconguard.local',
        ]);
        $this->accountant->assignRole('accountant');

        $this->customer = User::factory()->create([
            'email' => 'customer_gov@reconguard.local',
            'phone' => '09250000001',
        ]);
        $this->customer->assignRole('customer');

        SystemSetting::set('admin_panel_passcode', Hash::make('admin1234'));
    }

    public function test_unverified_admin_is_redirected_to_gate(): void
    {
        $response = $this->actingAs($this->admin)->get('/admin/governance');
        $response->assertRedirect('/admin/gate');
    }

    public function test_admin_can_unlock_gate_with_correct_passcode(): void
    {
        $response = $this->actingAs($this->admin)->post('/admin/gate', [
            'passcode' => 'admin1234',
        ]);

        $response->assertRedirect('/admin/governance');
        $this->assertTrue(session('admin_passcode_verified'));
    }

    public function test_admin_gate_rejects_incorrect_passcode(): void
    {
        $response = $this->actingAs($this->admin)->post('/admin/gate', [
            'passcode' => 'wrongpasscode',
        ]);

        $response->assertSessionHasErrors(['passcode']);
        $this->assertNotTrue(session('admin_passcode_verified'));
    }

    public function test_verified_admin_can_access_governance_dashboard(): void
    {
        $response = $this->actingAs($this->admin)
            ->withSession(['admin_passcode_verified' => true])
            ->get('/admin/governance');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Dashboard')
            ->has('kpis')
            ->has('donutStats')
            ->has('channelStats')
        );
    }

    public function test_verified_admin_can_access_blacklist_management_center(): void
    {
        $response = $this->actingAs($this->admin)
            ->withSession(['admin_passcode_verified' => true])
            ->get('/admin/blacklist');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Blacklist')
            ->has('blacklistedUsers')
            ->has('recentFraudMatches')
            ->has('customers')
            ->has('appeals')
        );
    }

    public function test_admin_can_update_security_passcode(): void
    {
        $response = $this->actingAs($this->admin)
            ->withSession(['admin_passcode_verified' => true])
            ->patch('/admin/passcode', [
                'current_passcode' => 'admin1234',
                'new_passcode' => 'supersecret2026',
            ]);

        $response->assertSessionHas('success');
        $newHashed = SystemSetting::get('admin_panel_passcode');
        $this->assertTrue(Hash::check('supersecret2026', $newHashed));
    }

    public function test_admin_can_toggle_blacklist_status_of_user(): void
    {
        // 1. Blacklist user
        $response = $this->actingAs($this->admin)
            ->withSession(['admin_passcode_verified' => true])
            ->post("/admin/blacklist/{$this->customer->id}", [
                'is_blacklisted' => true,
                'reason' => 'Repeated fraudulent slip uploads with Photoshop metadata.',
            ]);

        $response->assertSessionHas('success');
        $this->customer->refresh();
        $this->assertTrue($this->customer->is_blacklisted);
        $this->assertEquals('Repeated fraudulent slip uploads with Photoshop metadata.', $this->customer->blacklist_reason);

        // 2. Un-blacklist user
        $responseUnblock = $this->actingAs($this->admin)
            ->withSession(['admin_passcode_verified' => true])
            ->post("/admin/blacklist/{$this->customer->id}", [
                'is_blacklisted' => false,
            ]);

        $responseUnblock->assertSessionHas('success');
        $this->customer->refresh();
        $this->assertFalse($this->customer->is_blacklisted);
        $this->assertNull($this->customer->blacklist_reason);
    }

    public function test_accountant_can_access_audit_report_without_gate(): void
    {
        $response = $this->actingAs($this->accountant)->get('/admin/audit-report');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/AuditReport')
            ->has('records')
            ->has('summary')
            ->where('can_export_pdf', false)
        );
    }

    public function test_blacklist_and_unblock_dispatches_notifications(): void
    {
        // 1. Blacklist
        $this->actingAs($this->admin)
            ->withSession(['admin_passcode_verified' => true])
            ->post("/admin/blacklist/{$this->customer->id}", [
                'is_blacklisted' => true,
                'reason' => 'Multiple counterfeit slips detected.',
            ]);

        $this->assertDatabaseHas('account_notifications', [
            'user_id' => $this->customer->id,
            'type' => 'security_restriction',
            'title' => 'Account Restricted by Compliance',
        ]);

        // 2. Unblock
        $this->actingAs($this->admin)
            ->withSession(['admin_passcode_verified' => true])
            ->post("/admin/blacklist/{$this->customer->id}", [
                'is_blacklisted' => false,
            ]);

        $this->assertDatabaseHas('account_notifications', [
            'user_id' => $this->customer->id,
            'type' => 'account_restored',
            'title' => 'Account Restored',
        ]);
    }

    public function test_customer_can_submit_appeal_and_admin_can_resolve(): void
    {
        $this->customer->update([
            'is_blacklisted' => true,
            'blacklist_reason' => 'Account flagged for verification.',
        ]);

        // 1. Customer submits appeal
        $appealResponse = $this->actingAs($this->customer)->post('/support/appeals', [
            'subject' => 'Requesting account review for legitimate payment',
            'message' => 'I have verified with my KBZPay branch and provided official slip confirmation.',
        ]);

        $appealResponse->assertSessionHas('success');

        $this->assertDatabaseHas('support_appeals', [
            'user_id' => $this->customer->id,
            'subject' => 'Requesting account review for legitimate payment',
            'status' => 'pending',
        ]);

        $appeal = \App\Models\SupportAppeal::where('user_id', $this->customer->id)->first();

        // 2. Admin resolves appeal and unblocks customer
        $resolveResponse = $this->actingAs($this->admin)
            ->withSession(['admin_passcode_verified' => true])
            ->post("/admin/appeals/{$appeal->id}/resolve", [
                'admin_response' => 'Appeal reviewed and approved. Bank branch verified transaction.',
            ]);

        $resolveResponse->assertSessionHas('success');

        $appeal->refresh();
        $this->assertEquals('resolved', $appeal->status);
        $this->assertEquals('Appeal reviewed and approved. Bank branch verified transaction.', $appeal->admin_response);

        $this->customer->refresh();
        $this->assertFalse($this->customer->is_blacklisted);
    }

    public function test_customer_can_mark_notifications_as_read(): void
    {
        \App\Models\AccountNotification::create([
            'user_id' => $this->customer->id,
            'type' => 'security_restriction',
            'title' => 'Account Restricted by Compliance',
            'message' => 'Your account was suspended.',
            'read_at' => null,
        ]);

        $response = $this->actingAs($this->customer)->post('/notifications/mark-read');
        $response->assertSessionHas('success');

        $this->assertEquals(0, \App\Models\AccountNotification::where('user_id', $this->customer->id)->whereNull('read_at')->count());
    }

    public function test_blacklisted_customer_blocked_from_submitting_slips(): void
    {
        $this->customer->update([
            'is_blacklisted' => true,
            'blacklist_reason' => 'Suspected synthetic fraud account.',
        ]);

        $invoice = Invoice::create([
            'invoice_number' => 'INV-2026-BL-001',
            'user_id' => $this->customer->id,
            'customer_name' => $this->customer->name,
            'customer_phone' => '09250000001',
            'description' => 'Blacklist test order',
            'amount' => 100000.00,
            'expected_channel' => 'kbzpay',
            'status' => 'unpaid',
            'due_date' => Carbon::now()->addDays(3)->toDateString(),
        ]);

        $fakeFile = UploadedFile::fake()->image('test_slip.png');

        $response = $this->actingAs($this->customer)->post("/invoices/{$invoice->id}/submit-slip", [
            'payment_slip' => $fakeFile,
            'payment_channel' => 'kbzpay',
            'transaction_id' => '01009999999999999999',
            'amount' => 100000.00,
        ]);

        $response->assertStatus(403);
        $response->assertInertia(fn ($page) => $page
            ->component('Errors/AccountSuspended')
            ->has('blacklist_reason')
        );
    }

    public function test_audit_report_generation_endpoint_returns_valid_data(): void
    {
        ReconciliationMatch::create([
            'match_type' => 'exact_match',
            'confidence_score' => 100.00,
            'invoice_amount' => 500000.00,
            'slip_amount' => 500000.00,
            'bank_amount' => 500000.00,
            'variance_amount' => 0.00,
            'status' => 'auto_approved',
            'notes' => 'Test certified match',
        ]);

        $response = $this->actingAs($this->admin)->get('/admin/audit-report');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/AuditReport')
            ->has('records')
            ->has('summary')
            ->has('filters')
            ->where('can_export_pdf', true)
        );
    }
}
