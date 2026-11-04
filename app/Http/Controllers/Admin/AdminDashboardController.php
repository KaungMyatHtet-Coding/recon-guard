<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BankTransaction;
use App\Models\Invoice;
use App\Models\ReconciliationMatch;
use App\Models\SystemSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    /**
     * Show the secondary admin security passcode gate.
     */
    public function showGate(Request $request): Response|RedirectResponse
    {
        if ($request->session()->get('admin_passcode_verified') === true) {
            return redirect()->route('admin.dashboard');
        }

        return Inertia::render('Admin/Gate');
    }

    /**
     * Verify the entered admin passcode.
     */
    public function verifyGate(Request $request): RedirectResponse
    {
        $request->validate([
            'passcode' => ['required', 'string'],
        ], [
            'passcode.required' => 'Please enter the Chief Auditor security passcode.',
        ]);

        $hashed = SystemSetting::get('admin_panel_passcode');
        if (!$hashed) {
            $hashed = Hash::make('admin1234');
            SystemSetting::set('admin_panel_passcode', $hashed);
        }

        if (Hash::check($request->passcode, $hashed)) {
            $request->session()->put('admin_passcode_verified', true);
            return redirect()->intended(route('admin.dashboard'))
                ->with('success', 'Security gate unlocked. Welcome, Chief Auditor.');
        }

        return back()->withErrors([
            'passcode' => 'Invalid administrative security passcode. Access denied.',
        ]);
    }

    /**
     * Update the Chief Auditor secondary passcode.
     */
    public function updatePasscode(Request $request): RedirectResponse
    {
        $request->validate([
            'current_passcode' => ['required', 'string'],
            'new_passcode' => ['required', 'string', 'min:6'],
        ]);

        $hashed = SystemSetting::get('admin_panel_passcode') ?: Hash::make('admin1234');

        if (!Hash::check($request->current_passcode, $hashed)) {
            return back()->withErrors([
                'current_passcode' => 'The current security passcode is incorrect.',
            ]);
        }

        SystemSetting::set('admin_panel_passcode', Hash::make($request->new_passcode));

        return back()->with('success', 'Chief Auditor security passcode has been updated successfully.');
    }

    /**
     * Display the Executive Auditor Governance Suite with Visual Analytics.
     */
    public function index(Request $request): Response
    {
        // 1. Financial Health KPIs
        $totalProcessedVolume = (float) BankTransaction::sum('gross_amount');
        $totalInvoices = Invoice::count();
        $reconciledInvoices = Invoice::where('status', 'reconciled')->count();
        $autoReconSuccessRate = $totalInvoices > 0 ? round(($reconciledInvoices / $totalInvoices) * 100, 1) : 0.0;

        // Total Fraud Prevented in MMK (Variance caught on rejected fraudulent slips)
        $totalFraudPrevented = (float) ReconciliationMatch::where(function ($q) {
            $q->where('status', 'rejected_fraud')
                ->orWhereIn('match_type', ['amount_mismatch_fraud', 'fake_slip_fraud', 'duplicate_id_fraud']);
        })->sum('variance_amount');

        $unresolvedSuspenseCount = BankTransaction::where('match_status', 'suspense')->count();
        $unresolvedSuspenseVolume = (float) BankTransaction::where('match_status', 'suspense')->sum('gross_amount');

        // 2. Reconciliation Breakdown for Donut Chart
        $exactCount = ReconciliationMatch::where('match_type', 'exact_match')->count();
        $feeAdjustedCount = ReconciliationMatch::where('match_type', 'fee_adjusted_match')->count();
        $fuzzyCount = ReconciliationMatch::where('match_type', 'fuzzy_match')->count();
        $fraudCount = ReconciliationMatch::where(function ($q) {
            $q->where('status', 'rejected_fraud')
                ->orWhereIn('match_type', ['amount_mismatch_fraud', 'fake_slip_fraud', 'duplicate_id_fraud']);
        })->count();

        $donutStats = [
            'exact' => $exactCount,
            'fee_adjusted' => $feeAdjustedCount,
            'fuzzy' => $fuzzyCount,
            'fraud' => $fraudCount,
            'total' => $exactCount + $feeAdjustedCount + $fuzzyCount + $fraudCount,
        ];

        // 3. Channel Performance Bar Chart Data
        $channels = ['kbzpay', 'wavepay', 'cbpay', 'ayapay'];
        $channelStats = [];

        foreach ($channels as $ch) {
            $volume = (float) BankTransaction::where('payment_channel', $ch)->sum('gross_amount');
            $txCount = BankTransaction::where('payment_channel', $ch)->count();
            $matchedCount = BankTransaction::where('payment_channel', $ch)->where('match_status', 'matched')->count();

            $channelStats[$ch] = [
                'channel' => $ch,
                'volume' => $volume,
                'formatted_volume' => number_format($volume, 2),
                'tx_count' => $txCount,
                'matched_count' => $matchedCount,
            ];
        }

        return Inertia::render('Admin/Dashboard', [
            'kpis' => [
                'total_processed_volume' => $totalProcessedVolume,
                'formatted_processed_volume' => number_format($totalProcessedVolume, 2),
                'auto_recon_success_rate' => $autoReconSuccessRate,
                'total_fraud_prevented' => $totalFraudPrevented,
                'formatted_fraud_prevented' => number_format($totalFraudPrevented, 2),
                'unresolved_suspense_count' => $unresolvedSuspenseCount,
                'unresolved_suspense_volume' => $unresolvedSuspenseVolume,
                'formatted_suspense_volume' => number_format($unresolvedSuspenseVolume, 2),
            ],
            'donutStats' => $donutStats,
            'channelStats' => $channelStats,
        ]);
    }
}
