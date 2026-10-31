<?php

namespace App\Services;

use App\Models\BankStatementBatch;
use App\Models\BankTransaction;
use App\Models\User;
use App\Services\BankAdapters\AyaPayStatementAdapter;
use App\Services\BankAdapters\BankStatementAdapterInterface;
use App\Services\BankAdapters\CbPayStatementAdapter;
use App\Services\BankAdapters\KbzPayStatementAdapter;
use App\Services\BankAdapters\WavePayStatementAdapter;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BankStatementIngestionService
{
    /**
     * @var array<string, BankStatementAdapterInterface>
     */
    protected array $adapters = [];

    public function __construct()
    {
        $this->registerAdapter(new KbzPayStatementAdapter());
        $this->registerAdapter(new WavePayStatementAdapter());
        $this->registerAdapter(new CbPayStatementAdapter());
        $this->registerAdapter(new AyaPayStatementAdapter());
    }

    public function registerAdapter(BankStatementAdapterInterface $adapter): void
    {
        $this->adapters[$adapter->getChannel()] = $adapter;
    }

    /**
     * @return array<string, BankStatementAdapterInterface>
     */
    public function getAdapters(): array
    {
        return $this->adapters;
    }

    public function getAdapter(string $channel): ?BankStatementAdapterInterface
    {
        return $this->adapters[strtolower(trim($channel))] ?? null;
    }

    /**
     * Inspect CSV headers to auto-detect the payment channel.
     */
    public function detectChannel(string $filePath): ?string
    {
        if (!file_exists($filePath) || !is_readable($filePath)) {
            return null;
        }

        $handle = fopen($filePath, 'r');
        if (!$handle) {
            return null;
        }

        try {
            $rawHeader = fgetcsv($handle);
            if (!$rawHeader) {
                return null;
            }

            foreach ($this->adapters as $channel => $adapter) {
                if ($adapter->validateHeaders($rawHeader)) {
                    return $channel;
                }
            }
        } finally {
            fclose($handle);
        }

        return null;
    }

    /**
     * Ingest a bank statement CSV file, validate against provider schema, and persist transactions.
     *
     * @param UploadedFile|string $file
     * @param string|null $channel 'auto', specific channel, or null
     * @param User $uploader
     * @param string|null $originalFilename
     * @return array<string, mixed>
     * @throws ValidationException
     */
    public function ingest(
        UploadedFile|string $file,
        ?string $channel,
        User $uploader,
        ?string $originalFilename = null
    ): array {
        $filePath = $file instanceof UploadedFile ? $file->getRealPath() : $file;
        $originalFilename = $originalFilename ?: ($file instanceof UploadedFile ? $file->getClientOriginalName() : basename($filePath));

        if (!file_exists($filePath) || !is_readable($filePath)) {
            throw ValidationException::withMessages([
                'statement_file' => 'The uploaded bank statement CSV file could not be read.',
            ]);
        }

        // Auto-detect channel if omitted or set to 'auto'
        if (empty($channel) || strtolower(trim($channel)) === 'auto') {
            $detected = $this->detectChannel($filePath);
            if (!$detected) {
                throw ValidationException::withMessages([
                    'payment_channel' => 'Could not auto-detect bank statement channel from CSV headers. Please select the channel manually or verify file format.',
                ]);
            }
            $channel = $detected;
        } else {
            $channel = strtolower(trim($channel));
        }

        $adapter = $this->getAdapter($channel);
        if (!$adapter) {
            throw ValidationException::withMessages([
                'payment_channel' => "Unsupported bank statement channel: [{$channel}]. Supported channels: kbzpay, wavepay, cbpay, ayapay.",
            ]);
        }

        // Verify CSV headers with the chosen adapter
        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            throw ValidationException::withMessages([
                'statement_file' => 'Unable to read the statement file headers.',
            ]);
        }
        $rawHeader = fgetcsv($handle);
        fclose($handle);

        if (!$rawHeader || !$adapter->validateHeaders($rawHeader)) {
            throw ValidationException::withMessages([
                'statement_file' => "The CSV headers do not match the expected schema for " . strtoupper($channel) . ". Expected columns: " . implode(', ', $adapter->getExpectedHeaders()),
            ]);
        }

        return DB::transaction(function () use ($filePath, $channel, $adapter, $uploader, $originalFilename) {
            // Create Batch record
            $batch = BankStatementBatch::create([
                'uploaded_by' => $uploader->id,
                'payment_channel' => $channel,
                'original_filename' => $originalFilename,
                'statement_date' => Carbon::today(),
                'total_records' => 0,
                'total_credit_amount' => 0.0,
                'status' => 'uploaded',
            ]);

            // Parse file via adapter
            $parsedRows = $adapter->parse($filePath, $batch);

            if (empty($parsedRows)) {
                $batch->update([
                    'status' => 'processed',
                    'total_records' => 0,
                    'total_credit_amount' => 0.0,
                ]);

                return [
                    'batch' => $batch,
                    'channel' => $channel,
                    'total_rows' => 0,
                    'imported_records' => 0,
                    'duplicate_records' => 0,
                    'total_amount' => 0.0,
                    'formatted_amount' => '0.00',
                ];
            }

            // Identify existing transaction IDs for this channel to prevent duplicates
            $txnIds = array_column($parsedRows, 'bank_transaction_id');
            $existingTxnIds = BankTransaction::where('payment_channel', $channel)
                ->whereIn('bank_transaction_id', $txnIds)
                ->pluck('bank_transaction_id')
                ->flip()
                ->all();

            $rowsToInsert = [];
            $skippedDuplicates = 0;
            $totalCreditAmount = 0.0;
            $earliestDate = null;

            foreach ($parsedRows as $row) {
                $txId = $row['bank_transaction_id'];

                // Prevent duplicates (both against DB and intra-file)
                if (isset($existingTxnIds[$txId])) {
                    $skippedDuplicates++;
                    continue;
                }

                $existingTxnIds[$txId] = true;

                // Track date for batch
                $txDate = $row['transaction_datetime'];
                if (!$earliestDate || $txDate < $earliestDate) {
                    $earliestDate = $txDate;
                }

                $totalCreditAmount += (float) $row['gross_amount'];

                // Ensure raw_payload is JSON string for direct bulk insert
                $row['raw_payload'] = is_array($row['raw_payload'])
                    ? json_encode($row['raw_payload'], JSON_UNESCAPED_UNICODE)
                    : $row['raw_payload'];

                $rowsToInsert[] = $row;
            }

            // Chunked bulk insert (100 rows per chunk)
            foreach (array_chunk($rowsToInsert, 100) as $chunk) {
                BankTransaction::insert($chunk);
            }

            // Update batch summary
            $statementDate = $earliestDate ? Carbon::parse($earliestDate)->toDateString() : Carbon::today()->toDateString();
            $importedCount = count($rowsToInsert);

            $batch->update([
                'statement_date' => $statementDate,
                'total_records' => $importedCount,
                'total_credit_amount' => $totalCreditAmount,
                'status' => 'processed',
            ]);

            return [
                'batch' => $batch,
                'channel' => $channel,
                'total_rows' => count($parsedRows),
                'imported_records' => $importedCount,
                'duplicate_records' => $skippedDuplicates,
                'total_amount' => $totalCreditAmount,
                'formatted_amount' => number_format($totalCreditAmount, 2),
            ];
        });
    }
}
