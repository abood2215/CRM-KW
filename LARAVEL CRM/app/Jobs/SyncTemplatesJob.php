<?php

namespace App\Jobs;

use App\Models\WhatsappNumber;
use App\Models\WhatsappTemplate;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

// يشتغل كل 6 ساعات - يجلب القوالب من Meta API ويحدث قاعدة البيانات
class SyncTemplatesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 120;

    public function __construct(
        protected ?int $whatsappNumberId = null
    ) {}

    public function handle(): void
    {
        // إما رقم محدد أو كل الأرقام النشطة
        $numbers = $this->whatsappNumberId
            ? WhatsappNumber::where('id', $this->whatsappNumberId)->where('status', 'active')->get()
            : WhatsappNumber::where('status', 'active')->get();

        foreach ($numbers as $number) {
            if (!$number->access_token || !$number->phone_number_id) {
                continue;
            }

            try {
                $whatsapp = new WhatsAppService(
                    $number->access_token,
                    $number->phone_number_id
                );

                $apiTemplates = $whatsapp->getTemplates($number->business_account_id);

                foreach ($apiTemplates as $tpl) {
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
                }

                Log::info("SyncTemplatesJob: مزامنة " . count($apiTemplates) . " قالب للرقم {$number->phone}");

            } catch (\Exception $e) {
                Log::error("SyncTemplatesJob فشل للرقم {$number->id}: " . $e->getMessage());
            }
        }
    }
}
