<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReconciliationMatch;
use App\Services\AuditDateFilterService;
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
        $search = $request->query('search', '');

        $query = ReconciliationMatch::with([
            'invoice.customer',
            'paymentSlip',
            'bankTransaction.batch',
            'auditor',
        ]);

        // 1. Channel Filter
        if ($channel && $channel !== 'all' && in_array(strtolower($channel), ['kbzpay', 'wavepay', 'cbpay', 'ayapay', 'cash'])) {
            $ch = strtolower($channel);
            $query->where(function ($q) use ($ch) {
                $q->whereHas('paymentSlip', fn ($s) => $s->whereRaw('LOWER(payment_channel) = ?', [$ch]))
                    ->orWhere(function ($q2) use ($ch) {
                        $q2->whereNull('payment_slip_id')
                            ->where(function ($q3) use ($ch) {
                                $q3->whereHas('bankTransaction', fn ($b) => $b->whereRaw('LOWER(payment_channel) = ?', [$ch]))
                                    ->orWhereHas('invoice', fn ($i) => $i->whereRaw('LOWER(expected_channel) = ?', [$ch]));
                            });
                    });
            });
        }

        // 2. Status / Classification Filter
        if ($status && $status !== 'all') {
            $st = strtolower($status);
            if ($st === 'verified' || in_array($st, ['auto_approved', 'approved_by_accountant'])) {
                $query->whereIn('status', ['auto_approved', 'approved_by_accountant']);
            } elseif ($st === 'pending_review') {
                $query->where('status', 'pending_review');
            } elseif ($st === 'fraud' || $st === 'rejected_fraud') {
                $query->where(function ($q) {
                    $q->where('status', 'rejected_fraud')
                        ->orWhereIn('match_type', ['amount_mismatch_fraud', 'fake_slip_fraud', 'duplicate_id_fraud']);
                });
            }
        }

        // 3. Unified Search Filter (Invoice #, Customer Name, Phone, Bank Txn Ref)
        if (!empty($search)) {
            $s = trim($search);
            $query->where(function ($q) use ($s) {
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

        // 4. Default Date Scoping (This Month) & Interactive Calendar Range Filtering
        $dateFilters = AuditDateFilterService::apply($query, $request, 'created_at');

        // Fetch up to 500 audit records for the report
        $records = $query->latest('id')->limit(500)->get();

        // 5. Calculate Executive Audit Summary Figures based on active filtered query
        $totalRecords = $records->count();
        $matchedVolume = (float) $records->whereIn('status', ['auto_approved', 'approved_by_accountant'])->sum('invoice_amount');
        $totalVarianceFees = (float) $records->where('match_type', 'fee_adjusted_match')->sum('variance_amount');
        $fraudPrevented = (float) $records->filter(function ($r) {
            return $r->status === 'rejected_fraud' || str_contains((string) $r->match_type, 'fraud');
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
                'audit_period' => $dateFilters['scope_summary'],
            ],
            'filters' => [
                'channel'     => $channel,
                'status'      => $status,
                'search'      => $search,
                'date_scope'  => $dateFilters['date_scope'],
                'start_date'  => $dateFilters['start_date'],
                'end_date'    => $dateFilters['end_date'],
                'single_date' => $dateFilters['single_date'],
            ],
            'scopeSummary' => $dateFilters['scope_summary'],
            'isDefaultScope' => $dateFilters['is_default'],
        ]);
    }
}
