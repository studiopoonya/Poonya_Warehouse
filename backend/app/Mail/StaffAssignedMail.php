<?php

namespace App\Mail;

use App\Models\Event;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Ke staff: kamu ditugaskan sebagai penanggung jawab event */
class StaffAssignedMail extends Mailable
{
    public function __construct(public Event $event) {}

    public function envelope(): Envelope
    {
        $date = $this->event->event_date->locale('id')->translatedFormat('d M');

        return new Envelope(subject: "[Poonya] Kamu ditugaskan: {$this->event->name} ({$date})");
    }

    public function content(): Content
    {
        return new Content(view: 'mail.staff-assigned', with: [
            'e' => $this->event,
            'url' => rtrim(config('app.frontend_url'), '/')."/events/new?event={$this->event->id}",
        ]);
    }
}
