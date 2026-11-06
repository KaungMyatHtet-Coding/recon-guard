<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\ReconciliationMatch;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login(): void
    {
        $response = $this->get('/dashboard');

        $response->assertRedirect('/login');
    }

    public function test_admin_is_redirected_to_governance_suite(): void
    {
        $this->seed(DatabaseSeeder::class);

        $admin = User::where('email', 'admin@reconguard.test')->firstOrFail();

        $response = $this->actingAs($admin)->get('/dashboard');

        $response->assertRedirect(route('admin.dashboard'));
    }

    public function test_accountant_can_view_reconciliation_dashboard_with_metrics(): void
    {
        $this->seed(DatabaseSeeder::class);

        $accountant = User::where('email', 'accountant@reconguard.test')->firstOrFail();

        $response = $this->actingAs($accountant)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('metrics')
            ->has('recentMatches')
            ->where('userRole', 'accountant')
            ->where('metrics.total_invoices', fn ($count) => $count >= 0)
        );
    }

    public function test_customer_can_view_scoped_dashboard(): void
    {
        $this->seed(DatabaseSeeder::class);

        $customer = User::where('email', 'customer@reconguard.test')->firstOrFail();

        $response = $this->actingAs($customer)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('metrics')
            ->has('recentMatches')
            ->where('userRole', 'customer')
        );
    }
}
