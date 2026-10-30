<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\User;
use App\Services\SlipOcrAndForensicsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class InvoicePaymentController extends Controller
{
    protected SlipOcrAndForensicsService $ocrService;

    public function __construct(SlipOcrAndForensicsService $ocrService)
    {
        $this->ocrService = $ocrService;
    }

    /**
     * Display a listing of invoices.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isCustomer = $user->hasRole('customer') && ! $user->hasAnyRole(['admin', 'accountant']);

        $query = Invoice::query()->withCount('paymentSlips');

        if ($isCustomer) {
            $query->where('user_id', $user->id);
        }

        // Filter tab
        $tab = $request->query('tab', 'all');
        if ($tab === 'unpaid') {
            $query->where('status', 'unpaid');
        } elseif ($tab === 'pending') {
            $query->where('status', 'pending_verification');
        } elseif ($tab === 'reconciled') {
            $query->where('status', 'reconciled');
        } elseif ($tab === 'flagged') {
            $query->whereIn('status', ['fraud_flagged', 'discrepancy']);
        }

        $invoices = $query->latest('id')->paginate(15)->withQueryString();

        // Summary counts
        $countsQuery = Invoice::query();
        if ($isCustomer) {
            $countsQuery->where('user_id', $user->id);
        }

        $stats = [
            'total' => (clone $countsQuery)->count(),
            'unpaid' => (clone $countsQuery)->where('status', 'unpaid')->count(),
            'pending' => (clone $countsQuery)->where('status', 'pending_verification')->count(),
            'reconciled' => (clone $countsQuery)->where('status', 'reconciled')->count(),
            'flagged' => (clone $countsQuery)->whereIn('status', ['fraud_flagged', 'discrepancy'])->count(),
        ];

        // Customers list for admin/accountant to create invoice
        $customers = (! $isCustomer)
            ? User::role('customer')->get(['id', 'name', 'phone', 'company_name', 'email'])
            : [];

        return Inertia::render('Invoices/Index', [
            'invoices' => $invoices,
            'stats' => $stats,
            'currentTab' => $tab,
            'customers' => $customers,
            'canCreateInvoice' => ! $isCustomer,
        ]);
    }

    /**
     * Store a newly created invoice (Admin / Accountant demo helper).
     */
    public function store(Request $request): RedirectResponse
    {
        if ($request->user()->hasRole('customer') && ! $request->user()->hasAnyRole(['admin', 'accountant'])) {
            abort(403);
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:1000',
            'expected_channel' => 'required|in:any,kbzpay,wavepay,cbpay,ayapay',
            'description' => 'nullable|string|max:255',
            'due_date' => 'nullable|date',
        ]);

        $customer = User::findOrFail($validated['user_id']);
        $invoiceNum = 'INV-' . date('Y') . '-' . str_pad((string) mt_rand(1000, 999999), 6, '0', STR_PAD_LEFT);

        $invoice = Invoice::create([
            'invoice_number' => $invoiceNum,
            'user_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone ?? '09#########',
            'description' => $validated['description'] ?? "Commercial Invoice for {$customer->name}",
            'amount' => $validated['amount'],
            'expected_channel' => $validated['expected_channel'],
            'status' => 'unpaid',
            'due_date' => $validated['due_date'] ?? now()->addDays(7)->toDateString(),
        ]);

        return redirect()->route('invoices.show', $invoice)
            ->with('success', "Invoice {$invoice->invoice_number} created successfully!");
    }

    /**
     * Display the specified invoice and payment/slip portal.
     */
    public function show(Request $request, Invoice $invoice): Response
    {
        $user = $request->user();
        if ($user->hasRole('customer') && ! $user->hasAnyRole(['admin', 'accountant']) && $invoice->user_id !== $user->id) {
            abort(403);
        }

        $invoice->load(['paymentSlips' => fn ($q) => $q->latest('id')]);

        // Merchant Payment Accounts & QR info for customer payment guidance
        $merchantAccounts = [
            'kbzpay' => [
                'name' => 'KBZPay Merchant QR',
                'account_name' => 'ReconGuard Enterprise Co., Ltd.',
                'account_number' => '09790001234 (Merchant ID: 889201)',
                'color' => '#0284c7',
                'guide' => 'Open KBZPay App -> Scan Merchant QR or Transfer to Merchant ID 889201.',
            ],
            'wavepay' => [
                'name' => 'WavePay Corporate QR',
                'account_name' => 'ReconGuard Enterprise Co., Ltd.',
                'account_number' => '09960005678 (Shop Code: 9942)',
                'color' => '#eab308',
                'guide' => 'Open WavePay App -> Pay Bill / Scan QR -> Enter Reference Note.',
            ],
            'cbpay' => [
                'name' => 'CB Pay Mobile Corporate',
                'account_name' => 'ReconGuard Enterprise Co., Ltd.',
                'account_number' => '2001-8930-4920-1120',
                'color' => '#dc2626',
                'guide' => 'Transfer via CB Pay or CB Bank Internet Banking -> Attach Reference Number.',
            ],
            'ayapay' => [
                'name' => 'AYA Pay Business Gateway',
                'account_name' => 'ReconGuard Enterprise Co., Ltd.',
                'account_number' => '09770009988 (Merchant AYA-091)',
                'color' => '#e11d48',
                'guide' => 'Open AYA Pay App -> Merchant Payment -> Enter Invoice Number in remarks.',
            ],
        ];

        return Inertia::render('Invoices/Show', [
            'invoice' => $invoice,
            'merchantAccounts' => $merchantAccounts,
            'submittedSlips' => $invoice->paymentSlips->map(function ($s) {
                return [
                    'id' => $s->id,
                    'channel' => $s->payment_channel,
                    'image_url' => asset('storage/' . $s->image_path),
                    'image_hash' => $s->image_hash,
                    'transaction_id' => $s->extracted_transaction_id,
                    'amount' => (float) $s->extracted_amount,
                    'datetime' => $s->extracted_datetime?->format('Y-m-d H:i:s'),
                    'sender_phone' => $s->sender_phone,
                    'sender_name' => $s->sender_name,
                    'ocr_confidence' => $s->ocr_confidence,
                    'exif_tamper_flag' => (bool) $s->exif_tamper_flag,
                    'exif_metadata' => $s->exif_metadata,
                    'verification_status' => $s->verification_status,
                    'created_at' => $s->created_at->diffForHumans(),
                ];
            }),
        ]);
    }

    /**
     * Live OCR & Forensics Scanner API (Pre-submission analysis).
     */
    public function analyzeSlip(Request $request, Invoice $invoice): JsonResponse
    {
        $request->validate([
            'slip_file' => 'required|file|mimes:png,jpg,jpeg,webp|max:5120',
            'channel' => 'nullable|string|in:kbzpay,wavepay,cbpay,ayapay',
        ]);

        $file = $request->file('slip_file');
        $channelHint = $request->input('channel') ?? $invoice->expected_channel;

        $analysis = $this->ocrService->analyzeSlip($file, $invoice, $channelHint);

        return response()->json([
            'success' => true,
            'analysis' => $analysis,
        ]);
    }

    /**
     * Final submission of the payment slip.
     */
    public function submitSlip(Request $request, Invoice $invoice): RedirectResponse
    {
        $user = $request->user();
        if ($user->hasRole('customer') && ! $user->hasAnyRole(['admin', 'accountant']) && $invoice->user_id !== $user->id) {
            abort(403);
        }

        $validated = $request->validate([
            'slip_file' => 'required|file|mimes:png,jpg,jpeg,webp|max:5120',
            'payment_channel' => 'required|in:kbzpay,wavepay,cbpay,ayapay',
            'extracted_transaction_id' => 'required|string|max:100',
            'extracted_amount' => 'required|numeric|min:1',
            'sender_phone' => 'nullable|string|max:50',
            'sender_name' => 'nullable|string|max:100',
            'ocr_confidence' => 'nullable|integer|min:0|max:100',
            'exif_tamper_flag' => 'nullable|boolean',
        ]);

        $file = $request->file('slip_file');

        // Execute deep forensics & 3-layer pre-check passing the user-specified/extracted transaction ID
        $analysis = $this->ocrService->analyzeSlip(
            $file,
            $invoice,
            $validated['payment_channel'],
            $validated['extracted_transaction_id']
        );

        $imageHash = $analysis['image_hash'];
        $isTampered = $analysis['exif_tamper_flag'] || ! empty($validated['exif_tamper_flag']);
        $verificationStatus = $analysis['suggested_status'];

        // Store file in public storage disk
        $filename = 'slip_' . $validated['payment_channel'] . '_' . date('Ymd_His') . '_' . substr(md5(uniqid()), 0, 8) . '.' . $file->getClientOriginalExtension();
        $storedPath = $file->storeAs("slips/{$validated['payment_channel']}", $filename, 'public');

        DB::beginTransaction();
        try {
            $slip = PaymentSlip::create([
                'invoice_id' => $invoice->id,
                'user_id' => $user->id,
                'payment_channel' => $validated['payment_channel'],
                'image_path' => $storedPath,
                'image_hash' => $imageHash,
                'extracted_transaction_id' => $validated['extracted_transaction_id'],
                'extracted_amount' => $validated['extracted_amount'],
                'extracted_datetime' => now(),
                'sender_phone' => $validated['sender_phone'] ?? $analysis['sender_phone'],
                'sender_name' => $validated['sender_name'] ?? $analysis['sender_name'],
                'ocr_confidence' => $validated['ocr_confidence'] ?? $analysis['ocr_confidence'],
                'exif_tamper_flag' => $isTampered,
                'exif_metadata' => $analysis['exif_metadata'],
                'verification_status' => $verificationStatus,
            ]);

            // Update invoice status accordingly
            $newInvoiceStatus = match ($verificationStatus) {
                'tampered_fraud', 'duplicate_fraud' => 'fraud_flagged',
                default => 'pending_verification',
            };

            $invoice->update(['status' => $newInvoiceStatus]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Slip submission failed: ' . $e->getMessage());
        }

        if ($verificationStatus === 'duplicate_fraud') {
            return redirect()->back()->with('error', 'Payment slip uploaded, but Fraud Alert was triggered: Reused Transaction ID or duplicate image file!');
        }

        if ($verificationStatus === 'tampered_fraud') {
            return redirect()->back()->with('warning', 'Payment slip uploaded, but Forensics Alert was triggered: Photoshop / Image tampering signature detected!');
        }

        return redirect()->back()->with('success', 'Payment slip uploaded successfully and OCR extracted! Pending 3-Way Bank Reconciliation.');
    }
}
