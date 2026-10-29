<?php

namespace App\Http\Controllers;

use App\Models\BankTransaction;
use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\ReconciliationMatch;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the FinTech reconciliation and fraud analytics dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isCustomer = $user->hasRole('customer') && ! $user->hasAnyRole(['admin', 'accountant']);

        // Base queries scoped for role (customer sees only their own data; admin/accountant see system-wide)
        $invoicesQuery = Invoice::query();
        $slipsQuery = PaymentSlip::query();
        $matchesQuery = ReconciliationMatch::with(['invoice', 'paymentSlip', 'bankTransaction', 'auditor']);

        if ($isCustomer) {
            $invoicesQuery->where('user_id', $user->id);
            $slipsQuery->where('user_id', $user->id);
            $matchesQuery->whereHas('invoice', fn ($q) => $q->where('user_id', $user->id));
        }

        // Live Financial Metrics
        $totalInvoicesCount = (clone $invoicesQuery)->count();
        $totalExpectedRevenue = (clone $invoicesQuery)->sum('amount');

        $reconciledVolume = (clone $invoicesQuery)
            ->where('status', 'reconciled')
            ->sum('amount');

        // Channel breakdown of verified/reconciled volume
        $channelVolumes = [
            'kbzpay' => (float) (clone $invoicesQuery)->where('status', 'reconciled')->where('expected_channel', 'kbzpay')->sum('amount'),
            'wavepay' => (float) (clone $invoicesQuery)->where('status', 'reconciled')->where('expected_channel', 'wavepay')->sum('amount'),
            'cbpay' => (float) (clone $invoicesQuery)->where('status', 'reconciled')->where('expected_channel', 'cbpay')->sum('amount'),
            'ayapay' => (float) (clone $invoicesQuery)->where('status', 'reconciled')->where('expected_channel', 'ayapay')->sum('amount'),
        ];

        // Slips & Verification Alerts
        $pendingSlipsCount = (clone $slipsQuery)
            ->where('verification_status', 'pending_recon')
            ->count();

        $fraudAlertsCount = (clone $invoicesQuery)
            ->whereIn('status', ['fraud_flagged', 'discrepancy'])
            ->count();

        // Recent Reconciliation & Slip Activity
        $recentMatches = $matchesQuery
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(function (ReconciliationMatch $match) {
                return [
                    'id' => $match->id,
                    'invoice_number' => $match->invoice?->invoice_number ?? 'N/A',
                    'customer_name' => $match->invoice?->customer_name ?? 'N/A',
                    'channel' => $match->paymentSlip?->payment_channel ?? $match->invoice?->expected_channel ?? 'any',
                    'slip_tx_id' => $match->paymentSlip?->extracted_transaction_id ?? 'N/A',
                    'match_type' => $match->match_type,
                    'confidence_score' => (float) $match->confidence_score,
                    'invoice_amount' => (float) ($match->invoice_amount ?? 0),
                    'slip_amount' => (float) ($match->slip_amount ?? 0),
                    'bank_amount' => (float) ($match->bank_amount ?? 0),
                    'variance_amount' => (float) $match->variance_amount,
                    'status' => $match->status,
                    'notes' => $match->notes,
                    'created_at' => $match->created_at?->diffForHumans() ?? '',
                ];
            });

        // Summary Statistics Box
        $metrics = [
            'total_invoices' => $totalInvoicesCount,
            'expected_revenue' => (float) $totalExpectedRevenue,
            'reconciled_volume' => (float) $reconciledVolume,
            'pending_slips' => $pendingSlipsCount,
            'fraud_alerts' => $fraudAlertsCount,
            'channel_volumes' => $channelVolumes,
        ];

        return Inertia::render('Dashboard', [
            'metrics' => $metrics,
            'recentMatches' => $recentMatches,
            'userRole' => $user->getRoleNames()->first() ?? 'customer',
        ]);
    }
}
