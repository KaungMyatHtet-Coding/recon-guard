<?php

namespace App\Http\Controllers;

use App\Models\Blacklist;
use App\Models\BlacklistRecommendation;
use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\User;
use App\Services\SlipOcrAndForensicsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class PublicPaymentController extends Controller
{
    public function __construct(private SlipOcrAndForensicsService $ocrService) {}

    /**
     * Display the public payment portal for a given invoice number.
     */
    public function show(Request $request, string $invoiceNumber): SymfonyResponse|InertiaResponse
    {
        $invoice = Invoice::where('invoice_number', $invoiceNumber)->firstOrFail();

        // Check if invoice owner or customer phone is blacklisted
        $isBanned = false;
        $reason = null;

        if (Blacklist::isPhoneOrUserBlacklisted($invoice->customer_phone, $invoice->user_id)) {
            $isBanned = true;
            $reason = Blacklist::getReasonFor($invoice->customer_phone, $invoice->user_id);
        } elseif ($invoice->user && $invoice->user->is_blacklisted) {
            $isBanned = true;
            $reason = $invoice->user->blacklist_reason;
        } elseif (!empty($invoice->customer_phone)) {
            $matchingUser = User::where('phone', $invoice->customer_phone)->where('is_blacklisted', true)->first();
            if ($matchingUser) {
                $isBanned = true;
                $reason = $matchingUser->blacklist_reason;
            } elseif (BlacklistRecommendation::where('customer_phone', $invoice->customer_phone)->where('status', 'approved')->exists()) {
                $isBanned = true;
                $rec = BlacklistRecommendation::where('customer_phone', $invoice->customer_phone)->where('status', 'approved')->latest('id')->first();
                $reason = $rec?->reason;
            }
        }

        if ($isBanned) {
            return Inertia::render('Errors/AccountSuspended', [
                'blacklist_reason' => $reason ?: 'This account or customer phone number has been restricted by Compliance for fraudulent activities.',
                'hotline'          => '09-770001122, 09-990001122',
                'email'            => 'disputes@reconguard.test',
            ])->toResponse($request)->setStatusCode(403);
        }

        $maskName = function (?string $name): ?string {
            if (empty($name)) return null;
            $parts = explode(' ', trim($name));
            if (count($parts) === 1) {
                $len = mb_strlen($parts[0]);
                if ($len <= 2) return $parts[0];
                return mb_substr($parts[0], 0, 1) . str_repeat('*', max(1, $len - 2)) . mb_substr($parts[0], -1);
            }
            $maskedParts = array_map(function ($part) {
                $len = mb_strlen($part);
                if ($len <= 2) return $part;
                return mb_substr($part, 0, 1) . str_repeat('*', max(1, $len - 2)) . mb_substr($part, -1);
            }, $parts);
            return implode(' ', $maskedParts);
        };

        $maskPhone = function (?string $phone): ?string {
            if (empty($phone)) return null;
            $clean = preg_replace('/[^0-9]/', '', $phone);
            $len = strlen($clean);
            if ($len >= 7) {
                return substr($clean, 0, 4) . '****' . substr($clean, -3);
            }
            if ($len >= 4) {
                return substr($clean, 0, 2) . '****' . substr($clean, -2);
            }
            return '****';
        };

        $rawName = $invoice->customer_name ?? $invoice->customer?->name;
        $rawPhone = $invoice->customer_phone ?? $invoice->customer?->phone;

        return Inertia::render('Public/PayInvoice', [
            'invoice' => [
                'id'                    => $invoice->id,
                'invoice_number'        => $invoice->invoice_number,
                'customer_name_masked'  => $maskName($rawName),
                'customer_phone_masked' => $maskPhone($rawPhone),
                'description'           => $invoice->description,
                'issued_at'             => $invoice->created_at->format('Y-m-d'),
                'total_amount'          => $invoice->amount,
                'status'                => $invoice->status,
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

        // Blacklist check on invoice owner or customer phone or extracted sender phone
        $isBanned = false;
        $senderPhone = $ocrResult['sender_phone'] ?? null;

        if (Blacklist::isPhoneOrUserBlacklisted($invoice->customer_phone, $invoice->user_id) || ($invoice->user && $invoice->user->is_blacklisted)) {
            $isBanned = true;
        } elseif (!empty($senderPhone)) {
            $isBanned = Blacklist::isPhoneOrUserBlacklisted($senderPhone)
                || User::where('phone', $senderPhone)->where('is_blacklisted', true)->exists()
                || BlacklistRecommendation::where('customer_phone', $senderPhone)->where('status', 'approved')->exists();
        }

        if ($isBanned) {
            // Lock duplicate SHA-256 slip image hashes from blacklisted attempts so they are permanently locked against re-upload
            PaymentSlip::firstOrCreate(
                ['image_hash' => $hash],
                [
                    'invoice_id'               => $invoice->id,
                    'user_id'                  => $invoice->user_id,
                    'payment_channel'          => $ocrResult['channel'] ?? 'unknown',
                    'image_path'               => 'blacklisted_attempts/' . $hash . '.jpg',
                    'extracted_transaction_id' => $ocrResult['transaction_id'] ?? null,
                    'extracted_amount'         => $ocrResult['amount'] ?? null,
                    'sender_phone'             => $senderPhone ?: $invoice->customer_phone,
                    'sender_name'              => $ocrResult['sender_name'] ?? null,
                    'ocr_confidence'           => 0,
                    'exif_tamper_flag'         => true,
                    'verification_status'      => 'tampered_fraud',
                ]
            );

            return response()->json(['error' => 'This phone number has been suspended due to compliance violations.'], 403);
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

        // Blacklist check on invoice owner or customer phone or extracted sender phone
        $isBanned = false;
        $senderPhone = $ocrResult['sender_phone'] ?? null;

        if (Blacklist::isPhoneOrUserBlacklisted($invoice->customer_phone, $invoice->user_id) || ($invoice->user && $invoice->user->is_blacklisted)) {
            $isBanned = true;
        } elseif (!empty($senderPhone)) {
            $isBanned = Blacklist::isPhoneOrUserBlacklisted($senderPhone)
                || User::where('phone', $senderPhone)->where('is_blacklisted', true)->exists()
                || BlacklistRecommendation::where('customer_phone', $senderPhone)->where('status', 'approved')->exists();
        }

        if ($isBanned) {
            // Lock duplicate SHA-256 slip image hashes from blacklisted attempts so they are permanently locked against re-upload
            PaymentSlip::firstOrCreate(
                ['image_hash' => $hash],
                [
                    'invoice_id'               => $invoice->id,
                    'user_id'                  => $invoice->user_id,
                    'payment_channel'          => $ocrResult['channel'] ?? 'unknown',
                    'image_path'               => 'blacklisted_attempts/' . $hash . '.jpg',
                    'extracted_transaction_id' => $ocrResult['transaction_id'] ?? null,
                    'extracted_amount'         => $ocrResult['amount'] ?? null,
                    'sender_phone'             => $senderPhone ?: $invoice->customer_phone,
                    'sender_name'              => $ocrResult['sender_name'] ?? null,
                    'ocr_confidence'           => 0,
                    'exif_tamper_flag'         => true,
                    'verification_status'      => 'tampered_fraud',
                ]
            );

            return response()->json(['error' => 'This phone number has been suspended due to compliance violations.'], 403);
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
