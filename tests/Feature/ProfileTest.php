<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated_with_mandatory_fields(): void
    {
        $user = User::factory()->create([
            'phone' => '+959790000001',
            'nrc_number' => '12/MAGANA(N)111222',
            'address' => 'Old Address, Yangon',
            'emergency_contact' => '+959790000099',
        ]);

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Updated Auditor Name',
                'email' => 'updated_auditor@reconguard.test',
                'phone' => '+959790000088',
                'nrc_number' => '12/MAGANA(N)999888',
                'address' => 'New Financial Center, Sule Pagoda Road, Yangon',
                'emergency_contact' => '+959790000077',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertSame('Updated Auditor Name', $user->name);
        $this->assertSame('updated_auditor@reconguard.test', $user->email);
        $this->assertSame('+959790000088', $user->phone);
        $this->assertSame('12/MAGANA(N)999888', $user->nrc_number);
        $this->assertSame('New Financial Center, Sule Pagoda Road, Yangon', $user->address);
        $this->assertSame('+959790000077', $user->emergency_contact);
        $this->assertNull($user->email_verified_at);
    }

    public function test_mandatory_profile_fields_are_strictly_validated(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => '',
                'email' => 'invalid-email',
                'phone' => '',
                'nrc_number' => '',
                'address' => '',
                'emergency_contact' => '',
            ]);

        $response->assertSessionHasErrors([
            'name',
            'email',
            'phone',
            'nrc_number',
            'address',
            'emergency_contact',
        ]);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged(): void
    {
        $user = User::factory()->create([
            'phone' => '+959790000001',
            'nrc_number' => '12/MAGANA(N)111222',
            'address' => 'Old Address, Yangon',
            'emergency_contact' => '+959790000099',
        ]);

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => $user->email,
                'phone' => '+959790000001',
                'nrc_number' => '12/MAGANA(N)111222',
                'address' => 'Old Address, Yangon',
                'emergency_contact' => '+959790000099',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_profile_deletion_endpoint_is_permanently_removed_for_audit_immutability(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete('/profile', [
                'password' => 'password',
            ]);

        // Route does not exist: returns 405 Method Not Allowed or 404
        $this->assertTrue(in_array($response->getStatusCode(), [404, 405]));
        $this->assertNotNull($user->fresh());
    }

    public function test_user_can_upload_profile_avatar(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');

        $user = User::factory()->create();

        $file = \Illuminate\Http\UploadedFile::fake()->image('avatar.jpg', 200, 200);

        $response = $this
            ->actingAs($user)
            ->post('/profile/avatar', [
                'avatar' => $file,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertNotNull($user->avatar_path);
        \Illuminate\Support\Facades\Storage::disk('public')->assertExists($user->avatar_path);
    }

    public function test_user_can_remove_profile_avatar(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');

        $user = User::factory()->create([
            'avatar_path' => 'avatars/existing_avatar.jpg',
        ]);
        \Illuminate\Support\Facades\Storage::disk('public')->put('avatars/existing_avatar.jpg', 'fake-image-content');

        $response = $this
            ->actingAs($user)
            ->delete('/profile/avatar');

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertNull($user->avatar_path);
        \Illuminate\Support\Facades\Storage::disk('public')->assertMissing('avatars/existing_avatar.jpg');
    }
}
