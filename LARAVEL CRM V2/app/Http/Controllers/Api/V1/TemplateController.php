<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\WhatsappTemplateResource;
use App\Models\WhatsappNumber;
use App\Models\WhatsappTemplate;
use App\Services\Activity\ActivityLogger;
use App\Services\Whatsapp\TemplateSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = WhatsappTemplate::with('whatsappNumber')->latest('last_synced_at');

        if ($request->status) {
            $status = $request->status;
            if ($status === 'approved') {
                $query->whereIn('status', ['approved', 'active']);
            } else {
                $query->where('status', $status);
            }
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

        return response()->json(['templates' => WhatsappTemplateResource::collection($query->get())]);
    }

    public function show(WhatsappTemplate $template): JsonResponse
    {
        return response()->json(['template' => new WhatsappTemplateResource($template->load('whatsappNumber'))]);
    }

    public function preview(string $name): JsonResponse
    {
        $template = WhatsappTemplate::where('name', $name)->firstOrFail();

        return response()->json(['template' => new WhatsappTemplateResource($template)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'whatsapp_number_id' => 'required|exists:whatsapp_numbers,id',
            'name' => [
                'required', 'string', 'max:255', 'regex:/^[a-z0-9_]+$/',
                Rule::unique('whatsapp_templates')->where('whatsapp_number_id', $request->whatsapp_number_id),
            ],
            'language' => 'required|string|max:10',
            'category' => 'required|in:marketing,utility,authentication',
            'status' => 'sometimes|in:approved,pending,rejected',
            'header_type' => 'sometimes|in:none,text,image,video,document',
            'header_content' => 'nullable|string',
            'body_text' => 'required|string',
            'footer_text' => 'nullable|string',
            'buttons' => 'nullable|array',
        ]);

        preg_match_all('/\{\{\d+\}\}/', $data['body_text'], $matches);
        $data['variables_count'] = count($matches[0]);
        $data['status'] = $data['status'] ?? 'approved';
        $data['header_type'] = $data['header_type'] ?? 'none';

        $template = WhatsappTemplate::create($data);
        ActivityLogger::record($template, 'create', "إضافة قالب واتساب: {$template->name}");

        return response()->json(['template' => new WhatsappTemplateResource($template)], 201);
    }

    public function update(Request $request, WhatsappTemplate $template): JsonResponse
    {
        $data = $request->validate([
            'name' => [
                'sometimes', 'string', 'max:255', 'regex:/^[a-z0-9_]+$/',
                Rule::unique('whatsapp_templates')->where('whatsapp_number_id', $template->whatsapp_number_id)->ignore($template->id),
            ],
            'language' => 'sometimes|string|max:10',
            'category' => 'sometimes|in:marketing,utility,authentication',
            'status' => 'sometimes|in:approved,pending,rejected',
            'header_type' => 'sometimes|in:none,text,image,video,document',
            'header_content' => 'nullable|string',
            'body_text' => 'sometimes|string',
            'footer_text' => 'nullable|string',
            'buttons' => 'nullable|array',
        ]);

        if (isset($data['body_text'])) {
            preg_match_all('/\{\{\d+\}\}/', $data['body_text'], $matches);
            $data['variables_count'] = count($matches[0]);
        }

        $template->update($data);
        ActivityLogger::record($template, 'update', "تحديث قالب واتساب: {$template->name}");

        return response()->json(['template' => new WhatsappTemplateResource($template->fresh())]);
    }

    public function destroy(WhatsappTemplate $template): JsonResponse
    {
        ActivityLogger::record($template, 'delete', "حذف قالب واتساب: {$template->name}");
        $template->delete();

        return response()->json(['message' => 'تم حذف القالب.']);
    }

    public function sync(Request $request, TemplateSyncService $service): JsonResponse
    {
        $request->validate(['whatsapp_number_id' => 'required|exists:whatsapp_numbers,id']);

        $number = WhatsappNumber::findOrFail($request->whatsapp_number_id);

        try {
            $synced = $service->sync($number);

            return response()->json(['message' => "تم مزامنة {$synced} قالب بنجاح.", 'synced' => $synced]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'فشلت المزامنة: '.$e->getMessage()], 500);
        }
    }
}
