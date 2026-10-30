<?php

namespace App\Http\Controllers;

use App\Models\BankStatementBatch;
use App\Models\BankTransaction;
use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\ReconciliationMatch;
use App\Services\MockSlipImageService;
use App\Services\SyntheticDatasetService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SimulationStudioController extends Controller
{
    protected SyntheticDatasetService $datasetService;
    protected MockSlipImageService $slipImageService;

    public function __construct(
        SyntheticDatasetService $datasetService,
        MockSlipImageService $slipImageService
    ) {
        $this->datasetService = $datasetService;
        $this->slipImageService = $slipImageService;
    }

    /**
     * Display the Simulation Studio dashboard.
     */
    public function index(Request $request): Response
    {
        // Get recent uncompleted / pending invoices for interactive slip forge lab
        $invoices = Invoice::whereIn('status', ['unpaid', 'pending_verification', 'discrepancy'])
            ->latest('id')
            ->limit(25)
            ->get(['id', 'invoice_number', 'customer_name', 'customer_phone', 'amount', 'expected_channel', 'status']);

        // Channel batches for CSV downloads
        $recentBatches = BankStatementBatch::with('uploader')
            ->latest('id')
            ->limit(10)
            ->get();

        // Current system counts
        $counts = [
            'invoices' => Invoice::count(),
            'slips' => PaymentSlip::count(),
            'bank_txns' => BankTransaction::count(),
            'batches' => BankStatementBatch::count(),
            'matches' => ReconciliationMatch::count(),
        ];

        return Inertia::render('SimulationStudio/Index', [
            'invoices' => $invoices,
            'recentBatches' => $recentBatches,
            'counts' => $counts,
        ]);
    }

    /**
     * Trigger bulk synthetic dataset generation.
     */
    public function generateBulk(Request $request)
    {
        $validated = $request->validate([
            'size' => 'required|integer|in:50,200,500,1000',
            'channel' => 'required|string|in:all,kbzpay,wavepay,cbpay,ayapay',
        ]);

        $result = $this->datasetService->generateBulkDataset(
            (int) $validated['size'],
            $validated['channel'],
            $request->user()
        );

        return redirect()->back()->with('success', "Successfully generated {$result['total_count']} synthetic transactions across {$validated['channel']} with realistic anomaly distribution!");
    }

    /**
     * Download native bank statement CSV for any channel.
     */
    public function downloadBankCsv(Request $request, string $channel): StreamedResponse
    {
        $batchId = $request->query('batch_id') ? (int) $request->query('batch_id') : null;
        $export = $this->datasetService->exportChannelCsv($channel, $batchId);

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$export['filename']}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($export) {
            echo "\xEF\xBB\xBF"; // UTF-8 BOM for Excel compatibility
            echo $export['content'];
        }, 200, $headers);
    }

    /**
     * Interactive Mock Slip Generator (Preview or Direct Download).
     */
    public function generateSlipPreview(Request $request)
    {
        $validated = $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'channel' => 'required|in:kbzpay,wavepay,cbpay,ayapay',
            'mode' => 'required|in:legit,tampered_amount,duplicate_id',
            'tampered_amount' => 'nullable|numeric|min:1',
            'duplicate_txn_id' => 'nullable|string',
        ]);

        $invoice = Invoice::findOrFail($validated['invoice_id']);
        $amount = (float) $invoice->amount;
        $channel = $validated['channel'];
        $mode = $validated['mode'];

        // Determine transaction ID and amount based on mode
        $txnId = match ($channel) {
            'kbzpay' => '0100' . date('Ymd') . mt_rand(10000000, 99999999),
            'wavepay' => (string) mt_rand(1000000000, 9999999999),
            'cbpay' => 'CB' . date('Ymd') . strtoupper(substr(md5((string) mt_rand()), 0, 8)),
            'ayapay' => 'AYA-' . date('Ymd') . '-' . mt_rand(100000, 999999),
        };

        if ($mode === 'duplicate_id') {
            // Find an existing slip or bank txn if possible, or use given
            $existing = PaymentSlip::whereNotNull('extracted_transaction_id')->latest()->first();
            $txnId = $validated['duplicate_txn_id'] ?? ($existing?->extracted_transaction_id ?? $txnId);
        }

        if ($mode === 'tampered_amount') {
            // Amount shown on receipt is higher than actual bank receipt
            $amount = $validated['tampered_amount'] ? (float) $validated['tampered_amount'] : ($amount * 10);
        }

        $slipResult = $this->slipImageService->generateReceiptImage(
            $channel,
            $mode,
            [
                'transaction_id' => $txnId,
                'amount' => $amount,
                'sender_name' => $invoice->customer_name,
                'sender_phone' => $invoice->customer_phone ?? '09790001234',
                'datetime' => date('Y-m-d H:i:s'),
                'invoice_number' => $invoice->invoice_number,
            ]
        );

        // Store temporarily for preview in browser
        $previewFilename = "preview_" . md5(uniqid()) . ".png";
        Storage::disk('public')->put("slips/previews/" . $previewFilename, $slipResult['image_bytes']);

        return response()->json([
            'success' => true,
            'preview_url' => asset("storage/slips/previews/" . $previewFilename),
            'txn_id' => $txnId,
            'amount' => $amount,
            'mode' => $mode,
            'channel' => $channel,
            'image_hash' => $slipResult['image_hash'],
            'metadata' => $slipResult['metadata'],
        ]);
    }

    /**
     * 1-Click Inject Slip & Bank Row for Rapid Testing during live judge demo.
     */
    public function injectSlipAndBankRow(Request $request)
    {
        $validated = $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'channel' => 'required|in:kbzpay,wavepay,cbpay,ayapay',
            'mode' => 'required|in:legit,tampered_amount,duplicate_id',
            'txn_id' => 'required|string',
            'slip_amount' => 'required|numeric',
        ]);

        $invoice = Invoice::findOrFail($validated['invoice_id']);
        $channel = $validated['channel'];
        $mode = $validated['mode'];
        $txnId = $validated['txn_id'];
        $slipAmount = (float) $validated['slip_amount'];

        // Generate receipt image
        $slipResult = $this->slipImageService->generateReceiptImage($channel, $mode, [
            'transaction_id' => $txnId,
            'amount' => $slipAmount,
            'sender_name' => $invoice->customer_name,
            'sender_phone' => $invoice->customer_phone ?? '09790001234',
            'datetime' => date('Y-m-d H:i:s'),
            'invoice_number' => $invoice->invoice_number,
        ]);

        $storedPath = "slips/{$channel}/" . $slipResult['filename'];
        Storage::disk('public')->put($storedPath, $slipResult['image_bytes']);

        // Find or create batch
        $batch = BankStatementBatch::firstOrCreate(
            ['payment_channel' => $channel, 'statement_date' => date('Y-m-d')],
            [
                'uploaded_by' => $request->user()->id,
                'original_filename' => "Demo_{$channel}_" . date('Ymd') . ".csv",
                'total_records' => 0,
                'total_credit_amount' => 0,
                'status' => 'processed',
            ]
        );

        DB::beginTransaction();
        try {
            // Determine slip status and bank row
            $isTampered = ($mode === 'tampered_amount');
            $isDuplicate = ($mode === 'duplicate_id');

            $slipStatus = match ($mode) {
                'tampered_amount' => 'tampered_fraud',
                'duplicate_id' => 'duplicate_fraud',
                default => 'pending_recon',
            };

            // Create Payment Slip
            $slip = PaymentSlip::create([
                'invoice_id' => $invoice->id,
                'user_id' => $invoice->user_id,
                'payment_channel' => $channel,
                'image_path' => $storedPath,
                'image_hash' => $slipResult['image_hash'],
                'extracted_transaction_id' => $txnId,
                'extracted_amount' => $slipAmount,
                'extracted_datetime' => now(),
                'sender_phone' => $invoice->customer_phone ?? '09790001234',
                'sender_name' => $invoice->customer_name,
                'ocr_confidence' => $isTampered ? 40 : 98,
                'exif_tamper_flag' => $isTampered,
                'exif_metadata' => $slipResult['metadata'],
                'verification_status' => $slipStatus,
            ]);

            // Bank row gross amount
            // If tampered: bank actually received only 5,000 Ks!
            $bankGross = $isTampered ? 5000.00 : (float) $invoice->amount;

            // Only insert bank row if not duplicate or if we want bank row to match
            BankTransaction::updateOrCreate(
                [
                    'payment_channel' => $channel,
                    'bank_transaction_id' => $txnId,
                ],
                [
                    'batch_id' => $batch->id,
                    'transaction_datetime' => now()->subMinutes(10),
                    'sender_phone' => $invoice->customer_phone ?? '09790001234',
                    'sender_name' => $invoice->customer_name,
                    'gross_amount' => $bankGross,
                    'fee_amount' => 0,
                    'net_amount' => $bankGross,
                    'reference_note' => "PAY FOR {$invoice->invoice_number}",
                    'raw_payload' => ['mode' => $mode, 'demo_injection' => true],
                    'match_status' => 'unmatched',
                ]
            );

            // Update invoice status
            $invoice->update([
                'status' => $isTampered ? 'fraud_flagged' : 'pending_verification',
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return redirect()->back()->with('error', "Injection failed: " . $e->getMessage());
        }

        return redirect()->back()->with('success', "Injected slip [{$mode}] and matching bank transaction for Invoice {$invoice->invoice_number} successfully!");
    }

    /**
     * Reset Demo Environment back to clean initial 15 demo records.
     */
    public function resetDemoEnvironment(Request $request)
    {
        Artisan::call('migrate:fresh', [
            '--seed' => true,
            '--force' => true,
        ]);

        return redirect()->route('simulation-studio.index')
            ->with('success', 'Demo environment successfully reset and re-seeded to initial state (15 realistic MMK demo invoices across all channels)!');
    }
}
