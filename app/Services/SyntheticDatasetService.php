<?php

namespace App\Services;

use App\Models\BankStatementBatch;
use App\Models\BankTransaction;
use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SyntheticDatasetService
{
    protected MockSlipImageService $imageService;

    public function __construct(MockSlipImageService $imageService)
    {
        $this->imageService = $imageService;
    }

    /**
     * Common realistic Myanmar names for synthetic customer profiles
     */
    protected array $myanmarNames = [
        'U Kyaw Swar', 'Daw Mya Mya', 'Ko Thura', 'Ma Hnin Wai',
        'U Win Naing', 'Daw Su Su', 'Ko Aung Myo', 'Ma Phyu Phyu',
        'U Tin Maung', 'Daw Khin Lay', 'Ko Min Thein', 'Ma Ei Ei Chaw',
        'U Myo Min', 'Daw Thinzar', 'Ko Ye Lin', 'Ma Yu Yu Maw',
        'U Hla Shwe', 'Daw Thet Mon', 'Ko Sai Lon', 'Ma Sandar Oo',
    ];

    /**
     * Generate synthetic bulk dataset across channels.
     *
     * @param int $totalCount 50|200|500|1000
     * @param string $channelFilter 'all'|'kbzpay'|'wavepay'|'cbpay'|'ayapay'
     * @param User $adminUser
     * @return array Summary of generated items & created batch IDs
     */
    public function generateBulkDataset(int $totalCount, string $channelFilter, User $adminUser): array
    {
        $channels = in_array(strtolower($channelFilter), ['kbzpay', 'wavepay', 'cbpay', 'ayapay'])
            ? [strtolower($channelFilter)]
            : ['kbzpay', 'wavepay', 'cbpay', 'ayapay'];

        // Ensure we have customers
        $customers = User::role('customer')->get();
        if ($customers->isEmpty()) {
            $customers = collect([$adminUser]);
        }

        // Anomaly distribution calculation
        // 80% Exact, 8% Fee-adjusted, 5% Fuzzy, 4% Fraud, 3% Unclaimed Suspense
        $exactCount = (int) round($totalCount * 0.80);
        $feeAdjustedCount = (int) round($totalCount * 0.08);
        $fuzzyCount = (int) round($totalCount * 0.05);
        $fraudCount = (int) round($totalCount * 0.04);
        $unclaimedCount = max(1, $totalCount - ($exactCount + $feeAdjustedCount + $fuzzyCount + $fraudCount));

        $plan = [];
        for ($i = 0; $i < $exactCount; $i++) $plan[] = 'exact_match';
        for ($i = 0; $i < $feeAdjustedCount; $i++) $plan[] = 'fee_adjusted_match';
        for ($i = 0; $i < $fuzzyCount; $i++) $plan[] = 'fuzzy_match';
        for ($i = 0; $i < $fraudCount; $i++) $plan[] = 'fraud_tampered';
        for ($i = 0; $i < $unclaimedCount; $i++) $plan[] = 'unclaimed_suspense';

        shuffle($plan);

        // Pre-create BankStatementBatch for each channel for today
        $batches = [];
        foreach ($channels as $ch) {
            $batches[$ch] = BankStatementBatch::create([
                'uploaded_by' => $adminUser->id,
                'payment_channel' => $ch,
                'original_filename' => "Synthetic_{$ch}_" . date('Ymd_His') . ".csv",
                'statement_date' => Carbon::today()->toDateString(),
                'total_records' => 0,
                'total_credit_amount' => 0,
                'status' => 'uploaded',
            ]);
        }

        $generatedInvoices = 0;
        $generatedSlips = 0;
        $generatedBankTxns = 0;
        $channelStats = array_fill_keys($channels, 0);

        DB::beginTransaction();
        try {
            foreach ($plan as $index => $anomalyType) {
                $channel = $channels[$index % count($channels)];
                $customer = $customers->random();
                $customerName = $this->myanmarNames[array_rand($this->myanmarNames)];
                $customerPhone = '09' . mt_rand(200000000, 999999999);
                $invoiceNum = 'INV-' . date('Y') . '-' . str_pad((string) mt_rand(1000, 999999), 6, '0', STR_PAD_LEFT);

                // Base amount: 15,000 to 2,500,000 MMK
                $baseAmount = (float) (mt_rand(15, 2500) * 1000);
                $bankTxId = $this->generateTxnId($channel);
                $tradeTime = Carbon::now()->subMinutes(mt_rand(5, 2880));

                $channelStats[$channel]++;

                if ($anomalyType === 'unclaimed_suspense') {
                    // Only Bank Transaction exists (no invoice or slip uploaded yet)
                    BankTransaction::create([
                        'batch_id' => $batches[$channel]->id,
                        'payment_channel' => $channel,
                        'bank_transaction_id' => $bankTxId,
                        'transaction_datetime' => $tradeTime,
                        'sender_phone' => $customerPhone,
                        'sender_name' => $customerName,
                        'gross_amount' => $baseAmount,
                        'fee_amount' => 0,
                        'net_amount' => $baseAmount,
                        'reference_note' => "DIRECT DEPOSIT / UNIDENTIFIED",
                        'raw_payload' => ['simulation' => true, 'anomaly' => 'unclaimed_suspense'],
                        'match_status' => 'suspense',
                    ]);
                    $generatedBankTxns++;
                    continue;
                }

                // Create Invoice
                $invoiceStatus = match ($anomalyType) {
                    'fraud_tampered' => 'fraud_flagged',
                    'fuzzy_match' => 'discrepancy',
                    'fee_adjusted_match' => 'pending_verification',
                    default => 'pending_verification',
                };

                $invoice = Invoice::create([
                    'invoice_number' => $invoiceNum,
                    'user_id' => $customer->id,
                    'customer_name' => $customerName,
                    'customer_phone' => $customerPhone,
                    'description' => "Order #{$invoiceNum} - Synthetic B2B Settlement",
                    'amount' => $baseAmount,
                    'expected_channel' => $channel,
                    'status' => $invoiceStatus,
                    'due_date' => Carbon::now()->addDays(5)->toDateString(),
                ]);
                $generatedInvoices++;

                // Slip Details
                $slipTxId = $bankTxId;
                $slipAmount = $baseAmount;
                $slipConfidence = 96;
                $exifTamper = false;
                $exifMeta = ['Software' => 'Mobile Wallet Native App', 'Tampered' => false];
                $verificationStatus = 'pending_recon';

                // Bank Tx Details
                $bankGross = $baseAmount;
                $bankFee = 0;
                $bankNet = $baseAmount;
                $bankMatchStatus = 'unmatched';

                if ($anomalyType === 'fee_adjusted_match') {
                    $bankFee = (float) mt_rand(200, 500); // 200 - 500 MMK gateway fee
                    $bankNet = $bankGross - $bankFee;
                } elseif ($anomalyType === 'fuzzy_match') {
                    // 1 character typo or discrepancy in slip extraction
                    $slipTxId = substr($bankTxId, 0, -1) . (is_numeric(substr($bankTxId, -1)) ? (mt_rand(0, 9)) : 'X');
                    $slipConfidence = 74;
                    $verificationStatus = 'fuzzy_matched';
                } elseif ($anomalyType === 'fraud_tampered') {
                    // Customer uploaded slip claiming full amount ($baseAmount), but bank received only 5,000 MMK!
                    $slipAmount = $baseAmount;
                    $bankGross = 5000.00;
                    $bankNet = 5000.00;
                    $slipConfidence = 35;
                    $exifTamper = true;
                    $exifMeta = ['Software' => 'Adobe Photoshop 25.0 (Windows)', 'Tampered' => true];
                    $verificationStatus = 'tampered_fraud';
                }

                // Generate Mock Slip PNG file
                $slipImage = $this->imageService->generateReceiptImage(
                    $channel,
                    $exifTamper ? 'tampered_amount' : 'legit',
                    [
                        'transaction_id' => $slipTxId,
                        'amount' => $slipAmount,
                        'sender_name' => $customerName,
                        'sender_phone' => $customerPhone,
                        'datetime' => $tradeTime->toDateTimeString(),
                        'invoice_number' => $invoiceNum,
                    ]
                );

                $storedPath = "slips/{$channel}/" . $slipImage['filename'];
                Storage::disk('public')->put($storedPath, $slipImage['image_bytes']);

                // Insert PaymentSlip
                PaymentSlip::create([
                    'invoice_id' => $invoice->id,
                    'user_id' => $customer->id,
                    'payment_channel' => $channel,
                    'image_path' => $storedPath,
                    'image_hash' => $slipImage['image_hash'],
                    'extracted_transaction_id' => $slipTxId,
                    'extracted_amount' => $slipAmount,
                    'extracted_datetime' => $tradeTime,
                    'sender_phone' => $customerPhone,
                    'sender_name' => $customerName,
                    'ocr_confidence' => $slipConfidence,
                    'exif_tamper_flag' => $exifTamper,
                    'exif_metadata' => $exifMeta,
                    'verification_status' => $verificationStatus,
                ]);
                $generatedSlips++;

                // Insert BankTransaction
                BankTransaction::create([
                    'batch_id' => $batches[$channel]->id,
                    'payment_channel' => $channel,
                    'bank_transaction_id' => $bankTxId,
                    'transaction_datetime' => $tradeTime,
                    'sender_phone' => $customerPhone,
                    'sender_name' => $customerName,
                    'gross_amount' => $bankGross,
                    'fee_amount' => $bankFee,
                    'net_amount' => $bankNet,
                    'reference_note' => "SETTLEMENT FOR {$invoiceNum}",
                    'raw_payload' => [
                        'simulation' => true,
                        'anomaly' => $anomalyType,
                    ],
                    'match_status' => $bankMatchStatus,
                ]);
                $generatedBankTxns++;
            }

            // Update batch aggregates
            foreach ($batches as $ch => $b) {
                $totalRecs = BankTransaction::where('batch_id', $b->id)->count();
                $totalSum = BankTransaction::where('batch_id', $b->id)->sum('gross_amount');
                $b->update([
                    'total_records' => $totalRecs,
                    'total_credit_amount' => $totalSum,
                ]);
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return [
            'total_count' => $totalCount,
            'generated_invoices' => $generatedInvoices,
            'generated_slips' => $generatedSlips,
            'generated_bank_txns' => $generatedBankTxns,
            'channel_breakdown' => $channelStats,
            'batches' => collect($batches)->map(fn ($b) => [
                'id' => $b->id,
                'channel' => $b->payment_channel,
                'records' => $b->total_records,
                'amount' => $b->total_credit_amount,
                'filename' => $b->original_filename,
            ])->values()->all(),
        ];
    }

    /**
     * Export a channel's transactions formatted exactly to real Myanmar bank CSV columns.
     *
     * @param string $channel
     * @param int|null $batchId
     * @return array ['filename' => string, 'content' => string]
     */
    public function exportChannelCsv(string $channel, ?int $batchId = null): array
    {
        $channel = strtolower($channel);

        $query = BankTransaction::where('payment_channel', $channel);
        if ($batchId) {
            $query->where('batch_id', $batchId);
        } else {
            // Get last 500 rows if no batch specified
            $query->latest('id')->limit(500);
        }

        $records = $query->get();

        $output = fopen('php://temp', 'r+');

        switch ($channel) {
            case 'kbzpay':
                // KBZPay Merchant CSV Format
                fputcsv($output, [
                    'Transaction_No',
                    'Trade_Time',
                    'Payer_Phone',
                    'Payer_Name',
                    'Trans_Amount',
                    'Fee_Amount',
                    'Settlement_Amount',
                    'Remark',
                ]);
                foreach ($records as $r) {
                    fputcsv($output, [
                        $r->bank_transaction_id,
                        $r->transaction_datetime->format('Y-m-d H:i:s'),
                        $r->sender_phone,
                        $r->sender_name,
                        number_format($r->gross_amount, 2, '.', ''),
                        number_format($r->fee_amount, 2, '.', ''),
                        number_format($r->net_amount, 2, '.', ''),
                        $r->reference_note,
                    ]);
                }
                $filename = "KBZPay_Merchant_Statement_" . date('Ymd_His') . ".csv";
                break;

            case 'wavepay':
                // WavePay Merchant CSV Format
                fputcsv($output, [
                    'Wave_Txn_ID',
                    'Date_Time',
                    'Sender_MSISDN',
                    'Sender_Name',
                    'Gross_MMK',
                    'Commission_MMK',
                    'Net_MMK',
                    'Reference',
                ]);
                foreach ($records as $r) {
                    fputcsv($output, [
                        $r->bank_transaction_id,
                        $r->transaction_datetime->format('Y-m-d H:i:s'),
                        $r->sender_phone,
                        $r->sender_name,
                        number_format($r->gross_amount, 2, '.', ''),
                        number_format($r->fee_amount, 2, '.', ''),
                        number_format($r->net_amount, 2, '.', ''),
                        $r->reference_note,
                    ]);
                }
                $filename = "WavePay_Merchant_Statement_" . date('Ymd_His') . ".csv";
                break;

            case 'cbpay':
                // CB Pay Statement CSV Format
                fputcsv($output, [
                    'Ref_No',
                    'Value_Date',
                    'Debit_Account',
                    'Account_Holder',
                    'Credit_Amount',
                    'Charges',
                    'Net_Credit',
                    'Narrative',
                ]);
                foreach ($records as $r) {
                    fputcsv($output, [
                        $r->bank_transaction_id,
                        $r->transaction_datetime->format('Y-m-d'),
                        $r->sender_phone,
                        $r->sender_name,
                        number_format($r->gross_amount, 2, '.', ''),
                        number_format($r->fee_amount, 2, '.', ''),
                        number_format($r->net_amount, 2, '.', ''),
                        $r->reference_note,
                    ]);
                }
                $filename = "CBPay_Statement_" . date('Ymd_His') . ".csv";
                break;

            case 'ayapay':
            default:
                // AYA Pay Statement CSV Format
                fputcsv($output, [
                    'AYA_Trans_Ref',
                    'Transaction_Date',
                    'Customer_Phone',
                    'Customer_Name',
                    'Amount_MMK',
                    'Service_Fee',
                    'Total_Settled',
                    'Description',
                ]);
                foreach ($records as $r) {
                    fputcsv($output, [
                        $r->bank_transaction_id,
                        $r->transaction_datetime->format('Y-m-d H:i:s'),
                        $r->sender_phone,
                        $r->sender_name,
                        number_format($r->gross_amount, 2, '.', ''),
                        number_format($r->fee_amount, 2, '.', ''),
                        number_format($r->net_amount, 2, '.', ''),
                        $r->reference_note,
                    ]);
                }
                $filename = "AYAPay_Statement_" . date('Ymd_His') . ".csv";
                break;
        }

        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return [
            'filename' => $filename,
            'content' => $csvContent,
        ];
    }

    /**
     * Generate realistic Transaction ID per channel schema.
     */
    protected function generateTxnId(string $channel): string
    {
        return match (strtolower($channel)) {
            'kbzpay' => '0100' . date('Ymd') . mt_rand(10000000, 99999999), // 20 digits
            'wavepay' => (string) mt_rand(1000000000, 9999999999), // 10 digits
            'cbpay' => 'CB' . date('Ymd') . strtoupper(substr(md5((string) mt_rand()), 0, 8)),
            'ayapay' => 'AYA-' . date('Ymd') . '-' . mt_rand(100000, 999999),
            default => 'TXN' . mt_rand(10000000, 99999999),
        };
    }
}
