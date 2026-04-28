<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Conversation;
use App\Models\CrmClient;
use App\Models\CrmTask;
use App\Models\User;
use App\Models\WhatsappNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $totalClients = CrmClient::count();
        $newClientsToday = CrmClient::whereDate('created_at', today())->count();
        $newClientsThisWeek = CrmClient::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count();

        $pendingTasks = CrmTask::where('status', 'pending')->count();
        $overdueTasks = CrmTask::where('status', 'pending')
            ->whereDate('due_date', '<', today())
            ->count();

        $openConversations = Conversation::where('status', 'open')->count();
        $unreadMessages = Conversation::sum('unread_count');

        $clientsByStatus = CrmClient::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $clientsBySource = CrmClient::select('source', DB::raw('count(*) as count'))
            ->groupBy('source')
            ->pluck('count', 'source');

        $statusLabels = [
            'new' => 'جديد', 'contacted' => 'تم التواصل', 'interested' => 'مهتم',
            'booked' => 'محجوز', 'active' => 'نشط', 'following' => 'متابعة',
        ];

        $recentClients = CrmClient::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'status' => $c->status,
                'status_label' => $statusLabels[$c->status] ?? $c->status,
                'source' => $c->source,
                'created_at' => $c->created_at->toISOString(),
            ]);

        return response()->json([
            'total_clients' => $totalClients,
            'new_clients_today' => $newClientsToday,
            'new_clients_this_week' => $newClientsThisWeek,
            'pending_tasks' => $pendingTasks,
            'overdue_tasks' => $overdueTasks,
            'open_conversations' => $openConversations,
            'unread_messages' => $unreadMessages,
            'clients_by_status' => $clientsByStatus,
            'clients_by_source' => $clientsBySource,
            'recent_clients' => $recentClients,
        ]);
    }

    public function campaigns(): JsonResponse
    {
        $totalCampaigns = Campaign::count();
        $activeCampaigns = Campaign::where('status', 'running')->count();

        $totalSent = Campaign::sum('sent_count');
        $totalFailed = Campaign::sum('failed_count');
        $totalReplies = Campaign::sum('reply_count');

        $recentCampaigns = Campaign::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'status' => $c->status,
                'sent_count' => $c->sent_count,
                'total_recipients' => $c->total_recipients,
                'progress' => $c->progress_percentage,
            ]);

        return response()->json([
            'total_campaigns' => $totalCampaigns,
            'active_campaigns' => $activeCampaigns,
            'total_sent' => $totalSent,
            'total_failed' => $totalFailed,
            'total_replies' => $totalReplies,
            'recent_campaigns' => $recentCampaigns,
        ]);
    }

    public function agents(): JsonResponse
    {
        $agents = User::where('is_active', true)
            ->withCount([
                'clients',
                'tasks' => fn($q) => $q->where('status', 'pending'),
                'assignedConversations' => fn($q) => $q->where('status', 'open'),
            ])
            ->get()
            ->map(fn($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'role' => $u->role,
                'is_online' => $u->isOnline(),
                'clients_count' => $u->clients_count,
                'pending_tasks_count' => $u->tasks_count,
                'open_conversations_count' => $u->assigned_conversations_count,
            ]);

        return response()->json(['agents' => $agents]);
    }

    // إحصائيات WhatsApp
    public function whatsapp(): JsonResponse
    {
        $numbers = WhatsappNumber::all();

        $totalSentToday = $numbers->sum('sent_today');
        $activeNumbers  = $numbers->where('status', 'active')->count();
        $totalNumbers   = $numbers->count();

        // إحصائيات الحملات للأسبوع الحالي
        $weeklyCampaigns = Campaign::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
            ->selectRaw('count(*) as total, sum(sent_count) as total_sent, sum(failed_count) as total_failed, sum(reply_count) as total_replies')
            ->first();

        // أداء الحملات الشهرية (آخر 30 يوم)
        $monthlySent = Campaign::where('created_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(created_at) as date, sum(sent_count) as sent')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn($r) => ['date' => $r->date, 'sent' => (int) $r->sent]);

        return response()->json([
            'total_numbers'   => $totalNumbers,
            'active_numbers'  => $activeNumbers,
            'total_sent_today' => $totalSentToday,
            'weekly_campaigns' => [
                'total'         => (int) ($weeklyCampaigns->total ?? 0),
                'total_sent'    => (int) ($weeklyCampaigns->total_sent ?? 0),
                'total_failed'  => (int) ($weeklyCampaigns->total_failed ?? 0),
                'total_replies' => (int) ($weeklyCampaigns->total_replies ?? 0),
            ],
            'monthly_sent'    => $monthlySent,
            'numbers'         => $numbers->map(fn($n) => [
                'id'          => $n->id,
                'name'        => $n->name,
                'phone'       => $n->phone,
                'status'      => $n->status,
                'sent_today'  => $n->sent_today,
                'daily_limit' => $n->daily_limit,
                'week_number' => $n->week_number,
            ]),
        ]);
    }
}
