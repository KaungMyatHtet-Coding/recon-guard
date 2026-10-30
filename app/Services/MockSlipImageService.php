<?php

namespace App\Services;

use Exception;

class MockSlipImageService
{
    /**
     * Generate a simulated mobile wallet receipt PNG image using PHP GD.
     *
     * @param string $channel 'kbzpay'|'wavepay'|'cbpay'|'ayapay'
     * @param string $mode 'legit'|'tampered_amount'|'duplicate_id'
     * @param array $data ['transaction_id' => ..., 'amount' => ..., 'sender_name' => ..., 'sender_phone' => ..., 'datetime' => ..., 'invoice_number' => ...]
     * @return array ['image_bytes' => string, 'mime' => string, 'filename' => string, 'metadata' => array]
     */
    public function generateReceiptImage(string $channel, string $mode, array $data): array
    {
        $channel = strtolower($channel);
        $width = 540;
        $height = 800;

        $im = imagecreatetruecolor($width, $height);
        if (!$im) {
            throw new Exception("Unable to initialize GD image stream.");
        }

        // Enable antialiasing if available
        if (function_exists('imageantialias')) {
            imageantialias($im, true);
        }

        // Palette
        $bgLight = imagecolorallocate($im, 248, 250, 252); // slate-50
        $cardBg = imagecolorallocate($im, 255, 255, 255);
        $cardBorder = imagecolorallocate($im, 226, 232, 240);
        $textDark = imagecolorallocate($im, 15, 23, 42); // slate-900
        $textMuted = imagecolorallocate($im, 100, 116, 139); // slate-500
        $textSuccess = imagecolorallocate($im, 22, 163, 74); // green-600
        $lineColor = imagecolorallocate($im, 241, 245, 249);
        $watermarkColor = imagecolorallocate($im, 239, 68, 68); // red-500

        // Channel header brand colors
        $brandColors = [
            'kbzpay' => [
                'main' => imagecolorallocate($im, 14, 116, 144), // cyan-700 / KBZ blue
                'accent' => imagecolorallocate($im, 6, 182, 212),
                'name' => 'KBZPay (KPay)',
                'tag' => 'MERCHANT PAYMENT SUCCESS',
            ],
            'wavepay' => [
                'main' => imagecolorallocate($im, 202, 138, 4), // yellow-600 / Wave
                'accent' => imagecolorallocate($im, 234, 179, 8),
                'name' => 'WavePay / WaveMoney',
                'tag' => 'TRANSFER & QR SETTLEMENT',
            ],
            'cbpay' => [
                'main' => imagecolorallocate($im, 185, 28, 28), // red-700 / CB Bank
                'accent' => imagecolorallocate($im, 220, 38, 38),
                'name' => 'CB Pay Mobile',
                'tag' => 'INSTANT FUND TRANSFER',
            ],
            'ayapay' => [
                'main' => imagecolorallocate($im, 190, 24, 93), // pink-700 / AYA Pay
                'accent' => imagecolorallocate($im, 225, 29, 72),
                'name' => 'AYA Pay Merchant',
                'tag' => 'QR PAYMENT RECEIPT',
            ],
        ];

        $brand = $brandColors[$channel] ?? $brandColors['kbzpay'];

        // Fill background
        imagefilledrectangle($im, 0, 0, $width, $height, $bgLight);

        // Header banner
        imagefilledrectangle($im, 0, 0, $width, 110, $brand['main']);
        imagefilledrectangle($im, 0, 106, $width, 110, $brand['accent']);

        // Header Title
        imagestring($im, 5, 24, 28, strtoupper($brand['name']), imagecolorallocate($im, 255, 255, 255));
        imagestring($im, 2, 24, 52, $brand['tag'], imagecolorallocate($im, 224, 242, 254));
        imagestring($im, 2, 24, 74, "Official Payment Voucher - ReconGuard Enterprise", imagecolorallocate($im, 255, 255, 255));

        // White receipt card
        imagefilledrectangle($im, 20, 130, $width - 20, $height - 30, $cardBg);
        imagerectangle($im, 20, 130, $width - 20, $height - 30, $cardBorder);

        // Success Icon / Status
        imagefilledellipse($im, (int)($width / 2), 175, 48, 48, $textSuccess);
        imagestring($im, 5, (int)($width / 2) - 8, 167, "OK", imagecolorallocate($im, 255, 255, 255));

        $statusText = "Payment Successful";
        imagestring($im, 4, (int)($width / 2) - 75, 210, $statusText, $textDark);

        // Display Amount
        $amountFormatted = number_format((float) ($data['amount'] ?? 0), 2) . " MMK";
        imagestring($im, 5, (int)($width / 2) - (strlen($amountFormatted) * 4.5), 235, "- " . $amountFormatted, $brand['main']);

        // Divider
        imagefilledrectangle($im, 40, 270, $width - 40, 271, $cardBorder);

        // Details fields
        $fields = [
            ['label' => 'Merchant / Payee', 'value' => 'ReconGuard Enterprise Co., Ltd.'],
            ['label' => 'Transaction ID', 'value' => (string) ($data['transaction_id'] ?? 'N/A')],
            ['label' => 'Invoice Ref', 'value' => (string) ($data['invoice_number'] ?? 'N/A')],
            ['label' => 'Sender Name', 'value' => (string) ($data['sender_name'] ?? 'Daw Su Su')],
            ['label' => 'Sender Phone', 'value' => (string) ($data['sender_phone'] ?? '09#########')],
            ['label' => 'Payment Channel', 'value' => strtoupper($channel)],
            ['label' => 'Transaction Time', 'value' => (string) ($data['datetime'] ?? date('Y-m-d H:i:s'))],
            ['label' => 'Verification Mode', 'value' => strtoupper($mode)],
        ];

        $y = 295;
        foreach ($fields as $f) {
            imagestring($im, 3, 40, $y, $f['label'], $textMuted);
            $val = $f['value'];
            if (strlen($val) > 28) {
                $val = substr($val, 0, 28) . '...';
            }
            imagestring($im, 4, 210, $y, $val, $textDark);

            // subtle row line
            imagefilledrectangle($im, 40, $y + 24, $width - 40, $y + 25, $lineColor);
            $y += 38;
        }

        // Mode specific watermarks & simulated artifacts
        $isTampered = ($mode === 'tampered_amount');
        if ($isTampered) {
            // Add a visual discrepancy artifact box around amount
            imagerectangle($im, (int)($width / 2) - 120, 230, (int)($width / 2) + 120, 255, $watermarkColor);
            imagestring($im, 3, 40, $height - 110, "[TAMPER ARTIFACT DETECTED]", $watermarkColor);
            imagestring($im, 2, 40, $height - 90, "Simulated Photoshop 25.0 edit layer (Cloned Font pixels)", $watermarkColor);
        } elseif ($mode === 'duplicate_id') {
            imagestring($im, 3, 40, $height - 110, "[DUPLICATE TXN WARNING]", $watermarkColor);
            imagestring($im, 2, 40, $height - 90, "Transaction ID already claimed by another invoice", $watermarkColor);
        } else {
            imagestring($im, 2, 40, $height - 90, "Digitally signed by ReconGuard Mock Slip Engine v2.0", $textMuted);
        }

        // Security QR mock box
        imagefilledrectangle($im, $width - 100, $height - 110, $width - 40, $height - 50, $cardBorder);
        imagestring($im, 2, $width - 92, $height - 85, "SEC-QR", $brand['main']);

        // Capture buffer
        ob_start();
        imagepng($im);
        $imageBytes = ob_get_clean();
        imagedestroy($im);

        $metadata = [
            'Software' => $isTampered ? 'Adobe Photoshop 25.0 (Windows)' : 'Mobile Wallet Native App v4.8.2',
            'Tampered' => $isTampered,
            'Mode' => $mode,
            'Channel' => $channel,
            'TransactionID' => $data['transaction_id'] ?? null,
            'Amount' => (float) ($data['amount'] ?? 0),
            'SenderPhone' => $data['sender_phone'] ?? null,
            'SenderName' => $data['sender_name'] ?? null,
            'InvoiceNumber' => $data['invoice_number'] ?? null,
            'Datetime' => $data['datetime'] ?? date('Y-m-d H:i:s'),
            'GeneratedAt' => date('Y-m-d H:i:s'),
        ];

        // Embed PNG tEXt metadata chunk into the PNG binary stream
        $imageBytes = $this->embedPngTextChunk($imageBytes, 'ReconGuardMeta', json_encode($metadata));

        $filename = "slip_" . $channel . "_" . $mode . "_" . substr(md5(uniqid()), 0, 8) . ".png";

        return [
            'image_bytes' => $imageBytes,
            'mime' => 'image/png',
            'filename' => $filename,
            'metadata' => $metadata,
            'image_hash' => hash('sha256', $imageBytes),
        ];
    }

    /**
     * Embed a standard PNG tEXt chunk into a raw PNG binary stream before the IEND chunk.
     */
    protected function embedPngTextChunk(string $pngData, string $keyword, string $text): string
    {
        $iendPos = strrpos($pngData, 'IEND');
        if ($iendPos === false) {
            return $pngData;
        }

        // IEND chunk starts 4 bytes before 'IEND' (its length 0)
        $insertPos = $iendPos - 4;

        $chunkData = $keyword . "\0" . $text;
        $chunkLength = pack('N', strlen($chunkData));
        $chunkType = 'tEXt';
        $crc = pack('N', crc32($chunkType . $chunkData));

        $newChunk = $chunkLength . $chunkType . $chunkData . $crc;

        return substr($pngData, 0, $insertPos) . $newChunk . substr($pngData, $insertPos);
    }
}
