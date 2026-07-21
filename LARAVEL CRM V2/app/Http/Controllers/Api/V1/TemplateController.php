<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\WhatsappTemplateResource;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Message;
use App\Models\WhatsappNumber;
use App\Models\WhatsappTemplate;
use App\Services\Activity\ActivityLogger;
use App\Services\Whatsapp\CloudApiWhatsAppSender;
use App\Services\Whatsapp\TemplateSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TemplateController extends Controller
{
    /**
     * Templates with an image/video/document header synced from Meta (created directly on
     * Meta's dashboard — this app can't submit those for creation, see store() below) have no
     * source of a sendable header media link: Meta's template list API only reports the header
     * FORMAT, never a reusable URL. This lets an admin attach one locally so sends can use it.
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $this->authorize('create', WhatsappTemplate::class);

        $request->validate(['image' => 'required|file|mimes:jpeg,jpg,png,gif,webp|max:10240']);

        $file = $request->file('image');
        $fileName = Str::uuid().'.'.$file->getClientOriginalExtension();
        $path = $file->storeAs('template-images', $fileName, 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }

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
        $this->authorize('create', WhatsappTemplate::class);

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
            'buttons.*' => 'string|max:25',
            'examples' => 'nullable|array',
            'examples.*' => 'nullable|string',
        ]);

        preg_match_all('/\{\{\d+\}\}/', $data['body_text'], $matches);
        $data['variables_count'] = count($matches[0]);
        $data['header_type'] = $data['header_type'] ?? 'none';

        if (! empty($data['buttons'])) {
            $data['buttons'] = array_map(fn ($label) => ['type' => 'QUICK_REPLY', 'text' => $label], $data['buttons']);
        }

        $examples = $data['examples'] ?? [];
        unset($data['examples']);

        $number = WhatsappNumber::findOrFail($data['whatsapp_number_id']);

        if ($number->isCloud()) {
            if (! $number->access_token || ! $number->business_account_id) {
                return response()->json(['message' => 'هذا الرقم لا يدعم Cloud API. أضف access_token و business_account_id أولاً.'], 422);
            }

            if (! in_array($data['header_type'], ['none', 'text'], true)) {
                return response()->json(['message' => 'إضافة قالب بترويسة صورة/فيديو/مستند غير مدعومة من داخل التطبيق حالياً — عدّلها لاحقاً من لوحة ميتا.'], 422);
            }

            if ($data['variables_count'] > 0 && count(array_filter($examples)) < $data['variables_count']) {
                return response()->json(['message' => 'ميتا تتطلب قيمة "مثال" لكل متغير {{n}} بنص الرسالة قبل إرسالها للمراجعة.'], 422);
            }

            try {
                $sender = new CloudApiWhatsAppSender($number->access_token, $number->phone_number_id);
                $metaResponse = $sender->createTemplate($number->business_account_id, [
                    'name' => $data['name'],
                    'language' => $data['language'],
                    'category' => strtoupper($data['category']),
                    'components' => $this->buildMetaComponents($data, $examples),
                ]);
            } catch (\RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 422);
            }

            $data['meta_template_id'] = $metaResponse['id'] ?? null;
            $data['status'] = 'pending';
        } else {
            // Baileys numbers have no Meta review process — templates are just local canned messages.
            $data['status'] = $data['status'] ?? 'approved';
        }

        $template = WhatsappTemplate::create($data);
        ActivityLogger::record($template, 'create', "إضافة قالب واتساب: {$template->name}");

        return response()->json(['template' => new WhatsappTemplateResource($template)], 201);
    }

    /** Builds the Meta message_templates "components" payload from local form fields. */
    private function buildMetaComponents(array $data, array $examples): array
    {
        $components = [];

        if (($data['header_type'] ?? 'none') === 'text' && ! empty($data['header_content'])) {
            $components[] = ['type' => 'HEADER', 'format' => 'TEXT', 'text' => $data['header_content']];
        }

        $body = ['type' => 'BODY', 'text' => $data['body_text']];
        if (($data['variables_count'] ?? 0) > 0) {
            $body['example'] = ['body_text' => [array_values($examples)]];
        }
        $components[] = $body;

        if (! empty($data['footer_text'])) {
            $components[] = ['type' => 'FOOTER', 'text' => $data['footer_text']];
        }

        if (! empty($data['buttons'])) {
            $components[] = ['type' => 'BUTTONS', 'buttons' => $data['buttons']];
        }

        return $components;
    }

    public function update(Request $request, WhatsappTemplate $template): JsonResponse
    {
        $this->authorize('update', $template);

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
            'buttons.*' => 'string|max:25',
        ]);

        if (isset($data['body_text'])) {
            preg_match_all('/\{\{\d+\}\}/', $data['body_text'], $matches);
            $data['variables_count'] = count($matches[0]);
        }

        if (isset($data['buttons'])) {
            $data['buttons'] = array_map(fn ($label) => ['type' => 'QUICK_REPLY', 'text' => $label], $data['buttons']);
        }

        // A new header_content invalidates any media id cached for the old image — otherwise
        // sends would keep reusing Meta's id for a picture that's no longer the one saved here.
        if (array_key_exists('header_content', $data) && $data['header_content'] !== $template->header_content) {
            $data['header_media_id'] = null;
        }

        // Note: this only edits the local record — an already-submitted Meta template isn't
        // re-submitted for re-review here (that requires a separate versioning flow).
        $template->update($data);
        ActivityLogger::record($template, 'update', "تحديث قالب واتساب: {$template->name}");

        return response()->json(['template' => new WhatsappTemplateResource($template->fresh())]);
    }

    public function destroy(WhatsappTemplate $template): JsonResponse
    {
        $this->authorize('delete', $template);

        ActivityLogger::record($template, 'delete', "حذف قالب واتساب: {$template->name}");
        $template->delete();

        return response()->json(['message' => 'تم حذف القالب.']);
    }

    /**
     * Combines two sources of usage since a template can be sent two ways: one-off from
     * inside a conversation (tracked via messages.whatsapp_template_id) and in bulk via a
     * campaign (campaigns has no template FK, only a denormalized template_name — matched
     * here by name + whatsapp_number_id, same as everywhere else this link is made).
     */
    public function analytics(WhatsappTemplate $template): JsonResponse
    {
        $directCounts = Message::where('whatsapp_template_id', $template->id)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $campaignIds = Campaign::where('whatsapp_number_id', $template->whatsapp_number_id)
            ->where('template_name', $template->name)
            ->pluck('id');

        $campaignCounts = CampaignRecipient::whereIn('campaign_id', $campaignIds)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $merge = fn (string $status) => (int) ($directCounts[$status] ?? 0) + (int) ($campaignCounts[$status] ?? 0);

        return response()->json(['analytics' => [
            'campaigns_count' => $campaignIds->count(),
            'direct_sends' => (int) $directCounts->sum(),
            'sent' => $merge('sent'),
            'delivered' => $merge('delivered'),
            'read' => $merge('read'),
            'replied' => $merge('replied'),
            'failed' => $merge('failed'),
            'total_uses' => (int) $directCounts->sum() + (int) $campaignCounts->sum(),
        ]]);
    }

    public function sync(Request $request, TemplateSyncService $service): JsonResponse
    {
        $this->authorize('sync', WhatsappTemplate::class);

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
