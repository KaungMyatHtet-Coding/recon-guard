<?php

namespace App\Services\BankAdapters;

use App\Models\BankStatementBatch;

class WavePayStatementAdapter extends AbstractBankStatementAdapter
{
    public function getChannel(): string
    {
        return 'wavepay';
    }

    public function getExpectedHeaders(): array
    {
        return [
            'Wave_Txn_ID',
            'Date_Time',
            'Sender_MSISDN',
            'Sender_Name',
            'Gross_MMK',
            'Commission_MMK',
            'Net_MMK',
            'Reference',
        ];
    }

    public function validateHeaders(array $headers): bool
    {
        $cleaned = array_map('strtolower', $this->cleanHeaders($headers));
        // Needs signature columns: wave_txn_id and (date_time or gross_mmk)
        return in_array('wave_txn_id', $cleaned, true)
            && (in_array('date_time', $cleaned, true) || in_array('gross_mmk', $cleaned, true));
    }

    public function parse(string $filePath, BankStatementBatch $batch): array
    {
        $transactions = [];

        foreach ($this->readCsvRows($filePath) as $row) {
            $txnId = trim($row['Wave_Txn_ID'] ?? '');
            if ($txnId === '') {
                continue;
            }

            $gross = $this->cleanNumeric($row['Gross_MMK'] ?? 0);
            $fee = $this->cleanNumeric($row['Commission_MMK'] ?? 0);
            $net = isset($row['Net_MMK']) && $row['Net_MMK'] !== ''
                ? $this->cleanNumeric($row['Net_MMK'])
                : max(0.0, $gross - $fee);

            $transactions[] = [
                'batch_id' => $batch->id,
                'payment_channel' => $this->getChannel(),
                'bank_transaction_id' => $txnId,
                'transaction_datetime' => $this->parseDateTime($row['Date_Time'] ?? null),
                'sender_phone' => trim($row['Sender_MSISDN'] ?? '') ?: null,
                'sender_name' => trim($row['Sender_Name'] ?? '') ?: null,
                'gross_amount' => $gross,
                'fee_amount' => $fee,
                'net_amount' => $net,
                'reference_note' => trim($row['Reference'] ?? '') ?: null,
                'raw_payload' => $row,
                'match_status' => 'unmatched',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        return $transactions;
    }
}
