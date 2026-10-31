<?php

namespace App\Services\BankAdapters;

use App\Models\BankStatementBatch;

class KbzPayStatementAdapter extends AbstractBankStatementAdapter
{
    public function getChannel(): string
    {
        return 'kbzpay';
    }

    public function getExpectedHeaders(): array
    {
        return [
            'Transaction_No',
            'Trade_Time',
            'Payer_Phone',
            'Payer_Name',
            'Trans_Amount',
            'Fee_Amount',
            'Settlement_Amount',
            'Remark',
        ];
    }

    public function validateHeaders(array $headers): bool
    {
        $cleaned = array_map('strtolower', $this->cleanHeaders($headers));
        // Needs signature columns: transaction_no and (trade_time or trans_amount)
        return in_array('transaction_no', $cleaned, true)
            && (in_array('trade_time', $cleaned, true) || in_array('trans_amount', $cleaned, true));
    }

    public function parse(string $filePath, BankStatementBatch $batch): array
    {
        $transactions = [];

        foreach ($this->readCsvRows($filePath) as $row) {
            $txnId = trim($row['Transaction_No'] ?? '');
            if ($txnId === '') {
                continue;
            }

            $gross = $this->cleanNumeric($row['Trans_Amount'] ?? 0);
            $fee = $this->cleanNumeric($row['Fee_Amount'] ?? 0);
            $net = isset($row['Settlement_Amount']) && $row['Settlement_Amount'] !== ''
                ? $this->cleanNumeric($row['Settlement_Amount'])
                : max(0.0, $gross - $fee);

            $transactions[] = [
                'batch_id' => $batch->id,
                'payment_channel' => $this->getChannel(),
                'bank_transaction_id' => $txnId,
                'transaction_datetime' => $this->parseDateTime($row['Trade_Time'] ?? null),
                'sender_phone' => trim($row['Payer_Phone'] ?? '') ?: null,
                'sender_name' => trim($row['Payer_Name'] ?? '') ?: null,
                'gross_amount' => $gross,
                'fee_amount' => $fee,
                'net_amount' => $net,
                'reference_note' => trim($row['Remark'] ?? '') ?: null,
                'raw_payload' => $row,
                'match_status' => 'unmatched',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        return $transactions;
    }
}
