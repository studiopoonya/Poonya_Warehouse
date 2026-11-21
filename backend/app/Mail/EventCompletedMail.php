<?php

namespace App\Mail;

use App\Models\Event;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class EventCompletedMail extends Mailable
{
    public function __construct(public Event $event) {}

    public function envelope(): Envelope
    {
        $used = $this->event->items->sum(fn ($l) => $l->qty_used);

        return new Envelope(subject: "[Poonya] Event selesai: {$this->event->name} — ".number_format($used, 0, ',', '.').' unit terpakai');
    }

    public function content(): Content
    {
        $lines = $this->event->items->where('is_equipment', false)->sortByDesc(fn ($l) => $l->qty_used)->values();
        $tools = $this->event->items->where('is_equipment', true)->values();
        $price = fn ($l) => (int) ($l->item?->price ?? 0);

        return new Content(view: 'mail.event-completed', with: [
            'e' => $this->event,
            'lines' => $lines,
            'totals' => [
                'out' => $lines->sum('qty_out'),
                'returned' => $lines->sum('qty_returned'),
                'used' => $lines->sum(fn ($l) => $l->qty_used),
                'value' => $lines->sum(fn ($l) => $l->qty_used * $price($l)),
                'damaged' => $lines->sum('qty_damaged'),
                'damaged_value' => $lines->sum(fn ($l) => (int) $l->qty_damaged * $price($l)),
            ],
            'tools' => $tools,
            // peralatan yang bermasalah saja yang dirinci di email
            'toolIssues' => $tools->filter(fn ($l) => $l->qty_damaged || $l->qty_lost)->values(),
            'price' => $price,
            'url' => rtrim(config('app.frontend_url'), '/')."/events/{$this->event->id}",
        ]);
    }
}
