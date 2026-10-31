<?php

namespace App\Services\BankAdapters;

use App\Models\BankStatementBatch;

class AyaPayStatementAdapter extends AbstractBankStatementAdapter
{
    public function getChannel(): string
    {
        return 'ayapay';
    }

    public function getExpectedHeaders(): array
    {
        return [
            'AYA_Trans_Ref',
            'Transaction_Date',
            'Customer_Phone',
            'Customer_Name',
            'Amount_MMK',
            'Service_Fee',
            'Total_Settled',
            'Description',
        ];
    }

    public function validateHeaders(array $headers): bool
    {
        $cleaned = array_map('strtolower', $this->cleanHeaders($headers));
        // Needs signature columns: aya_trans_ref and (transaction_date or amount_mmk)
        return in_array('aya_trans_ref', $cleaned, true)
            && (in_array('transaction_date', $cleaned, true) || in_array('amount_mmk', $cleaned, true));
    }

    public function parse(string $filePath, BankStatementBatch $batch): array
    {
        $transactions = [];

        foreach ($this->readCsvRows($filePath) as $row) {
            $txnId = trim($row['AYA_Trans_Ref'] ?? '');
            if ($txnId === '') {
                continue;
            }

            $gross = $this->cleanNumeric($row['Amount_MMK'] ?? 0);
            $fee = $this->cleanNumeric($row['Service_Fee'] ?? 0);
            $net = isset($row['Total_Settled']) && $row['Total_Settled'] !== ''
                ? $this->cleanNumeric($row['Total_Settled'])
                : max(0.0, $gross - $fee);

            $transactions[] = [
                'batch_id' => $batch->id,
                'payment_channel' => $this->getChannel(),
                'bank_transaction_id' => $txnId,
                'transaction_datetime' => $this->parseDateTime($row['Transaction_Date'] ?? null),
                'sender_phone' => trim($row['Customer_Phone'] ?? '') ?: null,
                'sender_name' => trim($row['Customer_Name'] ?? '') ?: null,
                'gross_amount' => $gross,
                'fee_amount' => $fee,
                'net_amount' => $net,
                'reference_note' => trim($row['Description'] ?? '') ?: null,
                'raw_payload' => $row,
                'match_status' => 'unmatched',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        return $transactions;
    }
}
