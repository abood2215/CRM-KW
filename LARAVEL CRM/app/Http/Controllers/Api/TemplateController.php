<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsappNumber;
use App\Models\WhatsappTemplate;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TemplateController extends Controller
{
    // جلب قائمة القوالب
    public function index(Request $request): JsonResponse
    {
        $query = WhatsappTemplate::with('whatsappNumber')->latest('last_synced_at');

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->category) {
            $query->where('category', $request->category);
        }

        if ($request->whatsapp_number_id) {
            $query->where('whatsapp_number_id', $request->whatsapp_number_id);
        }

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $templates = $query->get();

        return response()->json(['templates' => $templates]);
    }

    // جلب تفاصيل قالب واحد
    public function show(int $id): JsonResponse
    {
        $template = WhatsappTemplate::with('whatsappNumber')->findOrFail($id);

        return response()->json(['template' => $template]);
    }

    // معاينة قالب بالاسم
    public function preview(string $name): JsonResponse
    {
        $template = WhatsappTemplate::where('name', $name)->firstOrFail();

        return response()->json(['template' => $template]);
    }

    // مزامنة القوالب من Meta API
    public function sync(Request $request): JsonResponse
    {
        $request->validate([
            'whatsapp_number_id' => 'required|exists:whatsapp_numbers,id',
        ]);

        $number = WhatsappNumber::findOrFail($request->whatsapp_number_id);

        $whatsapp = new WhatsAppService(
            $number->access_token,
            $number->phone_number_id
        );

        try {
            $apiTemplates = $whatsapp->getTemplates($number->business_account_id);

            $synced = 0;

            foreach ($apiTemplates as $tpl) {
                // استخراج مكونات القالب
                $headerType    = 'none';
                $headerContent = null;
                $bodyText      = '';
                $footerText    = null;
                $buttons       = null;
                $variablesCount = 0;

                foreach ($tpl['components'] ?? [] as $component) {
                    switch ($component['type']) {
                        case 'HEADER':
                            $headerType    = strtolower($component['format'] ?? 'text');
                            $headerContent = $component['text'] ?? null;
                            break;
                        case 'BODY':
                            $bodyText = $component['text'] ?? '';
                            // احسب عدد المتغيرات {{1}}, {{2}} ...
                            preg_match_all('/\{\{\d+\}\}/', $bodyText, $matches);
                            $variablesCount = count($matches[0]);
                            break;
                        case 'FOOTER':
                            $footerText = $component['text'] ?? null;
                            break;
                        case 'BUTTONS':
                            $buttons = $component['buttons'] ?? null;
                            break;
                    }
                }

                WhatsappTemplate::updateOrCreate(
                    [
                        'whatsapp_number_id' => $number->id,
                        'name'               => $tpl['name'],
                    ],
                    [
                        'language'        => $tpl['language'] ?? 'ar',
                        'category'        => strtolower($tpl['category'] ?? 'marketing'),
                        'status'          => strtolower($tpl['status'] ?? 'pending'),
                        'header_type'     => $headerType,
                        'header_content'  => $headerContent,
                        'body_text'       => $bodyText,
                        'footer_text'     => $footerText,
                        'buttons'         => $buttons,
                        'variables_count' => $variablesCount,
                        'last_synced_at'  => now(),
                    ]
                );

                $synced++;
            }

            return response()->json([
                'message' => "تم مزامنة {$synced} قالب بنجاح.",
                'synced'  => $synced,
            ]);

        } catch (\Exception $e) {
            Log::error('Template sync error: ' . $e->getMessage());
            return response()->json([
                'message' => 'فشلت المزامنة: ' . $e->getMessage(),
            ], 500);
        }
    }
}
