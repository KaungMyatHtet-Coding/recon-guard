<?php

namespace App\Services\BankAdapters;

use App\Models\BankStatementBatch;

class CbPayStatementAdapter extends AbstractBankStatementAdapter
{
    public function getChannel(): string
    {
        return 'cbpay';
    }

    public function getExpectedHeaders(): array
    {
        return [
            'Ref_No',
            'Value_Date',
            'Debit_Account',
            'Account_Holder',
            'Credit_Amount',
            'Charges',
            'Net_Credit',
            'Narrative',
        ];
    }

    public function validateHeaders(array $headers): bool
    {
        $cleaned = array_map('strtolower', $this->cleanHeaders($headers));
        // Needs signature columns: ref_no and (value_date or credit_amount or narrative)
        return in_array('ref_no', $cleaned, true)
            && (in_array('value_date', $cleaned, true) || in_array('credit_amount', $cleaned, true) || in_array('narrative', $cleaned, true));
    }

    public function parse(string $filePath, BankStatementBatch $batch): array
    {
        $transactions = [];

        foreach ($this->readCsvRows($filePath) as $row) {
            $txnId = trim($row['Ref_No'] ?? '');
            if ($txnId === '') {
                continue;
            }

            $gross = $this->cleanNumeric($row['Credit_Amount'] ?? 0);
            $fee = $this->cleanNumeric($row['Charges'] ?? 0);
            $net = isset($row['Net_Credit']) && $row['Net_Credit'] !== ''
                ? $this->cleanNumeric($row['Net_Credit'])
                : max(0.0, $gross - $fee);

            $transactions[] = [
                'batch_id' => $batch->id,
                'payment_channel' => $this->getChannel(),
                'bank_transaction_id' => $txnId,
                'transaction_datetime' => $this->parseDateTime($row['Value_Date'] ?? null),
                'sender_phone' => trim($row['Debit_Account'] ?? '') ?: null,
                'sender_name' => trim($row['Account_Holder'] ?? '') ?: null,
                'gross_amount' => $gross,
                'fee_amount' => $fee,
                'net_amount' => $net,
                'reference_note' => trim($row['Narrative'] ?? '') ?: null,
                'raw_payload' => $row,
                'match_status' => 'unmatched',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        return $transactions;
    }
}
