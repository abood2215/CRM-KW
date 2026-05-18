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

    // إنشاء قالب محلي جديد
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:255', 'regex:/^[a-z0-9_]+$/'],
            'language'       => 'required|string|max:10',
            'category'       => 'required|in:marketing,utility,authentication',
            'status'         => 'sometimes|in:approved,pending,rejected',
            'header_type'    => 'sometimes|in:none,text,image,video,document',
            'header_content' => 'nullable|string',
            'body_text'      => 'required|string',
            'footer_text'    => 'nullable|string',
            'buttons'        => 'nullable|array',
        ]);

        preg_match_all('/\{\{\d+\}\}/', $data['body_text'], $matches);
        $data['variables_count'] = count($matches[0]);
        $data['status']      = $data['status']      ?? 'approved';
        $data['header_type'] = $data['header_type'] ?? 'none';

        $template = WhatsappTemplate::create($data);

        return response()->json(['template' => $template], 201);
    }

    // تعديل قالب
    public function update(Request $request, int $id): JsonResponse
    {
        $template = WhatsappTemplate::findOrFail($id);

        $data = $request->validate([
            'name'           => ['sometimes', 'string', 'max:255', 'regex:/^[a-z0-9_]+$/'],
            'language'       => 'sometimes|string|max:10',
            'category'       => 'sometimes|in:marketing,utility,authentication',
            'status'         => 'sometimes|in:approved,pending,rejected',
            'header_type'    => 'sometimes|in:none,text,image,video,document',
            'header_content' => 'nullable|string',
            'body_text'      => 'sometimes|string',
            'footer_text'    => 'nullable|string',
            'buttons'        => 'nullable|array',
        ]);

        if (isset($data['body_text'])) {
            preg_match_all('/\{\{\d+\}\}/', $data['body_text'], $matches);
            $data['variables_count'] = count($matches[0]);
        }

        $template->update($data);

        return response()->json(['template' => $template->fresh()]);
    }

    // حذف قالب
    public function destroy(int $id): JsonResponse
    {
        WhatsappTemplate::findOrFail($id)->delete();

        return response()->json(['message' => 'تم حذف القالب.']);
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
