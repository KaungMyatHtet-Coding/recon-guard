<?php

namespace Database\Seeders;

use App\Models\BankStatementBatch;
use App\Models\BankTransaction;
use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\ReconciliationMatch;
use App\Models\SystemSetting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * ReconGuard Rich Demonstration Dataset:
     * Seeds 3 baseline accounts + 4 bank batches + 45 realistic invoices
     * with corresponding payment slips, bank ledger transactions, and
     * 3-way reconciliation audit records across KBZPay, WavePay, CB Pay, and AYA Pay.
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

        // Secondary Customer for Multi-Merchant Realism
        $customer2 = User::firstOrCreate(
            ['email' => 'customer2@reconguard.test'],
            [
                'name'              => 'Daw Su Su (Apex Retail Logistics)',
                'password'          => Hash::make('password'),
                'phone'             => '+959970111222',
                'nrc_number'        => '12/DAGAMA(N)456789',
                'address'           => 'Bayintnaung Wholesale Market, Mayangone, Yangon',
                'emergency_contact' => '+959970111299',
                'company_name'      => 'Apex Retail Logistics Co., Ltd.',
                'email_verified_at' => now(),
            ]
        );
        $customer2->syncRoles([$customerRole]);

        // 5. System Settings — admin secondary passcode (admin1234)
        SystemSetting::updateOrCreate(
            ['key' => 'admin_panel_passcode'],
            ['value' => Hash::make('admin1234')]
        );

        // 6. Bank Statement Batches (EOD settlement CSVs across 4 channels)
        $batchKpay = BankStatementBatch::create([
            'uploaded_by' => $accountant->id,
            'payment_channel' => 'kbzpay',
            'original_filename' => 'KBZPay_Merchant_Settlement_20261103.csv',
            'statement_date' => Carbon::now()->subDay()->toDateString(),
            'total_records' => 14,
            'total_credit_amount' => 18450000.00,
            'status' => 'processed',
        ]);

        $batchWave = BankStatementBatch::create([
            'uploaded_by' => $accountant->id,
            'payment_channel' => 'wavepay',
            'original_filename' => 'WaveMoney_Corporate_Disbursement_20261103.csv',
            'statement_date' => Carbon::now()->subDay()->toDateString(),
            'total_records' => 11,
            'total_credit_amount' => 12800000.00,
            'status' => 'processed',
        ]);

        $batchCb = BankStatementBatch::create([
            'uploaded_by' => $accountant->id,
            'payment_channel' => 'cbpay',
            'original_filename' => 'CBPay_Business_Settlement_20261103.csv',
            'statement_date' => Carbon::now()->subDay()->toDateString(),
            'total_records' => 10,
            'total_credit_amount' => 15600000.00,
            'status' => 'processed',
        ]);

        $batchAya = BankStatementBatch::create([
            'uploaded_by' => $accountant->id,
            'payment_channel' => 'ayapay',
            'original_filename' => 'AYAPay_Enterprise_EOD_20261103.csv',
            'statement_date' => Carbon::now()->subDay()->toDateString(),
            'total_records' => 10,
            'total_credit_amount' => 11750000.00,
            'status' => 'processed',
        ]);

        // 7. Seed 45 Realistic Invoices Across 4 Channels & Diverse Statuses
        $catalog = [
            ['Electronics Wholesale - Smart POS Displays', 850000.00, 'kbzpay'],
            ['Commercial Solar Hybrid Inverters 5KW', 1450000.00, 'kbzpay'],
            ['Heavy-duty Server Rack Enclosures 42U', 650000.00, 'kbzpay'],
            ['Fiber Optic Core Cables 2000m Drum', 780000.00, 'kbzpay'],
            ['Cat6 SFTP Network Cabling 50 Boxes', 920000.00, 'kbzpay'],
            ['Industrial Backup Diesel Generator 15KVA', 3200000.00, 'kbzpay'],
            ['Smart Warehouse Barcode Scanner Terminals', 540000.00, 'kbzpay'],
            ['Lithium LiFePO4 Energy Storage 48V 100Ah', 1850000.00, 'kbzpay'],
            ['Corporate Firewall Security Appliances', 1250000.00, 'kbzpay'],
            ['Enterprise WiFi 6 Access Points (10 Units)', 1100000.00, 'kbzpay'],
            ['High-speed Thermal Receipt Printers', 450000.00, 'kbzpay'],
            ['Automatic Currency Counter & UV Detector', 380000.00, 'kbzpay'],

            ['Packaging Cardboard Shipping Cartons 20,000 pcs', 680000.00, 'wavepay'],
            ['Wholesale Pharmaceutical Disinfectants', 520000.00, 'wavepay'],
            ['Cold Chain Refrigerated Freight Service', 950000.00, 'wavepay'],
            ['Safety Equipment & Protective Workwear', 430000.00, 'wavepay'],
            ['Warehouse Forklift Maintenance & Tires', 870000.00, 'wavepay'],
            ['Custom Printed Eco-Friendly Paper Bags', 360000.00, 'wavepay'],
            ['Bulk Food Grade Plastic Containers', 740000.00, 'wavepay'],
            ['Mandalay Express Cargo Logistics Retainer', 1200000.00, 'wavepay'],
            ['Pallet Wrapping Stretch Film 100 Rolls', 490000.00, 'wavepay'],
            ['Commercial Weighing Scale Calibration', 310000.00, 'wavepay'],
            ['Fleet Fuel Card Advance Top-up Deposit', 1500000.00, 'wavepay'],

            ['Cloud Server Hosting & Disaster Recovery', 1750000.00, 'cbpay'],
            ['Enterprise ERP Multi-Seat Software License', 2600000.00, 'cbpay'],
            ['CCTV 4K IP Surveillance Camera Package', 1350000.00, 'cbpay'],
            ['Biometric Fingerprint & Access Turnstiles', 890000.00, 'cbpay'],
            ['Office Air Conditioning 2.5HP Inverter Units', 1650000.00, 'cbpay'],
            ['Steel Heavy Warehouse Shelving 12 Bays', 1950000.00, 'cbpay'],
            ['Industrial Air Compressor 500L', 1400000.00, 'cbpay'],
            ['Corporate Cyber Security Vulnerability Audit', 2200000.00, 'cbpay'],
            ['Network Core Switch 48-Port Managed L3', 1150000.00, 'cbpay'],
            ['Hydraulic Pallet Jack 3-Ton Capacity', 650000.00, 'cbpay'],
            ['Executive Meeting Room Smart Interactive Display', 2450000.00, 'cbpay'],

            ['Container Port Handling & Clearance Fees', 1800000.00, 'ayapay'],
            ['Export Quality Organic Coffee Wholesale', 950000.00, 'ayapay'],
            ['Automated Conveyor Belt Rollers Replacement', 1120000.00, 'ayapay'],
            ['Bulk Cooking Oil Refined 200 Jerrycans', 1680000.00, 'ayapay'],
            ['Commercial Water Filtration RO System', 830000.00, 'ayapay'],
            ['Industrial Shrink Wrap Heat Tunnel Machine', 1390000.00, 'ayapay'],
            ['High Bay LED Factory Lighting Fixtures', 620000.00, 'ayapay'],
            ['Specialty Packaging Sealing Machine', 580000.00, 'ayapay'],
            ['Grain & Seed Sorting Machinery Maintenance', 1450000.00, 'ayapay'],
            ['Commercial Kitchen Steam Oven Appliance', 2100000.00, 'ayapay'],
            ['Cold Storage Room Temperature Sensor IoT Array', 780000.00, 'ayapay'],
        ];

        $invoiceCounter = 1;

        foreach ($catalog as $index => $item) {
            $invNum = sprintf('INV-2026-%04d', $invoiceCounter++);
            $assignedCustomer = ($index % 3 === 0) ? $customer2 : $customer;
            $channel = $item[2];
            $amount = $item[1];
            $desc = $item[0];

            // Distribute statuses realistically
            // 0-21: Reconciled (Exact, Fee-adjusted, Fuzzy)
            // 22-26: Discrepancy
            // 27-31: Fraud flagged (Photoshop tamper, fake slip, duplicate hash)
            // 32-38: Pending verification
            // 39-44: Unpaid
            if ($index <= 21) {
                $status = 'reconciled';
            } elseif ($index <= 26) {
                $status = 'discrepancy';
            } elseif ($index <= 31) {
                $status = 'fraud_flagged';
            } elseif ($index <= 38) {
                $status = 'pending_verification';
            } else {
                $status = 'unpaid';
            }

            $invoice = Invoice::create([
                'invoice_number' => $invNum,
                'user_id' => $assignedCustomer->id,
                'customer_name' => $assignedCustomer->name,
                'customer_phone' => $assignedCustomer->phone,
                'description' => $desc,
                'amount' => $amount,
                'expected_channel' => $channel,
                'status' => $status,
                'due_date' => Carbon::now()->addDays(($index % 7) - 3)->toDateString(),
            ]);

            // For paid/pending/fraud invoices, generate corresponding payment slip and bank records
            if ($status !== 'unpaid') {
                $batch = match ($channel) {
                    'kbzpay' => $batchKpay,
                    'wavepay' => $batchWave,
                    'cbpay' => $batchCb,
                    'ayapay' => $batchAya,
                    default => $batchKpay,
                };

                $prefix = match ($channel) {
                    'kbzpay' => '0100',
                    'wavepay' => 'WAVE',
                    'cbpay' => 'CB',
                    'ayapay' => 'AYA',
                };
                $txId = sprintf('%s%s%06d', $prefix, date('Ymd'), $invoice->id * 73 + 1000);

                // Determine slip specifics
                $slipAmount = $amount;
                $isTampered = false;
                $matchType = 'exact_match';
                $confScore = 99.2;
                $exifData = ['Software' => 'iPhone 15 Pro iOS 17.5.1', 'Modified' => false];

                if ($status === 'reconciled') {
                    if ($index % 4 === 1) {
                        $matchType = 'fee_adjusted_match';
                        $confScore = 95.0;
                    } elseif ($index % 4 === 2) {
                        $matchType = 'fuzzy_match';
                        $confScore = 88.5;
                    }
                    $slipStatus = 'matched';
                } elseif ($status === 'discrepancy') {
                    $slipAmount = $amount - 50000.00; // Paid less than invoiced
                    $matchType = 'fuzzy_match';
                    $confScore = 72.0;
                    $slipStatus = 'fuzzy_matched';
                } elseif ($status === 'fraud_flagged') {
                    $isTampered = true;
                    $matchType = ($index % 2 === 0) ? 'tampered_amount_fraud' : 'fake_slip_fraud';
                    $confScore = 18.0;
                    $slipStatus = 'tampered_fraud';
                    $exifData = ['Software' => 'Adobe Photoshop 2024 (Windows)', 'Modified' => true, 'LayerCount' => 3];
                } else { // pending_verification
                    $slipStatus = 'pending_recon';
                    $matchType = null;
                }

                $paymentSlip = PaymentSlip::create([
                    'invoice_id' => $invoice->id,
                    'user_id' => $assignedCustomer->id,
                    'payment_channel' => $channel,
                    'image_path' => "slips/{$channel}/" . strtolower($invNum) . '.jpg',
                    'image_hash' => hash('sha256', $invNum . $txId . $invoice->id),
                    'extracted_transaction_id' => $txId,
                    'extracted_amount' => $slipAmount,
                    'extracted_datetime' => Carbon::now()->subDays($index % 5 + 1)->subHours($index % 8),
                    'sender_phone' => $assignedCustomer->phone,
                    'sender_name' => $assignedCustomer->name,
                    'ocr_confidence' => $isTampered ? 41 : 97,
                    'exif_tamper_flag' => $isTampered,
                    'exif_metadata' => $exifData,
                    'verification_status' => $slipStatus,
                ]);

                // Create official bank transaction record in ledger (except for completely fabricated slips)
                $bankTx = null;
                if ($status !== 'fraud_flagged' || ($index % 2 === 0)) {
                    $fee = ($matchType === 'fee_adjusted_match') ? 500.00 : 0.00;
                    $bankAmount = ($status === 'fraud_flagged') ? 5000.00 : $amount; // Bank received only 5,000 for tampered slip!

                    $bankTx = BankTransaction::create([
                        'batch_id' => $batch->id,
                        'payment_channel' => $channel,
                        'bank_transaction_id' => $txId,
                        'transaction_datetime' => Carbon::now()->subDays($index % 5 + 1)->subHours($index % 8)->addMinutes(12),
                        'sender_phone' => $assignedCustomer->phone,
                        'sender_name' => $assignedCustomer->name,
                        'gross_amount' => $bankAmount,
                        'fee_amount' => $fee,
                        'net_amount' => $bankAmount - $fee,
                        'reference_note' => "OFFICIAL PAYMENT FOR {$invNum}",
                        'raw_payload' => [
                            'terminal_id' => 'POS-YGN-' . rand(100, 999),
                            'settlement_currency' => 'MMK',
                            'auth_code' => strtoupper(substr(md5($txId), 0, 8)),
                        ],
                        'match_status' => ($status === 'reconciled') ? 'matched' : (($status === 'discrepancy') ? 'fuzzy_matched' : 'unmatched'),
                    ]);
                }

                // Create 3-Way Reconciliation record
                if ($matchType) {
                    $reconStatus = match ($status) {
                        'reconciled' => 'auto_approved',
                        'fraud_flagged' => 'rejected_fraud',
                        'discrepancy' => 'pending_review',
                        default => 'pending_review',
                    };

                    ReconciliationMatch::create([
                        'invoice_id' => $invoice->id,
                        'payment_slip_id' => $paymentSlip->id,
                        'bank_transaction_id' => $bankTx?->id,
                        'reconciled_by' => ($status === 'reconciled') ? $accountant->id : null,
                        'match_type' => $matchType,
                        'confidence_score' => $confScore,
                        'invoice_amount' => $amount,
                        'slip_amount' => $slipAmount,
                        'bank_amount' => $bankTx?->gross_amount,
                        'variance_amount' => $bankTx ? abs($amount - $bankTx->gross_amount) : $amount,
                        'notes' => $isTampered
                            ? 'CRITICAL ALERT: Slip EXIF metadata edited via Adobe Photoshop. Tampered amount exceeds actual bank settlement.'
                            : ($status === 'discrepancy'
                                ? 'Variance discrepancy detected: Slip submitted for 50,000 MMK less than invoice amount.'
                                : '3-Way matching verified across Invoices, OCR Slip, and Bank Statement Ledger.'),
                        'status' => $reconStatus,
                    ]);
                }
            }
        }
    }
}
