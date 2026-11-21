<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockOpname;
use App\Services\ExcelExportService;
use Illuminate\Http\Request;

/** Export laporan ke Excel — khusus owner */
class ReportController extends Controller
{
    /** GET /api/reports/events?month=2026-11 */
    public function events(Request $request, ExcelExportService $excel)
    {
        $month = $request->validate(['month' => ['required', 'date_format:Y-m']], ['month.*' => 'Bulan tidak valid.'])['month'];

        return $excel->events($month);
    }

    /** GET /api/reports/opnames/{opname} */
    public function opname(StockOpname $opname, ExcelExportService $excel)
    {
        return $excel->opname($opname);
    }
}
