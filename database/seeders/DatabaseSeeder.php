<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Clean Slate Architecture:
     * Seeds ONLY the 3 baseline administrative roles and accounts:
     * 1. Chief Auditor (Admin): admin@reconguard.test / password (passcode: admin1234)
     * 2. Senior Accountant: accountant@reconguard.test / password
     * 3. Registered Customer: customer@reconguard.test / password
     *
     * Starts with 0 invoices and 0 slips for end-to-end clean verification.
     */
    public function run(): void
    {
        // 1. Roles Setup
        $adminRole      = Role::firstOrCreate(['name' => 'admin']);
        $accountantRole = Role::firstOrCreate(['name' => 'accountant']);
        $customerRole   = Role::firstOrCreate(['name' => 'customer']);

        // 2. Core Baseline Account 1: Chief Auditor (Admin)
        $admin = User::firstOrCreate(
            ['email' => 'admin@reconguard.test'],
            [
                'name'              => 'Chief Auditor',
                'password'          => Hash::make('password'),
                'phone'             => '+959790000001',
                'nrc_number'        => '12/MAGANA(N)123456',
                'address'           => 'ReconGuard Headquarters, Sule Square, Yangon',
                'emergency_contact' => '+959790000099',
                'company_name'      => 'ReconGuard Financial Governance',
                'email_verified_at' => now(),
            ]
        );
        $admin->syncRoles([$adminRole]);

        // 3. Core Baseline Account 2: Senior Accountant
        $accountant = User::firstOrCreate(
            ['email' => 'accountant@reconguard.test'],
            [
                'name'              => 'Senior Accountant',
                'password'          => Hash::make('password'),
                'phone'             => '+959790000002',
                'nrc_number'        => '12/MAGANA(N)234567',
                'address'           => 'Finance & Treasury Department, Yangon',
                'emergency_contact' => '+959790000098',
                'company_name'      => 'Finance & Treasury Division',
                'email_verified_at' => now(),
            ]
        );
        $accountant->syncRoles([$accountantRole]);

        // 4. Core Baseline Account 3: Registered Customer (Merchant Payer)
        $customer = User::firstOrCreate(
            ['email' => 'customer@reconguard.test'],
            [
                'name'              => 'U Kyaw Swar (Golden Gate Trading)',
                'password'          => Hash::make('password'),
                'phone'             => '+959960000003',
                'nrc_number'        => '12/MAGANA(N)345678',
                'address'           => 'No. 42 Merchant Street, Kyauktada Township, Yangon',
                'emergency_contact' => '+959960000097',
                'company_name'      => 'Golden Gate Wholesale & Trading Ltd.',
                'email_verified_at' => now(),
            ]
        );
        $customer->syncRoles([$customerRole]);

        // 5. System Settings — admin secondary passcode (admin1234)
        SystemSetting::updateOrCreate(
            ['key' => 'admin_panel_passcode'],
            ['value' => Hash::make('admin1234')]
        );
    }
}
