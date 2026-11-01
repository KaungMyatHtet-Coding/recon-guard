<?php

namespace App\Http\Controllers;

use App\Models\BankTransaction;
use App\Models\Invoice;
use App\Models\ReconciliationMatch;
use App\Services\ReconciliationEngineService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReconciliationController extends Controller
{
    public function __construct(
        protected ReconciliationEngineService $engineService
    ) {}

    /**
     * Display the 3-Way Reconciliation Workbench and Audit Feed.
     */
    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'all');
        $channel = $request->query('channel', 'all');
        $search = $request->query('search', '');

        // Summary Financial KPIs
        $totalInvoices = Invoice::count();
        $reconciledInvoices = Invoice::where('status', 'reconciled')->count();
        $reconciliationRate = $totalInvoices > 0 ? round(($reconciledInvoices / $totalInvoices) * 100, 1) : 0.0;

        $autoApprovedVolume = (float) ReconciliationMatch::whereIn('status', ['auto_approved', 'approved_by_accountant'])
            ->sum('invoice_amount');

        $pendingReviewsCount = ReconciliationMatch::where('status', 'pending_review')->count();

        $fraudAlertsCount = ReconciliationMatch::where('status', 'rejected_fraud')
            ->orWhereIn('match_type', ['amount_mismatch_fraud', 'fake_slip_fraud', 'duplicate_id_fraud'])
            ->count();

        $suspenseTxnsCount = BankTransaction::where('match_status', 'suspense')->count();
        $suspenseVolume = (float) BankTransaction::where('match_status', 'suspense')->sum('gross_amount');

        // Audit Feed Query
        $matchesQuery = ReconciliationMatch::with([
            'invoice.customer',
            'paymentSlip',
            'bankTransaction.batch',
            'auditor:id,name,email',
        ]);

        // Filter by Tab
        switch ($tab) {
            case 'exact':
                $matchesQuery->whereIn('match_type', ['exact_match', 'fee_adjusted_match'])
                    ->whereIn('status', ['auto_approved', 'approved_by_accountant']);
                break;
            case 'pending_review':
                $matchesQuery->where('status', 'pending_review');
                break;
            case 'fraud':
                $matchesQuery->where(function ($q) {
                    $q->where('status', 'rejected_fraud')
                        ->orWhereIn('match_type', ['amount_mismatch_fraud', 'fake_slip_fraud', 'duplicate_id_fraud']);
                });
                break;
            case 'all':
            default:
                break;
        }

        // Filter by Channel
        if ($channel && in_array(strtolower($channel), ['kbzpay', 'wavepay', 'cbpay', 'ayapay'])) {
            $ch = strtolower($channel);
            $matchesQuery->where(function ($q) use ($ch) {
                $q->whereHas('paymentSlip', fn ($s) => $s->where('payment_channel', $ch))
                    ->orWhereHas('bankTransaction', fn ($b) => $b->where('payment_channel', $ch))
                    ->orWhereHas('invoice', fn ($i) => $i->where('expected_channel', $ch));
            });
        }

        // Filter by Search
        if ($search && trim($search) !== '') {
            $s = trim($search);
            $matchesQuery->where(function ($q) use ($s) {
                $q->whereHas('invoice', function ($iq) use ($s) {
                    $iq->where('invoice_number', 'like', "%{$s}%")
                        ->orWhere('customer_name', 'like', "%{$s}%")
                        ->orWhere('customer_phone', 'like', "%{$s}%");
                })->orWhereHas('paymentSlip', function ($sq) use ($s) {
                    $sq->where('extracted_transaction_id', 'like', "%{$s}%")
                        ->orWhere('sender_phone', 'like', "%{$s}%")
                        ->orWhere('sender_name', 'like', "%{$s}%");
                })->orWhereHas('bankTransaction', function ($bq) use ($s) {
                    $bq->where('bank_transaction_id', 'like', "%{$s}%")
                        ->orWhere('sender_phone', 'like', "%{$s}%")
                        ->orWhere('sender_name', 'like', "%{$s}%");
                });
            });
        }

        $matches = $matchesQuery->latest('id')
            ->paginate(15)
            ->withQueryString();

        // Suspense Transactions (for Suspense Ledger tab)
        $suspenseQuery = BankTransaction::with('batch:id,original_filename')
            ->where('match_status', 'suspense');

        if ($channel && in_array(strtolower($channel), ['kbzpay', 'wavepay', 'cbpay', 'ayapay'])) {
            $suspenseQuery->where('payment_channel', strtolower($channel));
        }

        if ($search && trim($search) !== '') {
            $s = trim($search);
            $suspenseQuery->where(function ($q) use ($s) {
                $q->where('bank_transaction_id', 'like', "%{$s}%")
                    ->orWhere('sender_phone', 'like', "%{$s}%")
                    ->orWhere('sender_name', 'like', "%{$s}%")
                    ->orWhere('reference_note', 'like', "%{$s}%");
            });
        }

        $suspenseItems = $suspenseQuery->latest('id')
            ->paginate(15, ['*'], 'suspense_page')
            ->withQueryString();

        return Inertia::render('Reconciliation/Index', [
            'metrics' => [
                'total_invoices' => $totalInvoices,
                'reconciled_invoices' => $reconciledInvoices,
                'reconciliation_rate' => $reconciliationRate,
                'auto_approved_volume' => $autoApprovedVolume,
                'formatted_auto_approved_volume' => number_format($autoApprovedVolume, 2),
                'pending_reviews_count' => $pendingReviewsCount,
                'fraud_alerts_count' => $fraudAlertsCount,
                'suspense_txns_count' => $suspenseTxnsCount,
                'suspense_volume' => $suspenseVolume,
                'formatted_suspense_volume' => number_format($suspenseVolume, 2),
            ],
            'matches' => $matches,
            'suspenseItems' => $suspenseItems,
            'filters' => [
                'tab' => $tab,
                'channel' => $channel,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Trigger the 3-Way Automated Reconciliation Engine.
     */
    public function run(Request $request): RedirectResponse
    {
        $channel = $request->input('payment_channel', 'all');

        $result = $this->engineService->run($channel, $request->user());

        $msg = "Reconciliation Run Finished: {$result['exact_matches']} Exact Matches, {$result['fee_adjusted']} Fee-Adjusted, {$result['fuzzy_matches']} Fuzzy Matches for Review, {$result['fraud_caught']} Fraud Alerts Caught. Settled Volume: {$result['formatted_total_reconciled']} MMK.";
        if ($result['suspense_count'] > 0) {
            $msg .= " ({$result['suspense_count']} Unclaimed transactions moved to Suspense).";
        }

        return redirect()->route('reconciliation.index')->with('success', $msg);
    }

    /**
     * Accountant approves a fuzzy match or fee variance record.
     */
    public function approve(Request $request, ReconciliationMatch $match): RedirectResponse
    {
        $request->validate([
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($match, $request) {
            $auditorName = $request->user()->name;
            $note = $request->input('notes');
            $append = "Approved by {$auditorName}" . ($note ? ": {$note}" : "");

            $match->update([
                'status' => 'approved_by_accountant',
                'reconciled_by' => $request->user()->id,
                'notes' => $match->notes ? "{$match->notes} | {$append}" : $append,
            ]);

            if ($match->invoice) {
                $match->invoice->update(['status' => 'reconciled']);
            }
            if ($match->paymentSlip) {
                $match->paymentSlip->update(['verification_status' => 'matched']);
            }
            if ($match->bankTransaction) {
                $match->bankTransaction->update(['match_status' => 'matched']);
            }
        });

        return redirect()->route('reconciliation.index')
            ->with('success', "Match #{$match->id} was approved by {$request->user()->name} and marked as reconciled.");
    }

    /**
     * Accountant rejects a match as fraud or discrepancy.
     */
    public function reject(Request $request, ReconciliationMatch $match): RedirectResponse
    {
        $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ], [
            'reason.required' => 'Please provide a reason for rejecting this reconciliation match.',
            'reason.min' => 'Rejection reason must be at least 3 characters.',
        ]);

        DB::transaction(function () use ($match, $request) {
            $auditorName = $request->user()->name;
            $reason = $request->input('reason');
            $append = "Rejected by {$auditorName}: {$reason}";

            $match->update([
                'status' => 'rejected_fraud',
                'reconciled_by' => $request->user()->id,
                'notes' => $match->notes ? "{$match->notes} | {$append}" : $append,
            ]);

            if ($match->invoice) {
                $match->invoice->update(['status' => 'fraud_flagged']);
            }
            if ($match->paymentSlip) {
                $match->paymentSlip->update(['verification_status' => 'tampered_fraud']);
            }
            if ($match->bankTransaction) {
                $match->bankTransaction->update(['match_status' => 'disputed']);
            }
        });

        return redirect()->route('reconciliation.index')
            ->with('success', "Match #{$match->id} was flagged as fraud/discrepancy.");
    }
}
