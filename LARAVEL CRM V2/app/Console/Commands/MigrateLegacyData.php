<?php

namespace App\Console\Commands;

use App\ValueObjects\PhoneNumber;
use Illuminate\Console\Command;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\DB;

/**
 * One-time Phase 5 migration: reads the OLD app's database (connection
 * "legacy", read-only) and populates the V2 database (default connection)
 * with the unified schema. Designed to run against a RESTORED COPY of a
 * production backup — never point LEGACY_DB_* at a live database, since
 * a mistake in the .env direction would be catastrophic even though this
 * command only ever reads from "legacy".
 *
 * Usage:
 *   php artisan migrate:legacy-data --dry-run   (reports counts, writes nothing)
 *   php artisan migrate:legacy-data              (writes for real, wrapped in one transaction)
 */
class MigrateLegacyData extends Command
{
    protected $signature = 'migrate:legacy-data {--dry-run : Roll back at the end and only report what would happen} {--force : Skip the interactive backup-source confirmation}';

    protected $description = 'Migrate data from the old CRM database into the V2 schema';

    /** @var array<int,int> old_user_id => new_user_id */
    private array $userMap = [];

    /** @var array<int,int> old_crm_client_id => new_contact_id */
    private array $clientContactMap = [];

    /** @var array<int,int> old_contact_id => new_contact_id */
    private array $contactMap = [];

    /** @var array<int,int> old_whatsapp_number_id => new_id */
    private array $numberMap = [];

    /** @var array<int,int> old_contact_list_id => new_id */
    private array $listMap = [];

    /** @var array<int,int> old_campaign_id => new_id */
    private array $campaignMap = [];

    /** @var array<int,int> old_conversation_id => new_id */
    private array $conversationMap = [];

    private array $counts = [];

    private ?Encrypter $legacyEncrypter = null;

    private bool $legacyEncrypterResolved = false;

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        if (! $this->confirmLegacyConnection()) {
            return self::FAILURE;
        }

        DB::beginTransaction();

        try {
            $this->migrateUsers();
            $this->migrateContacts();
            $this->migrateTasks();
            $this->migrateWhatsappNumbers();
            $this->migrateWhatsappTemplates();
            $this->migrateContactLists();
            $this->migrateCampaigns();
            $this->migrateCampaignRecipients();
            $this->migrateConversations();
            $this->migrateMessages();
            $this->migrateCannedResponses();
            $this->migrateAutoReplies();
            $this->migrateBusinessHours();
            $this->migrateNotifications();
            $this->migrateActivityLogs();

            if ($dryRun) {
                DB::rollBack();
                $this->newLine();
                $this->warn('DRY RUN — nothing was written. Counts above are what WOULD be migrated.');
            } else {
                DB::commit();
                $this->newLine();
                $this->info('Migration committed.');
            }
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error('Migration failed, rolled back: '.$e->getMessage());
            $this->error($e->getFile().':'.$e->getLine());

            return self::FAILURE;
        }

        $this->table(['Entity', 'Migrated'], collect($this->counts)->map(fn ($v, $k) => [$k, $v])->values());

        $this->newLine();
        $this->comment('Note: this migrates DATABASE rows only. Physical files under storage/app (Drive uploads, campaign images, template header images) must be copied to the new server separately.');

