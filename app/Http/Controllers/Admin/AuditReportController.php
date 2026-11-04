<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReconciliationMatch;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditReportController extends Controller
{
    /**
     * Display the official printable and exportable PDF Reconciliation Audit Report.
     */
    public function index(Request $request): Response
    {
        $channel = $request->query('channel', 'all');
        $status = $request->query('status', 'all');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $query = ReconciliationMatch::with([
            'invoice.customer',
            'paymentSlip',
            'bankTransaction.batch',
            'auditor',
        ]);

        if ($channel && in_array(strtolower($channel), ['kbzpay', 'wavepay', 'cbpay', 'ayapay'])) {
            $ch = strtolower($channel);
            $query->where(function ($q) use ($ch) {
                $q->whereHas('paymentSlip', fn ($s) => $s->where('payment_channel', $ch))
                    ->orWhereHas('bankTransaction', fn ($b) => $b->where('payment_channel', $ch))
                    ->orWhereHas('invoice', fn ($i) => $i->where('expected_channel', $ch));
            });
        }

        if ($status && in_array(strtolower($status), ['auto_approved', 'approved_by_accountant', 'pending_review', 'rejected_fraud'])) {
            $query->where('status', strtolower($status));
        }

        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        $records = $query->latest('id')->limit(300)->get();

        // Calculate Executive Audit Summary Figures
        $totalRecords = $records->count();
        $matchedVolume = (float) $records->whereIn('status', ['auto_approved', 'approved_by_accountant'])->sum('invoice_amount');
        $totalVarianceFees = (float) $records->where('match_type', 'fee_adjusted_match')->sum('variance_amount');
        $fraudPrevented = (float) $records->where(function ($r) {
            return $r->status === 'rejected_fraud' || str_contains($r->match_type, 'fraud');
        })->sum('variance_amount');

        return Inertia::render('Admin/AuditReport', [
            'records' => $records,
            'can_export_pdf' => $request->user()->hasRole('admin'),
            'summary' => [
                'total_records' => $totalRecords,
                'matched_volume' => $matchedVolume,
                'formatted_matched_volume' => number_format($matchedVolume, 2),
                'total_variance_fees' => $totalVarianceFees,
                'formatted_variance_fees' => number_format($totalVarianceFees, 2),
                'fraud_prevented' => $fraudPrevented,
                'formatted_fraud_prevented' => number_format($fraudPrevented, 2),
                'generation_timestamp' => Carbon::now()->format('d M Y, h:i A (T)'),
                'auditor_name' => $request->user()->name,
                'auditor_email' => $request->user()->email,
                'report_ref' => 'AUD-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6)),
            ],
            'filters' => [
                'channel' => $channel,
                'status' => $status,
                'start_date' => $startDate ?: '',
                'end_date' => $endDate ?: '',
            ],
        ]);
    }
}
