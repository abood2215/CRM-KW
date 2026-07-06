<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Services\Stats\StatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StatsController extends Controller
{
    public function __construct(private readonly StatsService $stats)
    {
    }

    public function dashboard(Request $request): JsonResponse
    {
        return response()->json($this->stats->dashboard($request->get('range', 'week')));
    }

    public function campaigns(): JsonResponse
    {
        return response()->json($this->stats->campaigns());
    }

    public function exportCampaignsCsv(): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="campaigns-report.csv"',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($handle, ['الحملة', 'الحالة', 'المستهدفون', 'المُرسَل', 'الفاشل', 'الردود', 'نسبة الإنجاز', 'تاريخ الإنشاء']);

            Campaign::orderBy('id')->chunk(500, function ($chunk) use ($handle) {
                foreach ($chunk as $c) {
                    fputcsv($handle, [
                        $c->name,
                        $c->status,
                        $c->total_recipients,
                        $c->sent_count,
                        $c->failed_count,
                        $c->reply_count,
                        $c->progress_percentage.'%',
                        $c->created_at->format('Y-m-d'),
                    ]);
                }
            });

            fclose($handle);
        }, 200, $headers);
    }

    public function agents(): JsonResponse
    {
        return response()->json(['agents' => $this->stats->agents()]);
    }

    public function whatsapp(): JsonResponse
    {
        return response()->json($this->stats->whatsapp());
    }
}
