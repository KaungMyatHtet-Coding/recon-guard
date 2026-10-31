<?php

namespace App\Services\BankAdapters;

use App\Models\BankStatementBatch;

interface BankStatementAdapterInterface
{
    /**
     * Get the standardized payment channel identifier (e.g., 'kbzpay', 'wavepay', 'cbpay', 'ayapay').
     */
    public function getChannel(): string;

    /**
     * Get the list of expected CSV column headers for this provider.
     */
    public function getExpectedHeaders(): array;

    /**
     * Validate whether the provided CSV header array matches this bank's schema.
     *
     * @param array<int, string> $headers
     * @return bool
     */
    public function validateHeaders(array $headers): bool;

    /**
     * Parse the bank statement CSV file into normalized bank transaction arrays.
     *
     * Each returned array element should conform to:
     * [
     *     'batch_id' => int,
     *     'payment_channel' => string,
     *     'bank_transaction_id' => string,
     *     'transaction_datetime' => string (Y-m-d H:i:s),
     *     'sender_phone' => ?string,
     *     'sender_name' => ?string,
     *     'gross_amount' => float,
     *     'fee_amount' => float,
     *     'net_amount' => float,
     *     'reference_note' => ?string,
     *     'raw_payload' => array,
     *     'match_status' => 'unmatched',
     * ]
     *
     * @param string $filePath Absolute path to the CSV file
     * @param BankStatementBatch $batch
     * @return array<int, array<string, mixed>>
     */
    public function parse(string $filePath, BankStatementBatch $batch): array;
}
