<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\User;
use App\Services\SlipOcrAndForensicsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicPaymentController extends Controller
{
    public function __construct(private SlipOcrAndForensicsService $ocrService) {}

    /**
     * Display the public payment portal for a given invoice number.
     */
    public function show(string $invoiceNumber): Response
    {
        $invoice = Invoice::where('invoice_number', $invoiceNumber)->firstOrFail();

        return Inertia::render('Public/PayInvoice', [
            'invoice' => [
                'id'             => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'description'    => $invoice->description,
                'issued_at'      => $invoice->created_at->format('Y-m-d'),
                'total_amount'   => $invoice->amount,
                'status'         => $invoice->status,
            ],
        ]);
    }

    /**
     * Layer 1-4 Anti-Spam: Scan a payment slip without storing it.
     * Layer 1: Rate limiting (throttle:5,1 on route)
     * Layer 2: MIME & size enforcement (validation)
     * Layer 3: Receipt heuristic verification via OCR
     * Layer 4: SHA-256 duplicate image lock
     */
    public function scanSlip(Request $request, string $invoiceNumber): \Illuminate\Http\JsonResponse
    {
        $invoice = Invoice::where('invoice_number', $invoiceNumber)->firstOrFail();

        if ($invoice->status === 'reconciled') {
            return response()->json(['error' => 'This invoice has already been paid and reconciled.'], 422);
        }

        // Layer 2: MIME & Size Enforcement
        $request->validate([
            'slip' => 'required|file|mimes:png,jpg,jpeg,webp|max:5120',
        ]);

        $file = $request->file('slip');

        // Layer 4: SHA-256 Duplicate Image Lock
        $hash = hash_file('sha256', $file->getRealPath());
        if (PaymentSlip::where('image_hash', $hash)->exists()) {
            return response()->json(['error' => 'This exact receipt image has already been submitted.'], 422);
        }

        // Layer 3: Receipt Heuristic Verification via OCR
        $ocrResult = $this->ocrService->analyzeSlip($file, $invoice);

        $bankingKeywords = ['kbz', 'wave', 'cb', 'aya', 'pay', 'trans', 'mmk', 'kyat', 'ref', 'receipt', 'transaction'];
        // The OCR result 'raw_text' may not be available directly — check transaction_id or amount
        $hasIndicators = !empty($ocrResult['transaction_id']) || !empty($ocrResult['amount']);

        // Also check if ocrResult has channel which implies a valid receipt was detected
        if (!$hasIndicators && !empty($ocrResult['channel'])) {
            $hasIndicators = true;
        }

        if (!$hasIndicators) {
            return response()->json(['error' => 'The uploaded image does not appear to be a valid banking receipt. Please upload a clear transaction slip.'], 422);
        }

        return response()->json([
            'transaction_id' => $ocrResult['transaction_id'] ?? null,
            'amount'         => $ocrResult['amount'] ?? null,
            'phone_number'   => $ocrResult['sender_phone'] ?? null,
            'sender_name'    => $ocrResult['sender_name'] ?? null,
            'channel'        => $ocrResult['channel'] ?? null,
            'file_hash'      => $hash,
            'preview_ok'     => true,
        ]);
    }

    /**
     * Submit a payment slip for a given invoice (public, no auth required).
     */
    public function submitSlip(Request $request, string $invoiceNumber): \Illuminate\Http\JsonResponse
    {
        $invoice = Invoice::where('invoice_number', $invoiceNumber)->firstOrFail();

        if ($invoice->status === 'reconciled') {
            return response()->json(['error' => 'This invoice has already been paid and reconciled.'], 422);
        }

        // Layer 2: MIME & Size Enforcement
        $request->validate([
            'slip'    => 'required|file|mimes:png,jpg,jpeg,webp|max:5120',
            'channel' => 'required|string|in:KBZPay,WavePay,CB Pay,AYA Pay',
        ]);

        $file = $request->file('slip');

        // Layer 4: SHA-256 Duplicate Image Lock
        $hash = hash_file('sha256', $file->getRealPath());
        if (PaymentSlip::where('image_hash', $hash)->exists()) {
            return response()->json(['error' => 'This exact receipt image has already been submitted.'], 422);
        }

        // Map display channel name to internal channel key
        $channelMap = [
            'KBZPay'  => 'kbzpay',
            'WavePay' => 'wavepay',
            'CB Pay'  => 'cbpay',
            'AYA Pay' => 'ayapay',
        ];
        $channelHint = $channelMap[$request->channel] ?? 'kbzpay';

        // Layer 3: Receipt Heuristic Verification via OCR
        $ocrResult = $this->ocrService->analyzeSlip($file, $invoice, $channelHint);

        $hasIndicators = !empty($ocrResult['transaction_id']) || !empty($ocrResult['amount']) || !empty($ocrResult['channel']);

        if (!$hasIndicators) {
            return response()->json(['error' => 'The uploaded image does not appear to be a valid banking receipt. Please upload a clear transaction slip.'], 422);
        }

        // Store the file
        $path = $file->store('payment_slips', 'public');

        $matchingUser = !empty($ocrResult['sender_phone'])
            ? User::where('phone', $ocrResult['sender_phone'])->first()
            : null;

        $userId = auth()->id() ?? $invoice->user_id ?? ($matchingUser ? $matchingUser->id : null);

        // Create PaymentSlip record using actual fillable columns
        PaymentSlip::create([
            'invoice_id'               => $invoice->id,
            'user_id'                  => $userId,
            'payment_channel'          => $channelHint,
            'image_path'               => $path,
            'image_hash'               => $hash,
            'extracted_transaction_id' => $ocrResult['transaction_id'] ?? null,
            'extracted_amount'         => $ocrResult['amount'] ?? null,
            'sender_phone'             => $ocrResult['sender_phone'] ?? null,
            'sender_name'              => $ocrResult['sender_name'] ?? null,
            'ocr_confidence'           => $ocrResult['ocr_confidence'] ?? 0,
            'exif_tamper_flag'         => $ocrResult['exif_tamper_flag'] ?? false,
            'exif_metadata'            => $ocrResult['exif_metadata'] ?? null,
            'verification_status'      => 'pending_recon',
        ]);

        // Update invoice status to pending verification
        $invoice->update(['status' => 'pending_verification']);

        return response()->json([
            'success' => true,
            'message' => 'Payment slip submitted successfully. Our team will verify your payment shortly.',
        ]);
    }
}
