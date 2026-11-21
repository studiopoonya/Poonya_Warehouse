<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class TestMail extends Mailable
{
    public function __construct(public string $sender) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: '[Poonya] Tes notifikasi email');
    }

    public function content(): Content
    {
        return new Content(view: 'mail.test', with: ['sender' => $this->sender, 'url' => config('app.frontend_url')]);
    }
}
