<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class AuditDateFilterService
{
    /**
     * Apply date scoping and interactive date filter to an Eloquent query.
     * Returns resolved filter parameters and human-readable scope summary.
     */
    public static function apply(Builder $query, Request $request, string $column = 'created_at'): array
    {
        $dateScope = $request->query('date_scope');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $singleDate = $request->query('single_date');

        // Default to 'this_month' if no date parameters are explicitly given
        if (empty($dateScope) && empty($startDate) && empty($endDate) && empty($singleDate)) {
            $dateScope = 'this_month';
        }

        $now = Carbon::now();
        $summary = '';

        if (!empty($singleDate)) {
            $parsed = Carbon::parse($singleDate);
            $query->whereDate($column, $parsed->toDateString());
            $dateScope = 'custom';
            $summary = "Single Date: " . $parsed->format('M d, Y');
        } elseif (!empty($startDate) && !empty($endDate)) {
            $s = Carbon::parse($startDate)->startOfDay();
            $e = Carbon::parse($endDate)->endOfDay();
            $query->whereBetween($column, [$s, $e]);
            $dateScope = 'custom';
            $summary = "Range: " . $s->format('M d, Y') . " - " . $e->format('M d, Y');
        } elseif (!empty($startDate)) {
            $s = Carbon::parse($startDate)->startOfDay();
            $query->where($column, '>=', $s);
            $dateScope = 'custom';
            $summary = "From: " . $s->format('M d, Y');
        } elseif (!empty($endDate)) {
            $e = Carbon::parse($endDate)->endOfDay();
            $query->where($column, '<=', $e);
            $dateScope = 'custom';
            $summary = "Until: " . $e->format('M d, Y');
        } else {
            switch ($dateScope) {
                case 'today':
                    $query->whereDate($column, Carbon::today());
                    $summary = "Today (" . Carbon::today()->format('M d, Y') . ")";
                    break;
                case 'this_week':
                    $s = Carbon::now()->startOfWeek();
                    $e = Carbon::now()->endOfWeek();
                    $query->whereBetween($column, [$s, $e]);
                    $summary = "This Week (" . $s->format('M d') . " - " . $e->format('M d, Y') . ")";
                    break;
                case 'this_month':
                    $s = Carbon::now()->startOfMonth();
                    $e = Carbon::now()->endOfMonth();
                    $query->whereBetween($column, [$s, $e]);
                    $summary = "This Month (" . $now->format('M Y') . ")";
                    break;
                case 'all':
                default:
                    $dateScope = 'all';
                    $summary = "All Time History";
                    break;
            }
        }

        return [
            'date_scope'    => $dateScope,
            'start_date'    => $startDate ?: null,
            'end_date'      => $endDate ?: null,
            'single_date'   => $singleDate ?: null,
            'scope_summary' => $summary,
            'is_default'    => $dateScope === 'this_month' && empty($startDate) && empty($endDate) && empty($singleDate),
        ];
    }
}
