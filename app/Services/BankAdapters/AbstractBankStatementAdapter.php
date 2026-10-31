<?php

namespace App\Services\BankAdapters;

use App\Models\BankStatementBatch;
use Carbon\Carbon;
use InvalidArgumentException;

abstract class AbstractBankStatementAdapter implements BankStatementAdapterInterface
{
    /**
     * Clean and normalize headers (strip BOM, trim whitespace).
     *
     * @param array<int, string> $headers
     * @return array<int, string>
     */
    protected function cleanHeaders(array $headers): array
    {
        return array_map(function ($h, $index) {
            $cleaned = trim((string) $h);
            if ($index === 0) {
                // Strip UTF-8 BOM if present
                $cleaned = preg_replace('/^\xEF\xBB\xBF/', '', $cleaned);
            }
            return trim($cleaned);
        }, $headers, array_keys($headers));
    }

    /**
     * Convert currency or amount strings into sanitized floats.
     */
    protected function cleanNumeric(mixed $value, float $default = 0.0): float
    {
        if ($value === null || $value === '') {
            return $default;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        // Remove commas, currency symbols, and whitespace
        $cleaned = preg_replace('/[^\d.-]/', '', (string) $value);
        return is_numeric($cleaned) ? (float) $cleaned : $default;
    }

    /**
     * Parse date/time strings with fallback to current time.
     */
    protected function parseDateTime(?string $dateStr): string
    {
        if (empty($dateStr)) {
            return Carbon::now()->format('Y-m-d H:i:s');
        }

        try {
            return Carbon::parse(trim($dateStr))->format('Y-m-d H:i:s');
        } catch (\Throwable) {
            return Carbon::now()->format('Y-m-d H:i:s');
        }
    }

    /**
     * Read and yield associative row arrays from a CSV file.
     *
     * @param string $filePath
     * @return \Generator<int, array<string, string>>
     */
    protected function readCsvRows(string $filePath): \Generator
    {
        if (!file_exists($filePath) || !is_readable($filePath)) {
            throw new InvalidArgumentException("Bank statement CSV file cannot be read: {$filePath}");
        }

        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            throw new InvalidArgumentException("Failed to open file pointer for: {$filePath}");
        }

        try {
            $rawHeader = fgetcsv($handle);
            if (!$rawHeader) {
                return;
            }

            $headers = $this->cleanHeaders($rawHeader);
            $headerCount = count($headers);

            while (($row = fgetcsv($handle)) !== false) {
                // Skip completely empty lines
                if (empty($row) || (count($row) === 1 && $row[0] === null)) {
                    continue;
                }

                $rowCount = count($row);
                if ($rowCount < $headerCount) {
                    $row = array_pad($row, $headerCount, '');
                } elseif ($rowCount > $headerCount) {
                    $row = array_slice($row, 0, $headerCount);
                }

                yield array_combine($headers, $row);
            }
        } finally {
            fclose($handle);
        }
    }
}
