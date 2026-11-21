<?php

namespace App\Mail;

use App\Models\Event;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Pengingat H-1: ke staff penanggung jawab, atau ke owner kalau event belum ditugaskan */
class EventReminderMail extends Mailable
{
    public function __construct(public Event $event, public bool $unassigned = false) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->unassigned
            ? "[Poonya] Besok: {$this->event->name} belum ada penanggung jawab"
            : "[Poonya] Pengingat: besok event {$this->event->name}");
    }

    public function content(): Content
    {
        $base = rtrim(config('app.frontend_url'), '/');

        return new Content(view: 'mail.event-reminder', with: [
            'e' => $this->event,
            'unassigned' => $this->unassigned,
            'url' => $this->unassigned ? "{$base}/events/{$this->event->id}" : "{$base}/events/new?event={$this->event->id}",
        ]);
    }
}
