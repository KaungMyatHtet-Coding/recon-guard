<?php

namespace Tests\Feature;

use App\Models\AccountNotification;
use App\Models\BankStatementBatch;
use App\Models\BankTransaction;
use App\Models\Blacklist;
use App\Models\BlacklistRecommendation;
use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\ReconciliationMatch;
use App\Models\SupportAppeal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Phase8B2GovernanceAndFilteringTest extends TestCase
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
            'phone' => '09111111111',
            'nrc_number' => '12/KAMAYA(N)111111',
        ]);
        $admin->assignRole('admin');

        $accountant = User::factory()->create([
            'name' => 'Senior Accountant',
            'email' => 'accountant@reconguard.test',
            'email_verified_at' => now(),
            'phone' => '09222222222',
            'nrc_number' => '12/KAMAYA(N)222222',
        ]);
        $accountant->assignRole('accountant');

        $customer = User::factory()->create([
            'name' => 'Customer Merchant',
            'email' => 'customer@reconguard.test',
            'email_verified_at' => now(),
            'phone' => '09333333333',
            'nrc_number' => '12/KAMAYA(N)333333',
        ]);
        $customer->assignRole('customer');

        return compact('admin', 'accountant', 'customer');
    }

    #[Test]
    public function default_date_scoping_defaults_to_this_month_and_excludes_past_months_by_default(): void
    {
        $users = $this->seedBaseUsers();
        $accountant = $users['accountant'];

        // Invoice from 3 months ago
        $pastInvoice = Invoice::factory()->create([
            'invoice_number' => 'INV-PAST-001',
            'customer_name' => 'Past Customer',
            'customer_phone' => '09990001111',
            'created_at' => now()->subMonths(3),
        ]);

        // Invoice from this month
        $currentInvoice = Invoice::factory()->create([
            'invoice_number' => 'INV-CURRENT-001',
            'customer_name' => 'Current Customer',
            'customer_phone' => '09990002222',
            'created_at' => now(),
        ]);

        // 1. Default request (no date parameters) -> scopes to this month
        $response = $this->actingAs($accountant)->get(route('invoices.index'));
        $response->assertStatus(200);
        $response->assertInertia(
            fn($page) => $page->component('Invoices/Index')
                ->where('isDefaultScope', true)
                ->where('filters.date_scope', 'this_month')
                ->has('invoices.data', 1)
                ->where('invoices.data.0.invoice_number', 'INV-CURRENT-001')
        );

        // 2. Explicit 'all' request -> includes past invoices
        $allResponse = $this->actingAs($accountant)->get(route('invoices.index', ['date_scope' => 'all']));
        $allResponse->assertStatus(200);
        $allResponse->assertInertia(
            fn($page) => $page->component('Invoices/Index')
                ->where('isDefaultScope', false)
                ->where('filters.date_scope', 'all')
                ->has('invoices.data', 2)
        );
    }

    #[Test]
    public function interactive_custom_date_filtering_and_unified_search_work_on_invoices(): void
    {
        $users = $this->seedBaseUsers();
        $accountant = $users['accountant'];

        $inv1 = Invoice::factory()->create([
            'invoice_number' => 'INV-OCT-ALPHA',
            'customer_name' => 'U Thant Zin',
            'customer_phone' => '09444111222',
            'created_at' => '2026-10-15 10:00:00',
        ]);

        $inv2 = Invoice::factory()->create([
            'invoice_number' => 'INV-OCT-BETA',
            'customer_name' => 'Daw Mya Mya',
            'customer_phone' => '09555222333',
            'created_at' => '2026-10-25 14:00:00',
        ]);

        // Filter custom range
        $res = $this->actingAs($accountant)->get(route('invoices.index', [
            'start_date' => '2026-10-01',
            'end_date'   => '2026-10-20',
        ]));
        $res->assertStatus(200);
        $res->assertInertia(
            fn($page) => $page->component('Invoices/Index')
                ->has('invoices.data', 1)
                ->where('invoices.data.0.invoice_number', 'INV-OCT-ALPHA')
        );

        // Filter by unified search
        $searchRes = $this->actingAs($accountant)->get(route('invoices.index', [
            'date_scope' => 'all',
            'search'     => '09555222333',
        ]));
        $searchRes->assertStatus(200);
        $searchRes->assertInertia(
            fn($page) => $page->component('Invoices/Index')
                ->has('invoices.data', 1)
                ->where('invoices.data.0.invoice_number', 'INV-OCT-BETA')
        );
    }

    #[Test]
    public function accountant_can_recommend_blacklist_under_four_eyes_governance(): void
    {
        $users = $this->seedBaseUsers();
        $accountant = $users['accountant'];
        $admin = $users['admin'];
        $customer = $users['customer'];

        $invoice = Invoice::factory()->create([
            'customer_name'  => $customer->name,
            'customer_phone' => $customer->phone,
            'user_id'        => $customer->id,
        ]);

        $response = $this->actingAs($accountant)->post(route('reconciliation.recommend-blacklist'), [
            'target_user_id' => $customer->id,
            'customer_name'  => $customer->name,
            'customer_phone' => $customer->phone,
            'invoice_id'     => $invoice->id,
            'reason'         => 'Re-uploaded photoshopped KBZPay slip with altered amount font.',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Check recommendation table
        $this->assertDatabaseHas('blacklist_recommendations', [
            'recommended_by' => $accountant->id,
            'target_user_id' => $customer->id,
            'customer_phone' => $customer->phone,
            'status'         => 'pending',
        ]);

        // Check notification delivered to admin
        $this->assertDatabaseHas('account_notifications', [
            'user_id'    => $admin->id,
            'type'       => 'warning',
            'action_url' => '/admin/blacklist',
        ]);
    }

    #[Test]
    public function chief_auditor_can_approve_blacklist_recommendation_and_enforce_ban(): void
    {
        $users = $this->seedBaseUsers();
        $accountant = $users['accountant'];
        $admin = $users['admin'];
        $customer = $users['customer'];

        $rec = BlacklistRecommendation::create([
            'recommended_by' => $accountant->id,
            'target_user_id' => $customer->id,
            'customer_name'  => $customer->name,
            'customer_phone' => $customer->phone,
            'reason'         => 'Repeated forged slip submissions',
            'status'         => 'pending',
        ]);

        // Admin approves recommendation
        $approveRes = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->patch(route('admin.blacklist-recommendations.approve', $rec->id));

        $approveRes->assertRedirect();
        $approveRes->assertSessionHas('success');

        // Verify recommendation status updated
        $this->assertDatabaseHas('blacklist_recommendations', [
            'id'          => $rec->id,
            'status'      => 'approved',
            'reviewed_by' => $admin->id,
        ]);

        // Verify target user is blacklisted
        $this->assertDatabaseHas('users', [
            'id'             => $customer->id,
            'is_blacklisted' => true,
        ]);

        // Verify blacklist table entry
        $this->assertDatabaseHas('blacklists', [
            'phone_number' => $customer->phone,
        ]);

        // Verify recommending accountant got notification
        $this->assertDatabaseHas('account_notifications', [
            'user_id' => $accountant->id,
            'type'    => 'success',
        ]);

        // Verify that public payment portal now blocks this customer phone from guest payment with AccountSuspended page
        $guestInvoice = Invoice::factory()->create([
            'invoice_number' => 'INV-GUEST-TEST',
            'customer_phone' => $customer->phone,
            'status'         => 'unpaid',
        ]);

        $portalRes = $this->get("/pay/{$guestInvoice->invoice_number}");
        $portalRes->assertStatus(403);
        $portalRes->assertInertia(
            fn($page) => $page->component('Errors/AccountSuspended')
                ->where('blacklist_reason', 'Repeated forged slip submissions')
                ->where('hotline', '09-770001122, 09-990001122')
        );
    }

    #[Test]
    public function unregistered_guest_phone_is_blacklisted_blocked_on_portal_and_locks_slip_hash(): void
    {
        $users = $this->seedBaseUsers();
        $accountant = $users['accountant'];
        $admin = $users['admin'];

        $guestPhone = '09777888999';

        // 1. Accountant recommends blacklisting an unregistered guest customer
        $recRes = $this->actingAs($accountant)->post(route('reconciliation.recommend-blacklist'), [
            'target_user_id' => null,
            'customer_name'  => 'Suspicious Guest',
            'customer_phone' => $guestPhone,
            'reason'         => 'Repeatedly uploaded fraudulent photo-edited receipts.',
        ]);
        $recRes->assertRedirect();

        $recommendation = BlacklistRecommendation::where('customer_phone', $guestPhone)->first();
        $this->assertNotNull($recommendation);

        // 2. Chief Auditor approves recommendation under Four-Eyes principle
        $approveRes = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->patch(route('admin.blacklist-recommendations.approve', $recommendation->id));
        $approveRes->assertRedirect();

        // 3. Verify entry was created in `blacklists` table for the guest phone
        $this->assertDatabaseHas('blacklists', [
            'phone_number' => $guestPhone,
            'user_id'      => null,
        ]);
        $this->assertTrue(Blacklist::isPhoneOrUserBlacklisted($guestPhone));

        // 3.1 Verify Blacklist Management Center index includes this walk-in guest in unified blacklistedUsers
        $indexRes = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->get(route('admin.blacklist.index'));
        $indexRes->assertStatus(200);
        $indexRes->assertInertia(
            fn($page) => $page->component('Admin/Blacklist')
                ->has('blacklistedUsers', 1)
                ->where('blacklistedUsers.0.phone', $guestPhone)
                ->where('blacklistedUsers.0.name', 'Suspicious Guest')
                ->where('blacklistedUsers.0.type', 'Walk-in Guest')
        );

        // 4. Guest payment portal renders AccountSuspended page with 403
        $invoice = Invoice::factory()->create([
            'invoice_number' => 'INV-GUEST-SUSPENDED',
            'customer_phone' => $guestPhone,
            'status'         => 'unpaid',
            'amount'         => 150000,
        ]);

        $portalRes = $this->get("/pay/{$invoice->invoice_number}");
        $portalRes->assertStatus(403);
        $portalRes->assertInertia(
            fn($page) => $page->component('Errors/AccountSuspended')
                ->where('blacklist_reason', 'Repeatedly uploaded fraudulent photo-edited receipts.')
                ->where('hotline', '09-770001122, 09-990001122')
                ->where('email', 'disputes@reconguard.test')
        );

        // 5. Guest tries to scan slip via POST /pay/{invoice_number}/scan
        $fakeSlip = UploadedFile::fake()->image('kbz_fraud_slip.jpg', 600, 800);
        $fileHash = hash_file('sha256', $fakeSlip->getRealPath());

        $scanRes = $this->postJson("/pay/{$invoice->invoice_number}/scan", [
            'slip' => $fakeSlip,
        ]);

        $scanRes->assertStatus(403);
        $scanRes->assertJson([
            'error' => 'This phone number has been suspended due to compliance violations.',
        ]);

        // 6. Verify SHA-256 hash was permanently locked in payment_slips as tampered_fraud
        $this->assertDatabaseHas('payment_slips', [
            'image_hash'          => $fileHash,
            'verification_status' => 'tampered_fraud',
        ]);

        // 7. Subsequent attempt to upload the exact same slip image is blocked with 422 duplicate image lock
        $cleanInvoice = Invoice::factory()->create([
            'invoice_number' => 'INV-CLEAN-001',
            'customer_phone' => '09112233445',
            'status'         => 'unpaid',
        ]);

        $duplicateScanRes = $this->postJson("/pay/{$cleanInvoice->invoice_number}/scan", [
            'slip' => $fakeSlip,
        ]);

        $duplicateScanRes->assertStatus(422);
        $duplicateScanRes->assertJson([
            'error' => 'This exact receipt image has already been submitted.',
        ]);

        // 8. Chief Auditor resolves appeal, lifting the blacklist for this guest phone
        $appeal = SupportAppeal::create([
            'contact_phone' => $guestPhone,
            'subject'       => 'Mistaken Identity Appeal',
            'message'       => 'Please unblock my phone number.',
            'status'        => 'pending',
        ]);

        $appealRes = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->patch(route('admin.appeals.resolve.patch', $appeal->id), [
                'admin_response' => 'Verified innocent merchant; restriction cleared.',
            ]);
        $appealRes->assertRedirect();

        // 9. Verify phone is removed from `blacklists` table
        $this->assertDatabaseMissing('blacklists', [
            'phone_number' => $guestPhone,
        ]);
        $this->assertFalse(Blacklist::isPhoneOrUserBlacklisted($guestPhone));

        // 10. Guest can now access payment portal cleanly (200 OK)
        $unblockedPortalRes = $this->get("/pay/{$invoice->invoice_number}");
        $unblockedPortalRes->assertStatus(200);
        $unblockedPortalRes->assertInertia(
            fn($page) => $page->component('Public/PayInvoice')
                ->where('invoice.invoice_number', 'INV-GUEST-SUSPENDED')
        );
    }

    #[Test]
    public function chief_auditor_can_unblock_blacklist_entry_directly_from_registry(): void
    {
        $users = $this->seedBaseUsers();
        $admin = $users['admin'];

        $guestPhone = '09888999000';
        $blacklistEntry = Blacklist::create([
            'phone_number'   => $guestPhone,
            'reason'         => 'Suspect payment slip',
            'blacklisted_by' => $admin->id,
        ]);

        $this->assertTrue(Blacklist::isPhoneOrUserBlacklisted($guestPhone));

        // Chief auditor unblocks via DELETE /admin/blacklist/{blacklist}/unblock
        $unblockRes = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->delete(route('admin.blacklist.unblock', $blacklistEntry->id));

        $unblockRes->assertRedirect();
        $unblockRes->assertSessionHas('success');

        $this->assertDatabaseMissing('blacklists', [
            'id' => $blacklistEntry->id,
        ]);
        $this->assertFalse(Blacklist::isPhoneOrUserBlacklisted($guestPhone));
    }

    #[Test]
    public function chief_auditor_can_dismiss_blacklist_recommendation(): void
    {
        $users = $this->seedBaseUsers();
        $accountant = $users['accountant'];
        $admin = $users['admin'];

        $rec = BlacklistRecommendation::create([
            'recommended_by' => $accountant->id,
            'customer_name'  => 'Walk-in Guest Fraudster',
            'customer_phone' => '09888777666',
            'reason'         => 'Unverified slip image',
            'status'         => 'pending',
        ]);

        $dismissRes = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->patch(route('admin.blacklist-recommendations.dismiss', $rec->id));

        $dismissRes->assertRedirect();
        $dismissRes->assertSessionHas('success');

        $this->assertDatabaseHas('blacklist_recommendations', [
            'id'          => $rec->id,
            'status'      => 'rejected',
            'reviewed_by' => $admin->id,
        ]);

        // Verify accountant got info notification
        $this->assertDatabaseHas('account_notifications', [
            'user_id' => $accountant->id,
            'type'    => 'info',
        ]);
    }

    #[Test]
    public function chief_auditor_can_create_senior_accountant_via_staff_management(): void
    {
        $users = $this->seedBaseUsers();
        $admin = $users['admin'];
        $customer = $users['customer'];

        // Customer cannot access staff creation (403 forbidden)
        $unauthRes = $this->actingAs($customer)->post(route('admin.users.accountant.store'), [
            'name'     => 'Fake Staff',
            'email'    => 'fake@reconguard.test',
            'password' => 'Password123!',
            'role'     => 'accountant',
        ]);
        $unauthRes->assertStatus(403);

        // Admin creates a new Senior Accountant
        $createRes = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->post(route('admin.users.accountant.store'), [
                'name'                  => 'Daw Khin Khin Aye',
                'email'                 => 'khinkhin@reconguard.test',
                'phone'                 => '09876543210',
                'nrc_number'            => '12/BAHANA(N)998877',
                'company_name'          => 'ReconGuard Audit Division',
                'emergency_contact'     => '09112233445',
                'address'               => 'No. 45, Kabar Aye Pagoda Road, Yangon',
                'role'                  => 'accountant',
                'password'              => 'SeniorAccountant2026!',
                'password_confirmation' => 'SeniorAccountant2026!',
            ]);

        $createRes->assertRedirect();
        $createRes->assertSessionHas('success');

        $newUser = User::where('email', 'khinkhin@reconguard.test')->first();
        $this->assertNotNull($newUser);
        $this->assertTrue($newUser->hasRole('accountant'));
        $this->assertEquals('12/BAHANA(N)998877', $newUser->nrc_number);
    }

    #[Test]
    public function chief_auditor_can_approve_and_dismiss_bank_statement_batch_rollbacks(): void
    {
        $users = $this->seedBaseUsers();
        $admin = $users['admin'];
        $accountant = $users['accountant'];

        // 1. Test Rollback Approval (Purge batch)
        $batchToApprove = BankStatementBatch::create([
            'uploaded_by'           => $accountant->id,
            'payment_channel'       => 'kbzpay',
            'original_filename'     => 'Bad_Statement_Batch.csv',
            'statement_date'        => now()->toDateString(),
            'total_records'         => 5,
            'total_credit_amount'   => 120000.00,
            'status'                => 'processed',
            'rollback_requested'    => true,
            'rollback_reason'       => 'Duplicate CSV ingestion',
            'rollback_requested_at' => now(),
            'rollback_requested_by' => $accountant->id,
        ]);

        $tx = BankTransaction::create([
            'batch_id'             => $batchToApprove->id,
            'payment_channel'      => 'kbzpay',
            'bank_transaction_id'  => 'KBZ-TX-DEL-001',
            'transaction_datetime' => now(),
            'gross_amount'         => 120000.00,
            'fee_amount'           => 0,
            'net_amount'           => 120000.00,
            'match_status'         => 'unmatched',
        ]);

        $approveRes = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->delete(route('admin.rollbacks.approve', $batchToApprove->id));

        $approveRes->assertRedirect();
        $approveRes->assertSessionHas('success');

        $this->assertDatabaseMissing('bank_statement_batches', ['id' => $batchToApprove->id]);
        $this->assertDatabaseMissing('bank_transactions', ['id' => $tx->id]);

        // 2. Test Rollback Dismissal
        $batchToDismiss = BankStatementBatch::create([
            'uploaded_by'           => $accountant->id,
            'payment_channel'       => 'wavepay',
            'original_filename'     => 'Valid_Statement_Batch.csv',
            'statement_date'        => now()->toDateString(),
            'total_records'         => 2,
            'total_credit_amount'   => 50000.00,
            'status'                => 'processed',
            'rollback_requested'    => true,
            'rollback_reason'       => 'Mistaken request by junior',
            'rollback_requested_at' => now(),
            'rollback_requested_by' => $accountant->id,
        ]);

        $dismissRes = $this->actingAs($admin)
            ->withSession(['admin_passcode_verified' => true])
            ->patch(route('admin.rollbacks.dismiss', $batchToDismiss->id));

        $dismissRes->assertRedirect();
        $dismissRes->assertSessionHas('success');

        $this->assertDatabaseHas('bank_statement_batches', [
            'id'                 => $batchToDismiss->id,
            'rollback_requested' => false,
            'rollback_reason'    => null,
        ]);
    }

    #[Test]
    public function audit_report_uses_unified_date_scoping_defaulting_to_this_month(): void
    {
        $users = $this->seedBaseUsers();
        $admin = $users['admin'];

        // Past match from 2 months ago
        $pastInvoice = Invoice::factory()->create([
            'invoice_number' => 'INV-AUDIT-PAST',
            'amount' => 150000.00,
        ]);
        $pastMatch = ReconciliationMatch::create([
            'invoice_id' => $pastInvoice->id,
            'match_type' => 'exact_match',
            'confidence_score' => 100,
            'invoice_amount' => 150000.00,
            'slip_amount' => 150000.00,
            'bank_amount' => 150000.00,
            'variance_amount' => 0.00,
            'status' => 'auto_approved',
        ]);
        $pastMatch->timestamps = false;
        $pastMatch->created_at = now()->subMonths(2);
        $pastMatch->save();

        // Current match from this month
        $currInvoice = Invoice::factory()->create([
            'invoice_number' => 'INV-AUDIT-CURR',
            'amount' => 300000.00,
        ]);
        ReconciliationMatch::create([
            'invoice_id' => $currInvoice->id,
            'match_type' => 'fee_adjusted_match',
            'confidence_score' => 98,
            'invoice_amount' => 300000.00,
            'slip_amount' => 300000.00,
            'bank_amount' => 298000.00,
            'variance_amount' => 2000.00,
            'status' => 'approved_by_accountant',
            'created_at' => now(),
        ]);

        // 1. Default request (no date scope passed) -> scopes to 'this_month'
        $response = $this->actingAs($admin)->get(route('admin.audit-report'));
        $response->assertStatus(200);
        $response->assertInertia(
            fn($page) => $page->component('Admin/AuditReport')
                ->where('isDefaultScope', true)
                ->where('filters.date_scope', 'this_month')
                ->has('records', 1)
                ->where('records.0.invoice.invoice_number', 'INV-AUDIT-CURR')
                ->where('summary.total_records', 1)
                ->where('summary.matched_volume', 300000)
                ->where('summary.total_variance_fees', 2000)
                ->has('summary.audit_period')
        );

        // 2. Explicit 'all' request -> includes both records and recalculates KPIs
        $allResponse = $this->actingAs($admin)->get(route('admin.audit-report', ['date_scope' => 'all']));
        $allResponse->assertStatus(200);
        $allResponse->assertInertia(
            fn($page) => $page->component('Admin/AuditReport')
                ->where('isDefaultScope', false)
                ->where('filters.date_scope', 'all')
                ->has('records', 2)
                ->where('summary.total_records', 2)
                ->where('summary.matched_volume', 450000)
                ->where('summary.total_variance_fees', 2000)
        );
    }

    #[Test]
    public function audit_report_supports_status_channel_and_unified_search_filtering(): void
    {
        $users = $this->seedBaseUsers();
        $admin = $users['admin'];

        $inv1 = Invoice::factory()->create([
            'invoice_number'   => 'INV-KBZ-MATCH-01',
            'customer_name'    => 'Ko Min Min',
            'customer_phone'   => '09123456780',
            'amount'           => 100000.00,
            'expected_channel' => 'kbzpay',
        ]);
        $slip1 = PaymentSlip::create([
            'invoice_id'               => $inv1->id,
            'user_id'                  => $admin->id,
            'payment_channel'          => 'kbzpay',
            'image_path'               => 'payment_slips/test.png',
            'image_hash'               => 'hash_test_01',
            'extracted_transaction_id' => 'KBZ-TX-MATCH-01',
            'extracted_amount'         => 100000.00,
            'verification_status'      => 'verified_clean',
        ]);
        ReconciliationMatch::create([
            'invoice_id'       => $inv1->id,
            'payment_slip_id'  => $slip1->id,
            'match_type'       => 'exact_match',
            'confidence_score' => 100,
            'invoice_amount'   => 100000.00,
            'slip_amount'      => 100000.00,
            'bank_amount'      => 100000.00,
            'variance_amount'  => 0.00,
            'status'           => 'auto_approved',
            'created_at'       => now(),
        ]);

        $inv2 = Invoice::factory()->create([
            'invoice_number'   => 'INV-WAVE-FRAUD-02',
            'customer_name'    => 'Fake Scammer',
            'customer_phone'   => '09999888777',
            'amount'           => 500000.00,
            'expected_channel' => 'wavepay',
        ]);
        $slip2 = PaymentSlip::create([
            'invoice_id'               => $inv2->id,
            'user_id'                  => $admin->id,
            'payment_channel'          => 'wavepay',
            'image_path'               => 'payment_slips/test2.png',
            'image_hash'               => 'hash_test_02',
            'extracted_transaction_id' => 'WAVE-TX-TAMPER-02',
            'extracted_amount'         => 500000.00,
            'verification_status'      => 'tampered_fraud',
        ]);
        ReconciliationMatch::create([
            'invoice_id'       => $inv2->id,
            'payment_slip_id'  => $slip2->id,
            'match_type'       => 'amount_mismatch_fraud',
            'confidence_score' => 40,
            'invoice_amount'   => 500000.00,
            'slip_amount'      => 500000.00,
            'bank_amount'      => 200000.00,
            'variance_amount'  => 300000.00,
            'status'           => 'rejected_fraud',
            'created_at'       => now(),
        ]);

        // 1. Filter by Channel: kbzpay
        $channelRes = $this->actingAs($admin)->get(route('admin.audit-report', [
            'channel'    => 'kbzpay',
            'date_scope' => 'all',
        ]));
        $channelRes->assertStatus(200);
        $channelRes->assertInertia(
            fn($page) => $page->component('Admin/AuditReport')
                ->has('records', 1)
                ->where('records.0.invoice.invoice_number', 'INV-KBZ-MATCH-01')
        );

        // 2. Filter by Status: fraud
        $statusRes = $this->actingAs($admin)->get(route('admin.audit-report', [
            'status'     => 'fraud',
            'date_scope' => 'all',
        ]));
        $statusRes->assertStatus(200);
        $statusRes->assertInertia(
            fn($page) => $page->component('Admin/AuditReport')
                ->has('records', 1)
                ->where('records.0.invoice.invoice_number', 'INV-WAVE-FRAUD-02')
                ->where('summary.fraud_prevented', 300000)
        );

        // 3. Filter by Search: 'Fake Scammer'
        $searchRes = $this->actingAs($admin)->get(route('admin.audit-report', [
            'search'     => 'Fake Scammer',
            'date_scope' => 'all',
        ]));
        $searchRes->assertStatus(200);
        $searchRes->assertInertia(
            fn($page) => $page->component('Admin/AuditReport')
                ->has('records', 1)
                ->where('records.0.invoice.invoice_number', 'INV-WAVE-FRAUD-02')
        );
    }
}
