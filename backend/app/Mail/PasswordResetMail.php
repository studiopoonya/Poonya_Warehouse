<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class PasswordResetMail extends Mailable
{
    public function __construct(public User $user, public string $url, public int $minutes) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: '[Poonya] Reset password akunmu');
    }

    public function content(): Content
    {
        return new Content(view: 'mail.password-reset', with: ['user' => $this->user, 'url' => $this->url, 'minutes' => $this->minutes]);
    }
}
