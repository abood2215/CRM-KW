<?php

namespace Tests\Feature;

use App\Jobs\ProcessCampaignJob;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Contact;
use App\Models\WhatsappNumber;
use App\Models\WhatsappTemplate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ProcessCampaignJobTest extends TestCase
{
    use RefreshDatabase;

    private function connectedNumber(): WhatsappNumber
    {
        return WhatsappNumber::create([
            'name' => 'Test Number', 'phone' => '96500000000', 'phone_number_id' => 'pnid-1',
            'access_token' => 'fake-token', 'api_type' => 'cloud', 'status' => 'connected',
            'daily_limit' => 250, 'sent_today' => 0,
        ]);
    }

    private function recipient(Campaign $campaign): CampaignRecipient
    {
        $contact = Contact::create(['phone' => '96555555555', 'name' => 'عميل تجريبي', 'source' => 'campaign']);

        return CampaignRecipient::create([
            'campaign_id' => $campaign->id, 'contact_id' => $contact->id,
            'phone_snapshot' => $contact->phone, 'name_snapshot' => $contact->name, 'status' => 'pending',
        ]);
    }

    public function test_plain_text_campaign_sends_successfully_and_marks_recipient_sent(): void
    {
        $number = $this->connectedNumber();
        $campaign = Campaign::create([
            'name' => 'حملة نصية', 'whatsapp_number_id' => $number->id,
            'message_text' => 'مرحباً بكم', 'status' => 'running', 'total_recipients' => 1,
        ]);
        $recipient = $this->recipient($campaign);

        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.abc']]], 200)]);

        ProcessCampaignJob::dispatchSync($campaign->id);

        $this->assertSame('sent', $recipient->fresh()->status);
        $this->assertSame(1, $campaign->fresh()->sent_count);
    }

    /**
     * Regression for the 132012 incident: a campaign using an image-header template with no
     * header_content (and no campaign-level image_path override) must fail this recipient with
     * a clear reason instead of sending Meta an empty `components` array.
     */
    public function test_campaign_with_unresolvable_template_header_fails_recipient_without_crashing_job(): void
    {
        $number = $this->connectedNumber();
        WhatsappTemplate::create([
            'whatsapp_number_id' => $number->id, 'name' => 'promo_img', 'language' => 'ar',
            'category' => 'marketing', 'status' => 'approved', 'header_type' => 'image',
            'header_content' => null, 'body_text' => 'عرض خاص', 'variables_count' => 0,
        ]);
        $campaign = Campaign::create([
            'name' => 'حملة بصورة ناقصة', 'whatsapp_number_id' => $number->id,
            'template_name' => 'promo_img', 'template_language' => 'ar',
            'status' => 'running', 'total_recipients' => 1,
        ]);
        $recipient = $this->recipient($campaign);

        Http::fake(); // must never actually be called for this recipient

        ProcessCampaignJob::dispatchSync($campaign->id);

        $recipient->refresh();
        $this->assertSame('failed', $recipient->status);
        $this->assertStringContainsString('يتطلب هيدر', $recipient->error_message);
        $this->assertSame(1, $campaign->fresh()->failed_count);
        Http::assertNothingSent();
    }
}
