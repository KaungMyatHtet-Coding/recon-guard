<?php

namespace App\Services;

use App\Models\BankTransaction;
use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\ReconciliationMatch;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReconciliationEngineService
{
    /**
     * Run the 3-Way Reconciliation Engine across Invoices, Slips, and Bank Transactions.
     *
     * @param string|null $channel Optional payment channel filter
     * @param User|null $auditor The user triggering the reconciliation run
     * @return array<string, mixed> Execution summary metrics
     */
    public function run(?string $channel = null, ?User $auditor = null): array
    {
        $channel = ($channel && strtolower($channel) !== 'all') ? strtolower(trim($channel)) : null;

        return DB::transaction(function () use ($channel, $auditor) {
            $processedSlips = 0;
            $exactMatches = 0;
            $feeAdjustedMatches = 0;
            $fuzzyMatches = 0;
            $fraudCount = 0;
            $suspenseCount = 0;
            $totalReconciledMmk = 0.0;

            // 1. Fetch pending slips to reconcile
            $slipQuery = PaymentSlip::with(['invoice', 'user'])
                ->where('verification_status', '!=', 'matched');

            if ($channel) {
                $slipQuery->where('payment_channel', $channel);
            }

            $slips = $slipQuery->latest('id')->get();

            foreach ($slips as $slip) {
                $processedSlips++;
                $invoice = $slip->invoice;

                // Skip if already has an approved reconciliation match
                $existingApprovedMatch = ReconciliationMatch::where('payment_slip_id', $slip->id)
                    ->whereIn('status', ['auto_approved', 'approved_by_accountant'])
                    ->first();

                if ($existingApprovedMatch) {
                    continue;
                }

                $slipTxnId = trim((string) $slip->extracted_transaction_id);
                $slipAmount = (float) $slip->extracted_amount;
                $slipPhone = $this->normalizePhone($slip->sender_phone) ?: $this->normalizePhone($invoice?->customer_phone);

                // Check 1: Duplicate Transaction ID Fraud Check
                if ($slipTxnId !== '') {
                    $otherSlipsCount = PaymentSlip::where('payment_channel', $slip->payment_channel)
                        ->where('extracted_transaction_id', $slipTxnId)
                        ->where('id', '!=', $slip->id)
                        ->count();

                    if ($otherSlipsCount > 0) {
                        $fraudCount++;
                        $slip->update(['verification_status' => 'duplicate_fraud']);
                        if ($invoice) {
                            $invoice->update(['status' => 'fraud_flagged']);
                        }

                        $bankTx = BankTransaction::where('payment_channel', $slip->payment_channel)
                            ->where('bank_transaction_id', $slipTxnId)
                            ->first();

                        if ($bankTx) {
                            $bankTx->update(['match_status' => 'disputed']);
                        }

                        $this->createMatchRecord([
                            'invoice_id' => $invoice?->id,
                            'payment_slip_id' => $slip->id,
                            'bank_transaction_id' => $bankTx?->id,
                            'reconciled_by' => $auditor?->id,
                            'match_type' => 'duplicate_id_fraud',
                            'confidence_score' => 99.00,
                            'invoice_amount' => $invoice?->amount ?? $slipAmount,
                            'slip_amount' => $slipAmount,
                            'bank_amount' => $bankTx ? (float) $bankTx->gross_amount : null,
                            'variance_amount' => 0.00,
                            'notes' => "DUPLICATE TRANSACTION FRAUD: Transaction ID '{$slipTxnId}' has been submitted on multiple payment slips for channel " . strtoupper($slip->payment_channel) . ".",
                            'status' => 'rejected_fraud',
                        ]);
                        continue;
                    }
                }

                // Check 2: Exif Tamper Marker / Software Forgery Detected
                if ($slip->exif_tamper_flag) {
                    $fraudCount++;
                    $slip->update(['verification_status' => 'tampered_fraud']);
                    if ($invoice) {
                        $invoice->update(['status' => 'fraud_flagged']);
                    }

                    $bankTx = BankTransaction::where('payment_channel', $slip->payment_channel)
                        ->where('bank_transaction_id', $slipTxnId)
                        ->first();

                    if ($bankTx) {
                        $bankTx->update(['match_status' => 'disputed']);
                    }

                    $bankGross = $bankTx ? (float) $bankTx->gross_amount : 0.0;
                    $variance = abs($slipAmount - $bankGross);

                    $this->createMatchRecord([
                        'invoice_id' => $invoice?->id,
                        'payment_slip_id' => $slip->id,
                        'bank_transaction_id' => $bankTx?->id,
                        'reconciled_by' => $auditor?->id,
                        'match_type' => 'fake_slip_fraud',
                        'confidence_score' => 99.00,
                        'invoice_amount' => $invoice?->amount ?? $slipAmount,
                        'slip_amount' => $slipAmount,
                        'bank_amount' => $bankTx ? $bankGross : null,
                        'variance_amount' => $variance,
                        'notes' => "FORGED RECEIPT DETECTED: Forensic scanner flagged Photoshop/Canva software tampering signatures in slip metadata.",
                        'status' => 'rejected_fraud',
                    ]);
                    continue;
                }

                // Search for Exact Bank Transaction Match by ID
                $bankTx = null;
                if ($slipTxnId !== '') {
                    $bankTx = BankTransaction::where('payment_channel', $slip->payment_channel)
                        ->where('bank_transaction_id', $slipTxnId)
                        ->first();
                }

                if ($bankTx) {
                    $bankGross = (float) $bankTx->gross_amount;
                    $bankNet = (float) $bankTx->net_amount;
                    $bankFee = (float) $bankTx->fee_amount;

                    // Check 3: Amount Inflation / Tampered Slip Fraud
                    // Customer slip claims more money than was actually credited by the bank
                    if ($slipAmount > $bankGross) {
                        $fraudCount++;
                        $variance = abs($slipAmount - $bankGross);

                        $slip->update(['verification_status' => 'tampered_fraud']);
                        if ($invoice) {
                            $invoice->update(['status' => 'fraud_flagged']);
                        }
                        $bankTx->update(['match_status' => 'disputed']);

                        $this->createMatchRecord([
                            'invoice_id' => $invoice?->id,
                            'payment_slip_id' => $slip->id,
                            'bank_transaction_id' => $bankTx->id,
                            'reconciled_by' => $auditor?->id,
                            'match_type' => 'amount_mismatch_fraud',
                            'confidence_score' => 99.00,
                            'invoice_amount' => $invoice?->amount ?? $slipAmount,
                            'slip_amount' => $slipAmount,
                            'bank_amount' => $bankGross,
                            'variance_amount' => $variance,
                            'notes' => "CRITICAL AMOUNT MISMATCH FRAUD: Slip claims " . number_format($slipAmount, 2) . " MMK, but official bank statement recorded only " . number_format($bankGross, 2) . " MMK. Variance: " . number_format($variance, 2) . " MMK.",
                            'status' => 'rejected_fraud',
                        ]);
                        continue;
                    }

                    // Check 4: Fee-Adjusted Gateway Match (95% Confidence)
                    // When bank statement records a known gateway fee (gross_amount == slip_amount while net == slip - fee)
                    $isFeeAdjusted = (
                        $bankFee > 0 &&
                        (
                            abs($slipAmount - $bankGross) < 0.01 ||
                            abs($slipAmount - $bankNet) < 0.01 ||
                            abs($slipAmount - ($bankNet + $bankFee)) < 0.01 ||
                            ($slipAmount > $bankNet && ($slipAmount - $bankNet) <= 2000)
                        )
                    );

                    if ($isFeeAdjusted) {
                        $feeAdjustedMatches++;
                        $variance = $bankFee > 0 ? $bankFee : abs($slipAmount - $bankNet);
                        $totalReconciledMmk += $bankGross;

                        $slip->update(['verification_status' => 'matched']);
                        if ($invoice) {
                            $invoice->update(['status' => 'reconciled']);
                        }
                        $bankTx->update(['match_status' => 'matched']);

                        $this->createMatchRecord([
                            'invoice_id' => $invoice?->id,
                            'payment_slip_id' => $slip->id,
                            'bank_transaction_id' => $bankTx->id,
                            'reconciled_by' => $auditor?->id,
                            'match_type' => 'fee_adjusted_match',
                            'confidence_score' => 95.00,
                            'invoice_amount' => $invoice?->amount ?? $slipAmount,
                            'slip_amount' => $slipAmount,
                            'bank_amount' => $bankGross,
                            'variance_amount' => $variance,
                            'notes' => "Fee-Adjusted Settlement: Invoice paid in full ({$slipAmount} MMK). Bank deducted service fee of " . number_format($variance, 2) . " MMK (Net: {$bankNet} MMK).",
                            'status' => 'auto_approved',
                        ]);
                        continue;
                    }

                    // Check 5: Exact Match (100% Confidence) - Exact zero-fee match
                    if (abs($slipAmount - $bankGross) < 0.01) {
                        $exactMatches++;
                        $totalReconciledMmk += $bankGross;

                        $slip->update(['verification_status' => 'matched']);
                        if ($invoice) {
                            $invoice->update(['status' => 'reconciled']);
                        }
                        $bankTx->update(['match_status' => 'matched']);

                        $this->createMatchRecord([
                            'invoice_id' => $invoice?->id,
                            'payment_slip_id' => $slip->id,
                            'bank_transaction_id' => $bankTx->id,
                            'reconciled_by' => $auditor?->id,
                            'match_type' => 'exact_match',
                            'confidence_score' => 100.00,
                            'invoice_amount' => $invoice?->amount ?? $slipAmount,
                            'slip_amount' => $slipAmount,
                            'bank_amount' => $bankGross,
                            'variance_amount' => 0.00,
                            'notes' => "3-Way Exact Match confirmed: Invoice #{$invoice?->invoice_number}, slip OCR, and bank statement gross settlement match 100%.",
                            'status' => 'auto_approved',
                        ]);
                        continue;
                    }
                }

                // Check 6: Fuzzy String & Heuristic Match (75%–90% Confidence)
                // When exact ID match fails due to OCR typos, test Levenshtein distance on candidates
                $fuzzyCandidate = $this->findFuzzyCandidate($slip, $channel);

                if ($fuzzyCandidate) {
                    $fuzzyMatches++;
                    $candidateTx = $fuzzyCandidate['candidate'];
                    $confidence = $fuzzyCandidate['confidence'];
                    $levDist = $fuzzyCandidate['distance'];

                    $slip->update(['verification_status' => 'fuzzy_match']);
                    if ($invoice) {
                        $invoice->update(['status' => 'discrepancy']);
                    }
                    $candidateTx->update(['match_status' => 'fuzzy_matched']);

                    $this->createMatchRecord([
                        'invoice_id' => $invoice?->id,
                        'payment_slip_id' => $slip->id,
                        'bank_transaction_id' => $candidateTx->id,
                        'reconciled_by' => $auditor?->id,
                        'match_type' => 'fuzzy_match',
                        'confidence_score' => $confidence,
                        'invoice_amount' => $invoice?->amount ?? $slipAmount,
                        'slip_amount' => $slipAmount,
                        'bank_amount' => (float) $candidateTx->gross_amount,
                        'variance_amount' => 0.00,
                        'notes' => "Fuzzy OCR Match: Transaction ID candidate '{$candidateTx->bank_transaction_id}' differs by {$levDist} character(s) from OCR '{$slipTxnId}'. Customer phone and amount match. Pending accountant review.",
                        'status' => 'pending_review',
                    ]);
                    continue;
                }
            }

            // 7. Identify and categorize Suspense / Unclaimed Bank Deposits
            $unmatchedTxQuery = BankTransaction::where('match_status', 'unmatched');
            if ($channel) {
                $unmatchedTxQuery->where('payment_channel', $channel);
            }

            $unmatchedTxns = $unmatchedTxQuery->get();
            foreach ($unmatchedTxns as $utx) {
                // Check if any active slip links to this transaction
                $hasSlip = PaymentSlip::where('payment_channel', $utx->payment_channel)
                    ->where('extracted_transaction_id', $utx->bank_transaction_id)
                    ->exists();

                if (!$hasSlip) {
                    $utx->update(['match_status' => 'suspense']);
                    $suspenseCount++;
                }
            }

            return [
                'processed_slips' => $processedSlips,
                'exact_matches' => $exactMatches,
                'fee_adjusted' => $feeAdjustedMatches,
                'fuzzy_matches' => $fuzzyMatches,
                'fraud_caught' => $fraudCount,
                'suspense_count' => $suspenseCount,
                'total_reconciled_mmk' => $totalReconciledMmk,
                'formatted_total_reconciled' => number_format($totalReconciledMmk, 2),
            ];
        });
    }

    /**
     * Find best candidate bank transaction for fuzzy string matching.
     *
     * @return array{candidate: BankTransaction, confidence: float, distance: int}|null
     */
    protected function findFuzzyCandidate(PaymentSlip $slip, ?string $channel): ?array
    {
        $slipTxnId = trim((string) $slip->extracted_transaction_id);
        $slipAmount = (float) $slip->extracted_amount;
        $slipPhone = $this->normalizePhone($slip->sender_phone) ?: $this->normalizePhone($slip->invoice?->customer_phone);

        $query = BankTransaction::where('payment_channel', $slip->payment_channel)
            ->where('match_status', 'unmatched');

        $candidates = $query->latest('id')->limit(200)->get();

        $bestCandidate = null;
        $lowestDistance = 999;
        $calculatedConfidence = 75.00;

        foreach ($candidates as $cand) {
            $candTxId = trim($cand->bank_transaction_id);
            $candAmount = (float) $cand->gross_amount;
            $candPhone = $this->normalizePhone($cand->sender_phone);

            // Amount must match exact or fee-adjusted
            $amountMatches = abs($slipAmount - $candAmount) < 0.01;
            if (!$amountMatches) {
                continue;
            }

            // Calculate Levenshtein edit distance
            $dist = levenshtein($slipTxnId, $candTxId);
            if ($dist < 0 || $dist > 2) {
                continue;
            }

            // Time difference in minutes
            $timeMatch = false;
            if ($slip->extracted_datetime && $cand->transaction_datetime) {
                $diffMinutes = abs(Carbon::parse($slip->extracted_datetime)->diffInMinutes(Carbon::parse($cand->transaction_datetime)));
                if ($diffMinutes <= 15) {
                    $timeMatch = true;
                }
            }

            // Phone match
            $phoneMatches = ($slipPhone && $candPhone && $slipPhone === $candPhone);

            // Scoring
            if ($dist < $lowestDistance) {
                $lowestDistance = $dist;
                $bestCandidate = $cand;

                if ($phoneMatches && $dist <= 1) {
                    $calculatedConfidence = 90.00;
                } elseif ($phoneMatches && $dist === 2) {
                    $calculatedConfidence = 85.00;
                } elseif ($timeMatch && $dist <= 2) {
                    $calculatedConfidence = 80.00;
                } else {
                    $calculatedConfidence = 75.00;
                }
            }
        }

        if ($bestCandidate) {
            return [
                'candidate' => $bestCandidate,
                'confidence' => $calculatedConfidence,
                'distance' => $lowestDistance,
            ];
        }

        return null;
    }

    /**
     * Helper to create or update a reconciliation match record.
     */
    protected function createMatchRecord(array $data): ReconciliationMatch
    {
        $existing = null;
        if (!empty($data['payment_slip_id'])) {
            $existing = ReconciliationMatch::where('payment_slip_id', $data['payment_slip_id'])->first();
        }

        if ($existing) {
            $existing->update($data);
            return $existing;
        }

        return ReconciliationMatch::create($data);
    }

    /**
     * Normalize Myanmar mobile phone numbers for consistent comparisons.
     */
    protected function normalizePhone(?string $phone): ?string
    {
        if (!$phone) {
            return null;
        }

        $digits = preg_replace('/\D/', '', $phone);
        if (!$digits) {
            return null;
        }

        if (str_starts_with($digits, '959')) {
            $digits = '09' . substr($digits, 3);
        } elseif (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $digits = '0' . $digits;
        }

        return $digits;
    }
}
