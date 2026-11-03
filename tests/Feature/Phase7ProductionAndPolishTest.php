<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Phase7ProductionAndPolishTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'admin']);
        Role::firstOrCreate(['name' => 'accountant']);
        Role::firstOrCreate(['name' => 'customer']);
    }

    public function test_welcome_landing_page_renders_successfully(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Welcome')
        );
    }

    public function test_https_is_enforced_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        // Trigger AppServiceProvider boot
        (new \App\Providers\AppServiceProvider($this->app))->boot();

        $this->assertTrue(str_starts_with(url('/test'), 'https://'));
    }

    public function test_authenticated_layout_shares_necessary_props(): void
    {
        $user = User::factory()->create();
        $user->assignRole('customer');

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('auth.user')
            ->has('notifications')
            ->has('unread_notifications_count')
        );
    }
}
