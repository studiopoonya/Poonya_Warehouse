<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\EventItem;
use App\Models\Item;
use App\Models\Venue;
use App\Services\EventService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Logistik event photobooth.
 * Staff: buat event & lapor sisa untuk event miliknya. Owner: lihat semua, koreksi, batalkan.
 */
class EventController extends Controller
{
    public function __construct(private EventService $events) {}

    /** GET /api/events?status=ongoing|completed|cancelled&search= */
    public function index(Request $request)
    {
        $user = $request->user();
        // staff: event miliknya + event terjadwal yang belum ditugaskan (bisa diambil)
        $base = fn () => Event::query()->when(! $user->isOwner(), fn ($q) => $q->where(fn ($w) => $w
            ->where('user_id', $user->id)
            ->orWhere(fn ($u) => $u->whereNull('user_id')->where('status', Event::SCHEDULED))));
        // angka ringkasan hanya event milik sendiri (untuk staff)
        $mine = fn () => Event::query()->when(! $user->isOwner(), fn ($q) => $q->where('user_id', $user->id));

        $events = $base()
            // daftar: rincian barang tidak dimuat; angka ringkasan dihitung di database (statsFor)
            ->with(['user', 'creator', 'sourceVenue', 'returnedBy'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->input('search').'%';
                $q->where(fn ($w) => $w->where('name', 'like', $term)->orWhere('location', 'like', $term)->orWhere('code', 'like', $term));
            })
            // kalender: ?from=2026-11-01&to=2026-11-30
            ->when($request->filled('from'), fn ($q) => $q->whereDate('event_date', '>=', $request->input('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('event_date', '<=', $request->input('to')))
            ->orderByRaw("CASE status WHEN 'ongoing' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END")
            // terjadwal: yang paling dekat dulu; lainnya: terbaru dulu
            ->orderByRaw("CASE WHEN status = 'scheduled' THEN event_date END ASC")
            ->orderByDesc('event_date')
            ->orderByDesc('id')
            ->limit(200)
            ->get();

        $monthStart = now()->startOfMonth();
        $completedThisMonth = $mine()->where('status', Event::COMPLETED)->where('returned_at', '>=', $monthStart)->pluck('id');

        $request->attributes->set('event_lines', false);
        $request->attributes->set('event_stats', EventResource::statsFor($events->modelKeys()));

        return EventResource::collection($events)->additional(['meta' => [
            'ongoing' => $mine()->where('status', Event::ONGOING)->count(),
            'scheduled' => $mine()->where('status', Event::SCHEDULED)->count(),
            'unassigned' => Event::where('status', Event::SCHEDULED)->whereNull('user_id')->count(),
            'this_month' => $mine()->where('event_date', '>=', $monthStart->toDateString())->where('status', '!=', Event::CANCELLED)->count(),
            'completed_this_month' => $completedThisMonth->count(),
            ...$this->usedThisMonth($completedThisMonth->all()),
        ]]);
    }

    /** GET /api/events/available-items — barang + stok gudang, untuk langkah 2 */
    public function availableItems(Request $request)
    {
        // ?venue_id= gudang yang dipilih (default gudang utama)
        $source = EventService::sourceVenue($request->integer('venue_id') ?: null);

        $inUse = EventService::equipmentInUse($source->id);

        $items = Item::active()->with(['category', 'stocks' => fn ($q) => $q->where('venue_id', $source->id)])
            ->orderBy('name')
            ->get()
            ->map(function ($i) use ($inUse) {
                $stock = $i->stocks->first();
                $equipment = $i->isEquipment();

                return [
                    'id' => $i->id,
                    'name' => $i->name,
                    'sku' => $i->sku,
                    'unit' => $i->unit,
                    'kind' => $i->kind,
                    'kit_qty' => $equipment ? $i->kit_qty : null,
                    'category' => $i->category?->name,
                    // peralatan: dikurangi yang sedang dibawa ke event lain
                    'available' => max(0, (int) ($stock?->quantity ?? 0) - ($equipment ? ($inUse[$i->id] ?? 0) : 0)),
                    'in_use' => $equipment ? ($inUse[$i->id] ?? 0) : 0,
                    'condition' => $equipment ? ($stock?->condition ?? 'baik') : null,
                ];
            });

        return [
            'data' => $items,
            'source_venue' => ['id' => $source->id, 'name' => $source->name],
            // semua gudang, untuk pilihan "Ambil dari gudang"
            'warehouses' => Venue::where('type', 'warehouse')->orderBy('sort_order')->orderBy('id')->get(['id', 'name', 'slug', 'color'])
                ->map(fn ($v, $i) => $v->only(['id', 'name', 'slug', 'color']) + ['is_main' => $i === 0]),
        ];
    }

    /** POST /api/events — langkah 1 (info) + langkah 2 (barang dibawa) */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'location' => ['nullable', 'string', 'max:150'],
            'event_date' => ['required', 'date'],
            'crew' => ['nullable', 'string', 'max:200'],
            'note' => ['nullable', 'string', 'max:1000'],
            'source_venue_id' => ['nullable', 'integer'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'distinct', 'exists:items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.checked' => ['nullable', 'boolean'],
        ], [
            'name.required' => 'Nama event wajib diisi.',
            'event_date.required' => 'Tanggal event wajib diisi.',
            'items.required' => 'Pilih minimal satu barang yang dibawa.',
            'items.min' => 'Pilih minimal satu barang yang dibawa.',
            'items.*.quantity.min' => 'Jumlah barang minimal 1.',
            'items.*.item_id.distinct' => 'Ada barang yang dipilih dua kali.',
        ]);

        $event = $this->events->depart(
            $request->user(),
            collect($data)->only(['name', 'location', 'event_date', 'crew', 'note'])->all(),
            $data['items'],
            $data['source_venue_id'] ?? null,
        );

        return (new EventResource($this->loaded($event)))->response()->setStatusCode(201);
    }

    public function show(Request $request, Event $event)
    {
        abort_unless($event->canBeViewedBy($request->user()), 403, 'Ini bukan event kamu.');

        return new EventResource($this->loaded($event));
    }

    /** PUT /api/events/{event}/return — langkah 3: { items: [{item_id, qty_returned}] } */
    public function report(Request $request, Event $event)
    {
        $user = $request->user();
        abort_unless($event->canBeManagedBy($user), 403, 'Ini bukan event kamu.');
        abort_if(
            $event->status === Event::COMPLETED && ! $user->isOwner(),
            403,
            'Sisa barang sudah dilaporkan. Minta owner kalau perlu koreksi.'
        );

        $data = $request->validate([
            'items' => ['required', 'array'],
            'items.*.item_id' => ['required', 'integer'],
            'items.*.qty_returned' => ['required', 'integer', 'min:0'],
            'items.*.qty_damaged' => ['nullable', 'integer', 'min:0'],
            'report_note' => ['nullable', 'string', 'max:1000'],
        ], [
            'items.*.qty_returned.required' => 'Semua sisa barang wajib diisi.',
            'items.*.qty_returned.min' => 'Sisa barang tidak boleh minus.',
        ]);

        $returned = collect($data['items'])->pluck('qty_returned', 'item_id')->all();
        $damaged = collect($data['items'])->mapWithKeys(fn ($l) => [$l['item_id'] => (int) ($l['qty_damaged'] ?? 0)])->all();
        $event = $this->events->report($event, $returned, $user, $damaged, $request->has('report_note') ? (string) $request->input('report_note') : null);

        return new EventResource($this->loaded($event));
    }

    /** POST /api/events/schedule — owner menjadwalkan event { name, location, event_date, crew, note, user_id|null } */
    public function schedule(Request $request)
    {
        [$info, $assignee, $source] = $this->scheduleData($request);
        $event = $this->events->schedule($request->user(), $info, $assignee, $source);

        return (new EventResource($this->loaded($event)))->response()->setStatusCode(201);
    }

    /** PUT /api/events/{event} — owner ubah jadwal / penanggung jawab (selama belum berangkat) */
    public function updateSchedule(Request $request, Event $event)
    {
        [$info, $assignee, $source] = $this->scheduleData($request);

        return new EventResource($this->loaded($this->events->updateSchedule($event, $info, $assignee, $source)));
    }

    /** POST /api/events/{event}/claim — staff mengambil event yang belum ditugaskan */
    public function claim(Request $request, Event $event)
    {
        abort_unless($event->status === Event::SCHEDULED, 422, 'Event ini sudah berangkat atau dibatalkan.');

        return new EventResource($this->loaded($this->events->claim($event, $request->user())));
    }

    /** POST /api/events/{event}/depart { items } — catat barang dibawa untuk event terjadwal */
    public function depart(Request $request, Event $event)
    {
        $user = $request->user();
        abort_unless($event->canBeManagedBy($user), 403, $event->user_id ? 'Event ini ditugaskan ke staff lain.' : 'Ambil event ini dulu.');

        $data = $request->validate([
            'source_venue_id' => ['nullable', 'integer'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'distinct', 'exists:items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.checked' => ['nullable', 'boolean'],
        ], [
            'items.required' => 'Pilih minimal satu barang yang dibawa.',
            'items.min' => 'Pilih minimal satu barang yang dibawa.',
            'items.*.quantity.min' => 'Jumlah barang minimal 1.',
        ]);

        return new EventResource($this->loaded($this->events->departScheduled($event, $user, $data['items'], $data['source_venue_id'] ?? null)));
    }

    /** POST /api/events/{event}/cancel — khusus owner (lihat routes) */
    public function cancel(Event $event)
    {
        return new EventResource($this->loaded($this->events->cancel($event)));
    }

    /** Unit & nilai barang habis pakai yang terpakai, dihitung langsung di database */
    private function usedThisMonth(array $eventIds): array
    {
        if (! $eventIds) {
            return ['used_this_month' => 0, 'used_value_this_month' => 0];
        }
        $row = EventItem::query()
            ->join('items', 'items.id', '=', 'event_items.item_id')
            ->whereIn('event_items.event_id', $eventIds)
            ->where('event_items.is_equipment', false)
            ->whereNotNull('event_items.qty_returned')
            ->selectRaw('SUM(qty_out - qty_returned - COALESCE(qty_damaged, 0)) as used, SUM((qty_out - qty_returned - COALESCE(qty_damaged, 0)) * items.price) as value')
            ->first();

        return ['used_this_month' => (int) $row->used, 'used_value_this_month' => (int) $row->value];
    }

    private function loaded(Event $event): Event
    {
        return $event->fresh(['items.item.category', 'user', 'creator', 'sourceVenue', 'returnedBy']);
    }

    /** @return array{0: array, 1: int|null} */
    private function scheduleData(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'location' => ['nullable', 'string', 'max:150'],
            'event_date' => ['required', 'date'],
            'crew' => ['nullable', 'string', 'max:200'],
            'note' => ['nullable', 'string', 'max:1000'],
            'user_id' => ['nullable', Rule::exists('users', 'id')->where('role', 'staff')->where('is_active', true)],
            'source_venue_id' => ['nullable', Rule::exists('venues', 'id')->where('type', 'warehouse')],
        ], [
            'name.required' => 'Nama event wajib diisi.',
            'event_date.required' => 'Tanggal event wajib diisi.',
            'user_id.exists' => 'Pilih staff aktif sebagai penanggung jawab.',
            'source_venue_id.exists' => 'Asal barang harus berupa gudang.',
        ]);

        return [collect($data)->only(['name', 'location', 'event_date', 'crew', 'note'])->all(), $data['user_id'] ?? null, $data['source_venue_id'] ?? null];
    }
}