        return self::SUCCESS;
    }

    private function confirmLegacyConnection(): bool
    {
        try {
            $db = DB::connection('legacy')->getDatabaseName();
        } catch (\Throwable $e) {
            $this->error('Cannot connect to the "legacy" database connection: '.$e->getMessage());

            return false;
        }

        $this->warn("About to READ from legacy database \"{$db}\" and WRITE into the current V2 database.");

        if ($this->option('force')) {
            return true;
        }

        return $this->confirm('Confirm this is a restored backup copy, NOT the live production database?', false);
    }

    private function record(string $key, int $count): void
    {
        $this->counts[$key] = $count;
        $this->line("  {$key}: {$count}");
    }

    private function legacy(string $table)
    {
        return DB::connection('legacy')->table($table);
    }

    /**
     * Some crm_clients.phone rows are Laravel-encrypted (leftover from a past
     * code version of the old app); others are plain text. Try decrypting
     * with the old app's production APP_KEY and fall back to the raw value
     * if it isn't ciphertext at all.
     */
    private function decryptLegacyValue(?string $value): ?string
    {
        if (! $value) {
            return $value;
        }

        $encrypter = $this->legacyEncrypter();
        if (! $encrypter) {
            return $value;
        }

        try {
            return $encrypter->decryptString($value);
        } catch (DecryptException) {
            return $value;
        }
    }

    private function legacyEncrypter(): ?Encrypter
    {
        if ($this->legacyEncrypterResolved) {
            return $this->legacyEncrypter;
        }

        $this->legacyEncrypterResolved = true;

        $key = config('database.connections.legacy.app_key');
        if (! $key) {
            return null;
        }

        $key = str_starts_with($key, 'base64:') ? base64_decode(substr($key, 7)) : $key;

        return $this->legacyEncrypter = new Encrypter($key, 'AES-256-CBC');
    }

    private function migrateUsers(): void
    {
        $this->info('Migrating users...');
        $rows = $this->legacy('users')->get();

        foreach ($rows as $row) {
            $existing = DB::table('users')->where('email', $row->email)->first();

            if ($existing) {
                $this->userMap[$row->id] = $existing->id;

                continue;
            }

            $newId = DB::table('users')->insertGetId([
                'name' => $row->name,
                'email' => $row->email,
                'password' => $row->password,
                'role' => $row->role ?? 'agent',
                'avatar' => $row->avatar ?? null,
                'phone' => $row->phone ?? null,
                'last_seen_at' => $row->last_seen_at ?? null,
                'is_active' => $row->is_active ?? true,
                'email_verified_at' => $row->email_verified_at ?? null,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);

            $this->userMap[$row->id] = $newId;
        }

        $this->record('users', count($this->userMap));
    }

    /** Merges legacy crm_clients + contacts into the unified contacts table, matched by normalized phone. */
    private function migrateContacts(): void
    {
        $this->info('Migrating contacts (merging crm_clients + contacts)...');
        $phoneToNewId = [];
        $count = 0;

        foreach ($this->legacy('crm_clients')->get() as $row) {
            $phone = $row->phone ? PhoneNumber::normalize($this->decryptLegacyValue($row->phone)) : null;

            $newId = $phoneToNewId[$phone] ?? null;
            $data = [
                'user_id' => $this->userMap[$row->user_id] ?? null,
                'name' => $row->name,
                'phone' => $phone ?: ('unknown-'.$row->id),
                'email' => $row->email,
                'source' => $row->source,
                'pipeline_stage' => $row->status,
                'service' => $row->service,
                'budget' => $row->budget,
                'notes' => $row->notes,
                'updated_at' => $row->updated_at,
            ];

            if ($newId) {
                DB::table('contacts')->where('id', $newId)->update($data);
            } else {
                $newId = DB::table('contacts')->insertGetId($data + [
                    'tags' => null,
                    'opt_in' => false,
                    'opt_out' => false,
                    'is_blacklisted' => false,
                    'fail_count' => 0,
                    'created_at' => $row->created_at,
                ]);
                if ($phone) {
                    $phoneToNewId[$phone] = $newId;
                }
                $count++;
            }

            $this->clientContactMap[$row->id] = $newId;
        }

        foreach ($this->legacy('contacts')->get() as $row) {
            $phone = PhoneNumber::normalize($this->decryptLegacyValue($row->phone));
            $newId = $phoneToNewId[$phone] ?? null;

            $data = [
                'tags' => $row->tags,
                'opt_in' => (bool) $row->opt_in,
                'opt_in_date' => $row->opt_in_date,
                'opt_out' => (bool) $row->opt_out,
                'opt_out_date' => $row->opt_out_date,
                'is_blacklisted' => (bool) $row->is_blacklisted,
                'blacklisted_until' => $row->blacklisted_until ?? null,
                'fail_count' => $row->fail_count ?? 0,
            ];

            if ($newId) {
                DB::table('contacts')->where('id', $newId)->update($data);
            } else {
                $newId = DB::table('contacts')->insertGetId($data + [
                    'user_id' => $this->userMap[$row->user_id] ?? null,
                    'name' => $row->name,
                    'phone' => $phone,
                    'email' => $row->email,
                    'source' => $row->source,
                    'notes' => null,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                ]);
                $phoneToNewId[$phone] = $newId;
                $count++;
            }

            $this->contactMap[$row->id] = $newId;
        }

        $this->record('contacts', $count);
    }

    private function migrateTasks(): void
    {
        $this->info('Migrating tasks...');
        $rows = $this->legacy('crm_tasks')->get();

        foreach ($rows as $row) {
            DB::table('tasks')->insert([
                'user_id' => $this->userMap[$row->user_id] ?? null,
                'contact_id' => $this->clientContactMap[$row->client_id] ?? null,
                'title' => $row->title,
                'description' => $row->description,
                'type' => $row->type,
                'priority' => $row->priority ?? 'medium',
                'due_date' => $row->due_date,
                'completed_at' => $row->completed_at,
                'status' => $row->status,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
        }

        $this->record('tasks', $rows->count());
    }

    private function migrateWhatsappNumbers(): void
    {
        $this->info('Migrating whatsapp numbers...');
        $rows = $this->legacy('whatsapp_numbers')->get();

        foreach ($rows as $row) {
            $newId = DB::table('whatsapp_numbers')->insertGetId([
                'name' => $row->name,
                'phone' => $row->phone,
                'session_name' => $row->session_name ?? null,
                'phone_number_id' => $row->phone_number_id ?? null,
                'access_token' => $row->access_token ?? null,
                'business_account_id' => $row->business_account_id ?? null,
                'api_type' => $row->api_type ?? 'cloud',
                'status' => $row->status,
                'daily_limit' => $row->daily_limit ?? 250,
                'sent_today' => $row->sent_today ?? 0,
                'week_number' => $row->week_number ?? null,
                'last_sent_at' => $row->last_sent_at ?? null,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
            $this->numberMap[$row->id] = $newId;
        }

        $this->record('whatsapp_numbers', $rows->count());
    }

    private function migrateWhatsappTemplates(): void
    {
        $this->info('Migrating whatsapp templates...');
        $rows = $this->legacy('whatsapp_templates')->get();
        $count = 0;

        foreach ($rows as $row) {
            if (! isset($this->numberMap[$row->whatsapp_number_id])) {
                continue;
            }

            DB::table('whatsapp_templates')->insert([
                'whatsapp_number_id' => $this->numberMap[$row->whatsapp_number_id],
                'name' => $row->name,
                'language' => $row->language ?? 'ar',
                'category' => $row->category ?? 'marketing',
                'status' => $row->status ?? 'approved',
                'header_type' => $row->header_type ?? 'none',
                'header_content' => $row->header_content ?? null,
                'body_text' => $row->body_text,
                'footer_text' => $row->footer_text ?? null,
                'buttons' => $row->buttons ?? null,
                'variables_count' => $row->variables_count ?? 0,
                'last_synced_at' => $row->last_synced_at ?? null,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
            $count++;
        }

        $this->record('whatsapp_templates', $count);
    }

    private function migrateContactLists(): void
    {
        $this->info('Migrating contact lists...');
        $rows = $this->legacy('contact_lists')->get();

        foreach ($rows as $row) {
            $newId = DB::table('contact_lists')->insertGetId([
                'user_id' => $this->userMap[$row->user_id] ?? null,
                'name' => $row->name,
                'description' => $row->description ?? null,
                'count' => 0,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
            $this->listMap[$row->id] = $newId;
        }

        $itemRows = $this->legacy('contact_list_items')->get();
        $itemCount = 0;

        foreach ($itemRows as $row) {
            $newListId = $this->listMap[$row->contact_list_id] ?? null;
            $newContactId = $this->contactMap[$row->contact_id] ?? null;

            if (! $newListId || ! $newContactId) {
                continue;
            }

            DB::table('contact_list_items')->insertOrIgnore([
                'contact_list_id' => $newListId,
                'contact_id' => $newContactId,
                'created_at' => $row->created_at ?? now(),
                'updated_at' => $row->updated_at ?? now(),
            ]);
            $itemCount++;
        }

        foreach ($this->listMap as $newId) {
            $count = DB::table('contact_list_items')->where('contact_list_id', $newId)->count();
            DB::table('contact_lists')->where('id', $newId)->update(['count' => $count]);
        }

        $this->record('contact_lists', $rows->count());
        $this->record('contact_list_items', $itemCount);
    }

    private function migrateCampaigns(): void
    {
        $this->info('Migrating campaigns...');
        $rows = $this->legacy('campaigns')->get();

        foreach ($rows as $row) {
            $newId = DB::table('campaigns')->insertGetId([
                'user_id' => $this->userMap[$row->user_id] ?? null,
                'whatsapp_number_id' => $this->numberMap[$row->whatsapp_number_id] ?? null,
                'contact_list_id' => $this->listMap[$row->contact_list_id] ?? null,
                'name' => $row->name,
                'description' => $row->description ?? null,
                'template_name' => $row->template_name ?? null,
                'template_language' => $row->template_language ?? 'ar',
                'template_variables' => $row->template_variables ?? null,
                'message_text' => $row->message_text ?? null,
                'image_path' => $row->image_path ?? null,
                'status' => in_array($row->status, ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled']) ? $row->status : 'completed',
                'scheduled_at' => $row->scheduled_at ?? null,
                'started_at' => $row->started_at ?? null,
                'completed_at' => $row->completed_at ?? null,
                'total_recipients' => $row->total_recipients ?? 0,
                'sent_count' => $row->sent_count ?? 0,
                'failed_count' => $row->failed_count ?? 0,
                'reply_count' => $row->reply_count ?? 0,
                'open_count' => $row->open_count ?? 0,
                'block_count' => $row->block_count ?? 0,
                'delay_seconds' => $row->delay_seconds ?? 30,
                'stop_on_fail_rate' => $row->stop_on_fail_rate ?? null,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
            $this->campaignMap[$row->id] = $newId;
        }

        $this->record('campaigns', $rows->count());
    }

    /** Historical recipients get find-or-create Contact rows by phone, same as a live campaign send would. */
    private function migrateCampaignRecipients(): void
    {
        $this->info('Migrating campaign recipients...');
        $rows = $this->legacy('campaign_recipients')->get();
        $count = 0;

        foreach ($rows as $row) {
            $newCampaignId = $this->campaignMap[$row->campaign_id] ?? null;
            if (! $newCampaignId) {
                continue;
            }

            $phone = PhoneNumber::normalize($row->phone);
            $contactId = $this->findOrCreateContactByPhone($phone, $row->name);

            DB::table('campaign_recipients')->insert([
                'campaign_id' => $newCampaignId,
                'contact_id' => $contactId,
                'phone_snapshot' => $phone,
                'name_snapshot' => $row->name,
                'status' => $row->status,
                'sent_at' => $row->sent_at ?? null,
                'error_message' => $row->error_message ?? null,
                'whatsapp_message_id' => $row->whatsapp_message_id ?? null,
                'variables' => $row->variables ?? null,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
            $count++;
        }

        $this->record('campaign_recipients', $count);
    }

    private function migrateConversations(): void
    {
        $this->info('Migrating conversations...');
        $rows = $this->legacy('conversations')->get();

        foreach ($rows as $row) {
            $newId = DB::table('conversations')->insertGetId([
                'contact_id' => $this->clientContactMap[$row->client_id] ?? null,
                'assigned_user_id' => $this->userMap[$row->assigned_user_id ?? null] ?? null,
                'chatwoot_conv_id' => $row->chatwoot_conv_id ?? null,
                'status' => $row->status,
                'source' => $row->source ?? 'whatsapp',
                // Historical origin can't be reliably reconstructed — defaults to false
                // (real customer conversation). Only matters for badges going forward.
                'is_campaign_origin' => false,
                'last_message' => $row->last_message ?? null,
                'last_message_at' => $row->last_message_at ?? null,
                'unread_count' => $row->unread_count ?? 0,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
            $this->conversationMap[$row->id] = $newId;
        }

        $this->record('conversations', $rows->count());
    }

    private function migrateMessages(): void
    {
        $this->info('Migrating messages...');
        $rows = $this->legacy('messages')->get();
        $count = 0;

        foreach ($rows as $row) {
            $newConversationId = $this->conversationMap[$row->conversation_id] ?? null;
            if (! $newConversationId) {
                continue;
            }

            DB::table('messages')->insert([
                'conversation_id' => $newConversationId,
                'chatwoot_message_id' => $row->chatwoot_message_id ?? null,
                'whatsapp_message_id' => $row->whatsapp_message_id ?? null,
                'content' => $row->content,
                'type' => $row->type ?? 'text',
                'direction' => $row->direction,
                'is_private' => (bool) $row->is_private,
                'sender_name' => $row->sender_name ?? null,
                'status' => $row->status ?? null,
                'sent_at' => $row->sent_at ?? null,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
            $count++;
        }

        $this->record('messages', $count);
    }

    private function migrateCannedResponses(): void
    {
        $this->info('Migrating canned responses...');
        $rows = $this->legacy('canned_responses')->get();

        foreach ($rows as $row) {
            DB::table('canned_responses')->insert([
                'user_id' => $this->userMap[$row->user_id] ?? null,
                'title' => $row->title,
                'content' => $row->content,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
        }

        $this->record('canned_responses', $rows->count());
    }

    private function migrateAutoReplies(): void
    {
        $this->info('Migrating auto replies...');
        $rows = $this->legacy('auto_replies')->get();

        foreach ($rows as $row) {
            DB::table('auto_replies')->updateOrInsert(
                ['trigger' => $row->trigger],
                ['message' => $row->message, 'is_active' => (bool) $row->is_active, 'created_at' => $row->created_at, 'updated_at' => $row->updated_at],
            );
        }

        $this->record('auto_replies', $rows->count());
    }

    private function migrateBusinessHours(): void
    {
        $this->info('Migrating business hours...');
        $rows = $this->legacy('business_hours')->get();

        foreach ($rows as $row) {
            DB::table('business_hours')->updateOrInsert(
                ['day_of_week' => $row->day_of_week],
                ['start_time' => $row->start_time, 'end_time' => $row->end_time, 'is_active' => (bool) $row->is_active],
            );
        }

        $this->record('business_hours', $rows->count());
    }

    private function migrateNotifications(): void
    {
        if (! $this->legacyTableExists('notifications')) {
            $this->record('notifications', 0);

            return;
        }

        $this->info('Migrating notifications...');
        $rows = $this->legacy('notifications')->get();
        $count = 0;

        foreach ($rows as $row) {
            $newUserId = $this->userMap[$row->user_id] ?? null;
            if (! $newUserId) {
                continue;
            }

            DB::table('notifications')->insert([
                'user_id' => $newUserId,
                'type' => $row->type,
                'title' => $row->title,
                'message' => $row->message,
                'data' => $row->data ?? null,
                'read_at' => $row->read_at ?? null,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
            $count++;
        }

        $this->record('notifications', $count);
    }

    /**
     * Best-effort remap: activity_logs.model_type is a bare legacy class name
     * (e.g. "CrmClient"), so we translate it into the new morph-map alias and
     * the corresponding new subject_id. Rows whose model_type we can't map
     * (or whose target row didn't migrate) get a null subject rather than
     * failing the whole migration.
     */
    private function migrateActivityLogs(): void
    {
        if (! $this->legacyTableExists('activity_logs')) {
            $this->record('activity_logs', 0);

            return;
        }

        $this->info('Migrating activity logs (best-effort subject remap)...');
        $rows = $this->legacy('activity_logs')->get();
        $count = 0;

        $modelMap = [
            'CrmClient' => ['alias' => 'contact', 'map' => $this->clientContactMap],
            'Contact' => ['alias' => 'contact', 'map' => $this->contactMap],
            'Campaign' => ['alias' => 'campaign', 'map' => $this->campaignMap],
            'User' => ['alias' => 'user', 'map' => $this->userMap],
        ];

        foreach ($rows as $row) {
            $newUserId = $row->user_id ? ($this->userMap[$row->user_id] ?? null) : null;
            $subjectType = null;
            $subjectId = null;

            if ($row->model_type && isset($modelMap[$row->model_type])) {
                $subjectId = $modelMap[$row->model_type]['map'][$row->model_id] ?? null;
                $subjectType = $subjectId ? $modelMap[$row->model_type]['alias'] : null;
            }

            DB::table('activity_logs')->insert([
                'user_id' => $newUserId,
                'action' => $row->action,
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'description' => $row->description,
                'metadata' => $row->metadata ?? null,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
            $count++;
        }

        $this->record('activity_logs', $count);
    }

    private function findOrCreateContactByPhone(string $phone, ?string $name): int
    {
        $existing = DB::table('contacts')->where('phone', $phone)->first();
        if ($existing) {
            return $existing->id;
        }

        return DB::table('contacts')->insertGetId([
            'name' => $name ?: $phone,
            'phone' => $phone,
            'source' => 'campaign_import',
            'opt_in' => false,
            'opt_out' => false,
            'is_blacklisted' => false,
            'fail_count' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function legacyTableExists(string $table): bool
    {
        return DB::connection('legacy')->getSchemaBuilder()->hasTable($table);
    }
}
