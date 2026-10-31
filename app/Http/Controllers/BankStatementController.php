<?php

namespace App\Http\Controllers;

use App\Models\BankStatementBatch;
use App\Models\BankTransaction;
use App\Services\BankStatementIngestionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class BankStatementController extends Controller
{
    public function __construct(
        protected BankStatementIngestionService $ingestionService
    ) {}

    /**
     * Display the bank statement ingestion dashboard and unified ledger.
     */
    public function index(Request $request): Response
    {
        $channelFilter = $request->query('channel');
        $statusFilter = $request->query('status');
        $search = $request->query('search');

        // Summary KPI Metrics
        $totalBatches = BankStatementBatch::count();
        $totalVolumeMmk = (float) BankTransaction::sum('gross_amount');
        $channelsCovered = BankStatementBatch::distinct('payment_channel')->count('payment_channel');
        $unreconciledTxns = BankTransaction::where('match_status', 'unmatched')->count();

        // Channel distribution
        $channelCounts = BankTransaction::selectRaw('payment_channel, count(*) as count, sum(gross_amount) as total')
            ->groupBy('payment_channel')
            ->get()
            ->keyBy('payment_channel');

        // Batches List
        $batches = BankStatementBatch::with('uploader:id,name,email')
            ->latest('id')
            ->paginate(8, ['*'], 'batches_page')
            ->withQueryString();

        // Filterable Bank Transaction Ledger
        $txQuery = BankTransaction::with('batch:id,original_filename');

        if ($channelFilter && in_array(strtolower($channelFilter), ['kbzpay', 'wavepay', 'cbpay', 'ayapay'])) {
            $txQuery->where('payment_channel', strtolower($channelFilter));
        }

        if ($statusFilter && in_array(strtolower($statusFilter), ['unmatched', 'matched', 'fuzzy_matched', 'suspense', 'disputed'])) {
            $txQuery->where('match_status', strtolower($statusFilter));
        }

        if ($search) {
            $txQuery->where(function ($q) use ($search) {
                $q->where('bank_transaction_id', 'like', "%{$search}%")
                    ->orWhere('sender_phone', 'like', "%{$search}%")
                    ->orWhere('sender_name', 'like', "%{$search}%")
                    ->orWhere('reference_note', 'like', "%{$search}%");
            });
        }

        $transactions = $txQuery->latest('id')
            ->paginate(15, ['*'], 'tx_page')
            ->withQueryString();

        return Inertia::render('BankStatements/Index', [
            'metrics' => [
                'total_batches' => $totalBatches,
                'total_volume_mmk' => $totalVolumeMmk,
                'formatted_volume_mmk' => number_format($totalVolumeMmk, 2),
                'channels_covered' => $channelsCovered,
                'unreconciled_txns' => $unreconciledTxns,
                'channel_counts' => $channelCounts,
            ],
            'batches' => $batches,
            'transactions' => $transactions,
            'filters' => [
                'channel' => $channelFilter ?: 'all',
                'status' => $statusFilter ?: 'all',
                'search' => $search ?: '',
            ],
        ]);
    }

    /**
     * Upload and ingest a new bank statement CSV.
     */
    public function upload(Request $request): RedirectResponse
    {
        $request->validate([
            'statement_file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
            'payment_channel' => ['nullable', 'string', 'in:auto,kbzpay,wavepay,cbpay,ayapay'],
        ], [
            'statement_file.required' => 'Please select a CSV statement file to upload.',
            'statement_file.mimes' => 'The statement file must be a standard CSV or TXT file.',
            'statement_file.max' => 'The file size must not exceed 10 MB.',
        ]);

        $uploadedFile = $request->file('statement_file');
        $channel = $request->input('payment_channel', 'auto');

        // Store file in private statements directory
        $storedPath = $uploadedFile->store('statements', 'local');
        $absolutePath = Storage::disk('local')->path($storedPath);

        $result = $this->ingestionService->ingest(
            file: $absolutePath,
            channel: $channel,
            uploader: $request->user(),
            originalFilename: $uploadedFile->getClientOriginalName()
        );

        $channelName = strtoupper($result['channel']);
        $msg = "Successfully ingested {$result['imported_records']} transactions ({$result['formatted_amount']} MMK) from {$result['batch']->original_filename} [{$channelName}].";
        if ($result['duplicate_records'] > 0) {
            $msg .= " ({$result['duplicate_records']} existing duplicates were skipped).";
        }

        return redirect()->route('bank-statements.index')->with('success', $msg);
    }

    /**
     * Display a specific statement batch and all its parsed transactions.
     */
    public function show(BankStatementBatch $batch): Response
    {
        $batch->load('uploader:id,name,email');

        $transactions = BankTransaction::where('batch_id', $batch->id)
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('BankStatements/Show', [
            'batch' => $batch,
            'transactions' => $transactions,
        ]);
    }

    /**
     * Rollback/delete an uploaded batch and all its associated transactions.
     */
    public function destroy(BankStatementBatch $batch): RedirectResponse
    {
        $filename = $batch->original_filename;
        $count = $batch->transactions()->count();

        $batch->delete();

        return redirect()->route('bank-statements.index')
            ->with('success', "Batch '{$filename}' and all its {$count} transactions were successfully removed.");
    }
}
