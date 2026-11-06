<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AccountNotification;
use App\Models\BankStatementBatch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminRollbackController extends Controller
{
    /**
     * Display the Dedicated Pending Rollbacks Queue for Chief Auditor.
     */
    public function index(Request $request): Response
    {
        $pendingBatches = BankStatementBatch::where('rollback_requested', true)
            ->with(['uploader:id,name,email', 'rollbackRequester:id,name,email'])
            ->latest('rollback_requested_at')
            ->get();

        $stats = [
            'pending_count' => $pendingBatches->count(),
            'total_affected_credit' => (float) $pendingBatches->sum('total_credit_amount'),
            'total_affected_records' => (int) $pendingBatches->sum('total_records'),
        ];

        return Inertia::render('Admin/Rollbacks', [
            'pendingBatches' => $pendingBatches,
            'stats' => $stats,
        ]);
    }

    /**
     * Approve and execute permanent purge of the statement batch and its ledger rows.
     */
    public function approve(Request $request, BankStatementBatch $batch): RedirectResponse
    {
        if (!$request->user()->hasRole('admin')) {
            abort(403, 'Unauthorized. Only Chief Auditor has authority to approve rollbacks.');
        }

        $filename = $batch->original_filename;
        $count = $batch->total_records;
        $requesterId = $batch->rollback_requested_by;

        $batch->delete();

        if ($requesterId) {
            AccountNotification::create([
                'user_id'    => $requesterId,
                'title'      => 'Rollback Approved / ဖျက်သိမ်းမှု အတည်ပြုပြီးပါပြီ',
                'message'    => "Chief Auditor approved rollback for statement batch '{$filename}'. {$count} transactions were purged.",
                'type'       => 'success',
                'action_url' => '/bank-statements',
            ]);
        }

        return redirect()->route('admin.rollbacks.index')
            ->with('success', "Batch '{$filename}' and all its {$count} transactions were permanently rolled back and purged.");
    }

    /**
     * Dismiss / reject a rollback request and restore standard ledger status.
     */
    public function dismiss(Request $request, BankStatementBatch $batch): RedirectResponse
    {
        if (!$request->user()->hasRole('admin')) {
            abort(403, 'Unauthorized. Only Chief Auditor has authority to dismiss rollbacks.');
        }

        $filename = $batch->original_filename;
        $requesterId = $batch->rollback_requested_by;

        $batch->update([
            'rollback_requested'    => false,
            'rollback_reason'       => null,
            'rollback_requested_at' => null,
            'rollback_requested_by' => null,
        ]);

        if ($requesterId) {
            AccountNotification::create([
                'user_id'    => $requesterId,
                'title'      => 'Rollback Dismissed / ဖျက်သိမ်းရန်တောင်းဆိုချက် ပယ်ချခံရပါသည်',
                'message'    => "Chief Auditor reviewed and dismissed the rollback request for batch '{$filename}'. The batch remains active.",
                'type'       => 'info',
                'action_url' => '/bank-statements',
            ]);
        }

        return redirect()->route('admin.rollbacks.index')
            ->with('success', "Rollback request for batch '{$filename}' was dismissed. Batch remains active in ledger.");
    }
}
