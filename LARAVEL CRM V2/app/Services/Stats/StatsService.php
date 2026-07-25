<?php

namespace App\Services\Stats;

use App\Enums\ContactPipelineStage;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\SatisfactionSurvey;
use App\Models\Task;
use App\Models\User;
use App\Models\WhatsappNumber;
use Illuminate\Support\Facades\DB;

class StatsService
{
    private array $stageLabels = [
        'new' => 'جديد',
        'contacted' => 'تم التواصل',
        'interested' => 'مهتم',
        'booked' => 'محجوز',
        'active' => 'نشط',
        'following' => 'متابعة',
    ];

    public function dashboard(string $range): array
    {
        $days = match ($range) {
            'month' => 30,
            'year' => 365,
            default => 7,
        };

        $leads = Contact::inPipeline();
        $totalLeads = $leads->count();

        [$growth, $messagesByDay] = $range === 'year'
            ? $this->weeklyBuckets($days)
            : $this->dailyBuckets($days);

        $totalSent = Campaign::sum('sent_count');
        $totalReplies = Campaign::sum('reply_count');
        $bookedCount = Contact::inPipelineStage(ContactPipelineStage::Booked)->count();

        $totalTasksWeek = Task::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count();
        $doneTasksWeek = Task::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->where('status', 'completed')->count();
        $taskCompletion = $totalTasksWeek > 0 ? round(($doneTasksWeek / $totalTasksWeek) * 100) : 0;

        return [
            'range' => $range,
            'booking_rate' => $totalLeads > 0 ? round(($bookedCount / $totalLeads) * 100) : 0,
            'total_clients' => $totalLeads,
            'new_clients_today' => Contact::inPipeline()->whereDate('created_at', today())->count(),
            'new_clients_in_range' => Contact::inPipeline()->where('created_at', '>=', now()->subDays($days)->startOfDay())->count(),
            'pending_tasks' => Task::where('status', 'pending')->count(),
            'overdue_tasks' => Task::where('status', 'pending')->whereDate('due_date', '<', today())->count(),
            'open_conversations' => Conversation::where('status', 'open')->count(),
            'unread_messages' => (int) Conversation::sum('unread_count'),
            'clients_by_status' => Contact::inPipeline()->select('pipeline_stage', DB::raw('count(*) as count'))->groupBy('pipeline_stage')->pluck('count', 'pipeline_stage'),
            'clients_by_source' => Contact::inPipeline()->select('source', DB::raw('count(*) as count'))->groupBy('source')->pluck('count', 'source'),
            'recent_clients' => Contact::inPipeline()->with('user')->orderByDesc('created_at')->limit(5)->get()->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'status' => $c->pipeline_stage?->value,
                'status_label' => $this->stageLabels[$c->pipeline_stage?->value] ?? $c->pipeline_stage?->value,
                'source' => $c->source,
                'created_at' => $c->created_at->toISOString(),
            ]),
            'clients_growth' => $growth,
            'messages_by_day' => $messagesByDay,
            'active_campaigns' => Campaign::where('status', 'running')->count(),
            'reply_rate' => $totalSent > 0 ? round(($totalReplies / $totalSent) * 100) : 0,
            'task_completion' => $taskCompletion,
            'top_source' => Contact::inPipeline()->select('source', DB::raw('count(*) as count'))->groupBy('source')->orderByDesc('count')->value('source') ?? '—',
            'avg_response_minutes' => $this->averageResponseMinutes(),
        ];
    }

    public function campaigns(): array
    {
        $convertedStages = [ContactPipelineStage::Booked->value, ContactPipelineStage::Active->value];

        return [
            'total_campaigns' => Campaign::count(),
            'active_campaigns' => Campaign::where('status', 'running')->count(),
            'total_sent' => Campaign::sum('sent_count'),
            'total_failed' => Campaign::sum('failed_count'),
            'total_replies' => Campaign::sum('reply_count'),
            'recent_campaigns' => Campaign::with('user')->orderByDesc('created_at')->limit(5)->get()->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'status' => $c->status,
                'sent_count' => $c->sent_count,
                'total_recipients' => $c->total_recipients,
                'progress' => $c->progress_percentage,
                // How many recipients actually advanced in the pipeline — a real signal of
                // campaign value, versus reply_count which just means "they said something back".
                'converted_count' => CampaignRecipient::where('campaign_id', $c->id)
                    ->whereHas('contact', fn ($q) => $q->whereIn('pipeline_stage', $convertedStages))
                    ->count(),
            ]),
        ];
    }

    /**
     * "Profitability" here is honest about its limits: there is no real payments/invoicing
     * data anywhere in this system. `avg_expected_budget` is a manually-entered prospective
     * figure per contact, not collected revenue — reported as such, not as "profit".
     */
    public function sourceReport(): array
    {
        $convertedStages = [ContactPipelineStage::Booked->value, ContactPipelineStage::Active->value];

        $totalsBySource = Contact::select('source', DB::raw('count(*) as total'))
            ->groupBy('source')
            ->pluck('total', 'source');

        $convertedBySource = Contact::whereIn('pipeline_stage', $convertedStages)
            ->select('source', DB::raw('count(*) as converted'))
            ->groupBy('source')
            ->pluck('converted', 'source');

        $avgBudgetBySource = Contact::whereNotNull('budget')
            ->select('source', DB::raw('avg(budget) as avg_budget'))
            ->groupBy('source')
            ->pluck('avg_budget', 'source');

        $sources = $totalsBySource->map(function ($total, $source) use ($convertedBySource, $avgBudgetBySource) {
            $total = (int) $total;
            $converted = (int) ($convertedBySource[$source] ?? 0);

            return [
                'source' => $source ?: 'غير محدد',
                'total_contacts' => $total,
                'converted_count' => $converted,
                'conversion_rate' => $total > 0 ? round(($converted / $total) * 100, 1) : 0,
                'avg_expected_budget' => isset($avgBudgetBySource[$source]) ? round((float) $avgBudgetBySource[$source], 2) : null,
            ];
        })->sortByDesc('total_contacts')->values();

        return ['sources' => $sources];
    }

    public function agents(): array
    {
        $convertedStages = [ContactPipelineStage::Booked->value, ContactPipelineStage::Active->value];

        $agents = User::where('is_active', true)
            ->withCount([
                'contacts',
                'contacts as converted_contacts_count' => fn ($q) => $q->whereIn('pipeline_stage', $convertedStages),
                'tasks' => fn ($q) => $q->where('status', 'pending'),
                'assignedConversations' => fn ($q) => $q->where('status', 'open'),
            ])
            ->get();

        $avgResponseByAgent = $this->averageResponseMinutesByAgent();

        return $agents->map(fn ($u) => [
            'id' => $u->id,
            'name' => $u->name,
            'role' => $u->role->name,
            'is_online' => $u->isOnline(),
            'clients_count' => $u->contacts_count,
            'pending_tasks_count' => $u->tasks_count,
            'open_conversations_count' => $u->assigned_conversations_count,
            // Same "conversion" definition as campaigns()/sourceReport() — a contact that
            // actually advanced in the pipeline, not just replied to something.
            'conversion_rate' => $u->contacts_count > 0 ? round(($u->converted_contacts_count / $u->contacts_count) * 100, 1) : 0,
            'avg_response_minutes' => $avgResponseByAgent[$u->id] ?? null,
        ])->all();
    }

    public function whatsapp(): array
    {
        $numbers = WhatsappNumber::all();

        $weeklyCampaigns = Campaign::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
            ->selectRaw('count(*) as total, sum(sent_count) as total_sent, sum(failed_count) as total_failed, sum(reply_count) as total_replies')
            ->first();

        return [
            'total_numbers' => $numbers->count(),
            'active_numbers' => $numbers->where('status', 'connected')->count(),
            'total_sent_today' => $numbers->sum('sent_today'),
            'weekly_campaigns' => [
                'total' => (int) ($weeklyCampaigns->total ?? 0),
                'total_sent' => (int) ($weeklyCampaigns->total_sent ?? 0),
                'total_failed' => (int) ($weeklyCampaigns->total_failed ?? 0),
                'total_replies' => (int) ($weeklyCampaigns->total_replies ?? 0),
            ],
            'monthly_sent' => Campaign::where('created_at', '>=', now()->subDays(30))
                ->selectRaw('DATE(created_at) as date, sum(sent_count) as sent')
                ->groupBy('date')->orderBy('date')->get()
                ->map(fn ($r) => ['date' => $r->date, 'sent' => (int) $r->sent]),
            'numbers' => $numbers->map(fn ($n) => [
                'id' => $n->id,
                'name' => $n->name,
                'phone' => $n->phone,
                'status' => $n->status,
                'quality_rating' => $n->quality_rating,
                'sent_today' => $n->sent_today,
                'daily_limit' => $n->daily_limit,
                'week_number' => $n->week_number,
            ]),
        ];
    }

    public function satisfaction(): array
    {
        $responded = SatisfactionSurvey::whereNotNull('rating');

        return [
            'sent_count' => SatisfactionSurvey::whereNotNull('sent_at')->count(),
            'response_count' => (clone $responded)->count(),
            'average_rating' => round((float) (clone $responded)->avg('rating'), 1) ?: null,
            'rating_breakdown' => (clone $responded)->select('rating', DB::raw('count(*) as count'))
                ->groupBy('rating')->orderBy('rating')->pluck('count', 'rating'),
            'recent' => SatisfactionSurvey::whereNotNull('rating')
                ->with('contact')
                ->orderByDesc('responded_at')
                ->limit(10)
                ->get()
                ->map(fn (SatisfactionSurvey $s) => [
                    'id' => $s->id,
                    'contact_name' => $s->contact?->name,
                    'rating' => $s->rating,
                    'comment' => $s->comment,
                    'responded_at' => $s->responded_at?->toISOString(),
                ]),
        ];
    }

    /** @return array{0: \Illuminate\Support\Collection, 1: \Illuminate\Support\Collection} */
    private function dailyBuckets(int $days): array
    {
        $daysBack = $days - 1;
        $daysList = collect(range($daysBack, 0))->map(fn ($i) => now()->subDays($i)->format('Y-m-d'));

        $leadsRaw = Contact::inPipeline()
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subDays($daysBack)->startOfDay())
            ->groupBy('date')->pluck('count', 'date');

        $growth = $daysList->map(fn ($d) => [
            'date' => $d,
            'name' => \Carbon\Carbon::parse($d)->locale('ar')->isoFormat('ddd'),
            'count' => (int) ($leadsRaw[$d] ?? 0),
        ])->values();

        $msgRaw = Message::select(DB::raw('DATE(created_at) as date'), 'direction', DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subDays($daysBack)->startOfDay())
            ->groupBy('date', 'direction')->get();

        $messagesByDay = $daysList->map(function ($d) use ($msgRaw) {
            $in = $msgRaw->first(fn ($r) => $r->date === $d && $r->direction === 'in');
            $out = $msgRaw->first(fn ($r) => $r->date === $d && $r->direction === 'out');

            return ['date' => $d, 'name' => \Carbon\Carbon::parse($d)->locale('ar')->isoFormat('ddd'), 'incoming' => (int) ($in->count ?? 0), 'outgoing' => (int) ($out->count ?? 0)];
        })->values();

        return [$growth, $messagesByDay];
    }

    private function weeklyBuckets(int $days): array
    {
        $weeks = collect(range(51, 0))->map(fn ($i) => now()->startOfWeek()->subWeeks($i));

        $leadsRaw = Contact::inPipeline()
            ->select(DB::raw("DATE_FORMAT(created_at, '%Y-%u') as week_key"), DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subDays($days)->startOfDay())
            ->groupBy('week_key')->pluck('count', 'week_key');

        $growth = $weeks->map(function ($weekStart) use ($leadsRaw) {
            $dbKey = $weekStart->format('Y').'-'.$weekStart->format('W');

            return ['date' => $weekStart->format('Y-m-d'), 'name' => $weekStart->locale('ar')->isoFormat('D MMM'), 'count' => (int) ($leadsRaw[$dbKey] ?? 0)];
        })->values();

        $msgRaw = Message::select(DB::raw("DATE_FORMAT(created_at, '%Y-%u') as week_key"), 'direction', DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subDays($days)->startOfDay())
            ->groupBy('week_key', 'direction')->get();

        $messagesByDay = $weeks->map(function ($weekStart) use ($msgRaw) {
            $dbKey = $weekStart->format('Y').'-'.$weekStart->format('W');
            $in = $msgRaw->first(fn ($r) => $r->week_key === $dbKey && $r->direction === 'in');
            $out = $msgRaw->first(fn ($r) => $r->week_key === $dbKey && $r->direction === 'out');

            return ['date' => $weekStart->format('Y-m-d'), 'name' => $weekStart->locale('ar')->isoFormat('D MMM'), 'incoming' => (int) ($in->count ?? 0), 'outgoing' => (int) ($out->count ?? 0)];
        })->values();

        return [$growth, $messagesByDay];
    }

    /**
     * Diffs are computed in PHP rather than SQL's TIMESTAMPDIFF — that function is MySQL-only,
     * which silently made this whole calculation unrunnable (and untestable) against SQLite.
     */
    private function averageResponseMinutes(): ?int
    {
        $rows = $this->responseTimeRows();

        if ($rows->isEmpty()) {
            return null;
        }

        return (int) round($this->totalMinutes($rows) / $rows->count());
    }

    /**
     * Same "first outbound reply after an inbound message" definition as averageResponseMinutes(),
     * but attributed per agent via messages.user_id — automated campaign sends have no user_id
     * and are correctly excluded, since they're not a human agent's response time.
     *
     * @return array<int, int> agent user_id => average minutes
     */
    private function averageResponseMinutesByAgent(): array
    {
        return $this->responseTimeRows(perAgent: true)
            ->groupBy('user_id')
            ->mapWithKeys(fn ($group, $userId) => [(int) $userId => (int) round($this->totalMinutes($group) / $group->count())])
            ->all();
    }

    /** @return \Illuminate\Support\Collection<int, object{inbound_at: string, outbound_at: string}> */
    private function responseTimeRows(bool $perAgent = false): \Illuminate\Support\Collection
    {
        return DB::table('messages as m1')
            ->join('messages as m2', function ($j) use ($perAgent) {
                $j->on('m1.conversation_id', '=', 'm2.conversation_id')
                    ->where('m1.direction', '=', 'in')
                    ->where('m2.direction', '=', 'out')
                    ->whereColumn('m2.created_at', '>', 'm1.created_at');

                if ($perAgent) {
                    $j->whereNotNull('m2.user_id');
                }
            })
            ->where('m1.created_at', '>=', now()->subDays(7))
            ->select('m2.user_id', 'm1.created_at as inbound_at', 'm2.created_at as outbound_at')
            ->get();
    }

    private function totalMinutes(\Illuminate\Support\Collection $rows): int
    {
        return $rows->sum(fn ($row) => \Carbon\Carbon::parse($row->inbound_at)->diffInMinutes(\Carbon\Carbon::parse($row->outbound_at)));
    }
}
