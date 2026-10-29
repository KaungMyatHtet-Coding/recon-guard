<?php

namespace Database\Seeders;

use App\Models\BankStatementBatch;
use App\Models\BankTransaction;
use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\ReconciliationMatch;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Roles setup
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $accountantRole = Role::firstOrCreate(['name' => 'accountant']);
        $customerRole = Role::firstOrCreate(['name' => 'customer']);

        // 2. Demo Users
        $admin = User::firstOrCreate(
            ['email' => 'admin@reconguard.test'],
            [
                'name' => 'Chief Auditor (Admin)',
                'password' => Hash::make('password'),
                'phone' => '+959790000001',
                'company_name' => 'ReconGuard Headquarters',
                'email_verified_at' => now(),
            ]
        );
        $admin->syncRoles([$adminRole]);

        $accountant = User::firstOrCreate(
            ['email' => 'accountant@reconguard.test'],
            [
                'name' => 'Senior Accountant',
                'password' => Hash::make('password'),
                'phone' => '+959790000002',
                'company_name' => 'Finance & Audit Department',
                'email_verified_at' => now(),
            ]
        );
        $accountant->syncRoles([$accountantRole]);

        $customer1 = User::firstOrCreate(
            ['email' => 'customer1@reconguard.test'],
            [
                'name' => 'U Kyaw Swar',
                'password' => Hash::make('password'),
                'phone' => '+959960111222',
                'company_name' => 'Kyaw Swar Retail Merchants Ltd',
                'email_verified_at' => now(),
            ]
        );
        $customer1->syncRoles([$customerRole]);

        $customer2 = User::firstOrCreate(
            ['email' => 'customer2@reconguard.test'],
            [
                'name' => 'Daw Su Su',
                'password' => Hash::make('password'),
                'phone' => '+959970333444',
                'company_name' => 'Su Su Wholesale Trading Co',
                'email_verified_at' => now(),
            ]
        );
        $customer2->syncRoles([$customerRole]);

        // 3. Bank Statement Batches (EOD CSVs for each mobile wallet / bank)
        $batchKpay = BankStatementBatch::create([
            'uploaded_by' => $accountant->id,
            'payment_channel' => 'kbzpay',
            'original_filename' => 'KBZPay_Merchant_Settlement_20261028.csv',
            'statement_date' => Carbon::now()->subDay()->toDateString(),
            'total_records' => 6,
            'total_credit_amount' => 4850000.00,
            'status' => 'processed',
        ]);

        $batchWave = BankStatementBatch::create([
            'uploaded_by' => $accountant->id,
            'payment_channel' => 'wavepay',
            'original_filename' => 'WaveMoney_QR_Disbursement_20261028.csv',
            'statement_date' => Carbon::now()->subDay()->toDateString(),
            'total_records' => 4,
            'total_credit_amount' => 2600000.00,
            'status' => 'processed',
        ]);

        $batchCb = BankStatementBatch::create([
            'uploaded_by' => $accountant->id,
            'payment_channel' => 'cbpay',
            'original_filename' => 'CBPay_Corporate_EOD_20261028.csv',
            'statement_date' => Carbon::now()->subDay()->toDateString(),
            'total_records' => 3,
            'total_credit_amount' => 3750000.00,
            'status' => 'processed',
        ]);

        $batchAya = BankStatementBatch::create([
            'uploaded_by' => $accountant->id,
            'payment_channel' => 'ayapay',
            'original_filename' => 'AYAPay_Business_Gateway_20261028.csv',
            'statement_date' => Carbon::now()->subDay()->toDateString(),
            'total_records' => 2,
            'total_credit_amount' => 1900000.00,
            'status' => 'processed',
        ]);

        // 4. Realistic Invoices (15 items across channels)
        $invoicesData = [
            // KBZPay Exact Matches
            [
                'number' => 'INV-2026-0001',
                'user' => $customer1,
                'name' => 'U Kyaw Swar',
                'phone' => '+959960111222',
                'desc' => 'Electronics Bulk Purchase - Q4 Stock (Batch 1)',
                'amount' => 850000.00,
                'channel' => 'kbzpay',
                'status' => 'reconciled',
                'due' => Carbon::now()->subDays(5),
                'tx_id' => 'KP-20261028-984210',
                'match_type' => 'exact_match',
                'conf' => 99.50,
            ],
            [
                'number' => 'INV-2026-0002',
                'user' => $customer2,
                'name' => 'Daw Su Su',
                'phone' => '+959970333444',
                'desc' => 'Wholesale FMCG Goods Shipment to Mandalay',
                'amount' => 1200000.00,
                'channel' => 'kbzpay',
                'status' => 'reconciled',
                'due' => Carbon::now()->subDays(4),
                'tx_id' => 'KP-20261028-773192',
                'match_type' => 'exact_match',
                'conf' => 99.80,
            ],
            [
                'number' => 'INV-2026-0003',
                'user' => $customer1,
                'name' => 'U Kyaw Swar',
                'phone' => '+959960111222',
                'desc' => 'Server Rack Hardware & Network Modules',
                'amount' => 650000.00,
                'channel' => 'kbzpay',
                'status' => 'reconciled',
                'due' => Carbon::now()->subDays(3),
                'tx_id' => 'KP-20261028-661204',
                'match_type' => 'exact_match',
                'conf' => 99.20,
            ],

            // WavePay Matches
            [
                'number' => 'INV-2026-0004',
                'user' => $customer2,
                'name' => 'Daw Su Su',
                'phone' => '+959970333444',
                'desc' => 'Warehouse Logistics & Distribution Services',
                'amount' => 450000.00,
                'channel' => 'wavepay',
                'status' => 'reconciled',
                'due' => Carbon::now()->subDays(3),
                'tx_id' => 'WP-20261028-554190',
                'match_type' => 'exact_match',
                'conf' => 98.90,
            ],
            [
                'number' => 'INV-2026-0005',
                'user' => $customer1,
                'name' => 'U Kyaw Swar',
                'phone' => '+959960111222',
                'desc' => 'Commercial Solar Inverter Maintenance Kit',
                'amount' => 950000.00,
                'channel' => 'wavepay',
                'status' => 'reconciled',
                'due' => Carbon::now()->subDays(2),
                'tx_id' => 'WP-20261028-441029',
                'match_type' => 'fee_adjusted_match',
                'conf' => 94.50,
            ],

            // CB Pay Matches
            [
                'number' => 'INV-2026-0006',
                'user' => $customer2,
                'name' => 'Daw Su Su',
                'phone' => '+959970333444',
                'desc' => 'Packaging Materials Supply - 50,000 Units',
                'amount' => 1750000.00,
                'channel' => 'cbpay',
                'status' => 'reconciled',
                'due' => Carbon::now()->subDays(2),
                'tx_id' => 'CB-20261028-330198',
                'match_type' => 'exact_match',
                'conf' => 99.70,
            ],
            [
                'number' => 'INV-2026-0007',
                'user' => $customer1,
                'name' => 'U Kyaw Swar',
                'phone' => '+959960111222',
                'desc' => 'Automated POS Terminals Hardware Upgrade',
                'amount' => 800000.00,
                'channel' => 'cbpay',
                'status' => 'reconciled',
                'due' => Carbon::now()->subDays(2),
                'tx_id' => 'CB-20261028-228741',
                'match_type' => 'fuzzy_match',
                'conf' => 88.50,
            ],

            // AYA Pay Matches
            [
                'number' => 'INV-2026-0008',
                'user' => $customer2,
                'name' => 'Daw Su Su',
                'phone' => '+959970333444',
                'desc' => 'Corporate Cloud Storage Annual Renewal',
                'amount' => 1100000.00,
                'channel' => 'ayapay',
                'status' => 'reconciled',
                'due' => Carbon::now()->subDays(1),
                'tx_id' => 'AYA-20261028-119283',
                'match_type' => 'exact_match',
                'conf' => 99.40,
            ],
            [
                'number' => 'INV-2026-0009',
                'user' => $customer1,
                'name' => 'U Kyaw Swar',
                'phone' => '+959960111222',
                'desc' => 'Cold Chain Storage Rental - Monthly Deposit',
                'amount' => 800000.00,
                'channel' => 'ayapay',
                'status' => 'reconciled',
                'due' => Carbon::now()->subDays(1),
                'tx_id' => 'AYA-20261028-883719',
                'match_type' => 'exact_match',
                'conf' => 99.10,
            ],

            // Fraud / Discrepancy Flagged Invoices
            [
                'number' => 'INV-2026-0010',
                'user' => $customer1,
                'name' => 'U Kyaw Swar',
                'phone' => '+959960111222',
                'desc' => 'Industrial Generator Spare Parts Order',
                'amount' => 1500000.00,
                'channel' => 'kbzpay',
                'status' => 'fraud_flagged',
                'due' => Carbon::now()->subDays(1),
                'tx_id' => 'KP-FAKE-998877',
                'match_type' => 'fake_slip_fraud',
                'conf' => 12.00,
            ],
            [
                'number' => 'INV-2026-0011',
                'user' => $customer2,
                'name' => 'Daw Su Su',
                'phone' => '+959970333444',
                'desc' => 'Import Customs Clearing Clearance Retainer',
                'amount' => 700000.00,
                'channel' => 'wavepay',
                'status' => 'discrepancy',
                'due' => Carbon::now()->subDays(1),
                'tx_id' => 'WP-20261028-771122',
                'match_type' => 'amount_mismatch_fraud',
                'conf' => 45.00,
            ],

            // Pending Verification Slips
            [
                'number' => 'INV-2026-0012',
                'user' => $customer1,
                'name' => 'U Kyaw Swar',
                'phone' => '+959960111222',
                'desc' => 'Fiber Optic Cable Drum 4000m Roll',
                'amount' => 650000.00,
                'channel' => 'kbzpay',
                'status' => 'pending_verification',
                'due' => Carbon::now()->addDays(2),
                'tx_id' => 'KP-20261029-PEND01',
                'match_type' => null,
                'conf' => 0,
            ],
            [
                'number' => 'INV-2026-0013',
                'user' => $customer2,
                'name' => 'Daw Su Su',
                'phone' => '+959970333444',
                'desc' => 'Medical Grade Hand Sanitizer Wholesale 200 Cartons',
                'amount' => 500000.00,
                'channel' => 'wavepay',
                'status' => 'pending_verification',
                'due' => Carbon::now()->addDays(3),
                'tx_id' => 'WP-20261029-PEND02',
                'match_type' => null,
                'conf' => 0,
            ],

            // Unpaid Invoices
            [
                'number' => 'INV-2026-0014',
                'user' => $customer1,
                'name' => 'U Kyaw Swar',
                'phone' => '+959960111222',
                'desc' => 'Quarterly ERP Software Multi-seat License',
                'amount' => 2200000.00,
                'channel' => 'cbpay',
                'status' => 'unpaid',
                'due' => Carbon::now()->addDays(7),
                'tx_id' => null,
                'match_type' => null,
                'conf' => 0,
            ],
            [
                'number' => 'INV-2026-0015',
                'user' => $customer2,
                'name' => 'Daw Su Su',
                'phone' => '+959970333444',
                'desc' => 'Office Security CCTV Network Installation',
                'amount' => 1350000.00,
                'channel' => 'ayapay',
                'status' => 'unpaid',
                'due' => Carbon::now()->addDays(10),
                'tx_id' => null,
                'match_type' => null,
                'conf' => 0,
            ],
        ];

        foreach ($invoicesData as $item) {
            $invoice = Invoice::create([
                'invoice_number' => $item['number'],
                'user_id' => $item['user']->id,
                'customer_name' => $item['name'],
                'customer_phone' => $item['phone'],
                'description' => $item['desc'],
                'amount' => $item['amount'],
                'expected_channel' => $item['channel'],
                'status' => $item['status'],
                'due_date' => $item['due'],
            ]);

            // If transaction ID exists, create bank tx + slip + reconciliation
            if ($item['tx_id']) {
                $batch = match ($item['channel']) {
                    'kbzpay' => $batchKpay,
                    'wavepay' => $batchWave,
                    'cbpay' => $batchCb,
                    'ayapay' => $batchAya,
                    default => $batchKpay,
                };

                $slipStatus = match ($item['status']) {
                    'reconciled' => 'matched',
                    'fraud_flagged' => 'tampered_fraud',
                    'discrepancy' => 'fuzzy_matched',
                    'pending_verification' => 'pending_recon',
                    default => 'pending_recon',
                };

                $slipAmount = $item['amount'];
                if ($item['status'] === 'discrepancy') {
                    $slipAmount = $item['amount'] - 50000; // Customer paid less
                }

                $paymentSlip = PaymentSlip::create([
                    'invoice_id' => $invoice->id,
                    'user_id' => $item['user']->id,
                    'payment_channel' => $item['channel'],
                    'image_path' => "slips/{$item['channel']}/" . strtolower($item['number']) . '.jpg',
                    'image_hash' => hash('sha256', $item['number'] . $item['tx_id'] . time()),
                    'extracted_transaction_id' => $item['tx_id'],
                    'extracted_amount' => $slipAmount,
                    'extracted_datetime' => Carbon::now()->subDay(),
                    'sender_phone' => $item['phone'],
                    'sender_name' => $item['name'],
                    'ocr_confidence' => $item['status'] === 'fraud_flagged' ? 42 : 98,
                    'exif_tamper_flag' => $item['status'] === 'fraud_flagged',
                    'exif_metadata' => $item['status'] === 'fraud_flagged'
                        ? ['Software' => 'Adobe Photoshop 2024 (Windows)', 'Modified' => true]
                        : ['Software' => 'iPhone 15 Pro iOS 17.5.1', 'Modified' => false],
                    'verification_status' => $slipStatus,
                ]);

                // Create bank transaction if not a completely fake slip
                $bankTx = null;
                if ($item['status'] !== 'fraud_flagged') {
                    $bankTx = BankTransaction::create([
                        'batch_id' => $batch->id,
                        'payment_channel' => $item['channel'],
                        'bank_transaction_id' => $item['tx_id'],
                        'transaction_datetime' => Carbon::now()->subDay()->addHours(1),
                        'sender_phone' => $item['phone'],
                        'sender_name' => $item['name'],
                        'gross_amount' => $item['amount'],
                        'fee_amount' => $item['match_type'] === 'fee_adjusted_match' ? 1500.00 : 0.00,
                        'net_amount' => $item['match_type'] === 'fee_adjusted_match' ? ($item['amount'] - 1500.00) : $item['amount'],
                        'reference_note' => "PAYMENT FOR {$item['number']}",
                        'raw_payload' => [
                            'terminal_id' => 'TERM-0982',
                            'qr_type' => 'dynamic',
                            'settlement_currency' => 'MMK',
                        ],
                        'match_status' => $item['status'] === 'reconciled' ? 'matched' : 'unmatched',
                    ]);
                }

                if ($item['match_type']) {
                    $reconStatus = match ($item['status']) {
                        'reconciled' => 'auto_approved',
                        'fraud_flagged' => 'rejected_fraud',
                        'discrepancy' => 'pending_review',
                        default => 'pending_review',
                    };

                    ReconciliationMatch::create([
                        'invoice_id' => $invoice->id,
                        'payment_slip_id' => $paymentSlip->id,
                        'bank_transaction_id' => $bankTx?->id,
                        'reconciled_by' => $item['status'] === 'reconciled' ? $accountant->id : null,
                        'match_type' => $item['match_type'],
                        'confidence_score' => $item['conf'],
                        'invoice_amount' => $item['amount'],
                        'slip_amount' => $slipAmount,
                        'bank_amount' => $bankTx?->gross_amount,
                        'variance_amount' => $bankTx ? abs($item['amount'] - $bankTx->gross_amount) : $item['amount'],
                        'notes' => $item['status'] === 'fraud_flagged'
                            ? 'EXIF Tamper detected: Slip edited with Adobe Photoshop. Transaction ID absent from official bank statement.'
                            : ($item['status'] === 'discrepancy' ? 'Slip amount (650,000 MMK) does not match Invoice amount (700,000 MMK). Variance: 50,000 MMK.' : '3-Way reconciliation verified with high confidence score.'),
                        'status' => $reconStatus,
                    ]);
                }
            }
        }
    }
}
