<?php

namespace App\Mail;

use App\Models\StockOpname;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class StockOpnameMail extends Mailable
{
    public function __construct(public StockOpname $opname) {}

    public function envelope(): Envelope
    {
        $diff = $this->opname->items->where('difference', '!=', 0)->count();

        return new Envelope(subject: "[Poonya] Stock opname {$this->opname->venue->name} — ".($diff ? "{$diff} barang selisih" : 'semua sesuai'));
    }

    public function content(): Content
    {
        $lines = $this->opname->items;
        $price = fn ($l) => (int) ($l->item?->price ?? 0);

        return new Content(view: 'mail.stock-opname', with: [
            'o' => $this->opname,
            'diffs' => $lines->where('difference', '!=', 0)->sortBy('difference')->values(),
            'totals' => [
                'counted' => $lines->count(),
                'matched' => $lines->where('difference', 0)->count(),
                'mismatched' => $lines->where('difference', '!=', 0)->count(),
                'plus' => $lines->where('difference', '>', 0)->sum('difference'),
                'minus' => $lines->where('difference', '<', 0)->sum('difference'),
                'value' => $lines->sum(fn ($l) => $l->difference * $price($l)),
            ],
            'price' => $price,
            'url' => rtrim(config('app.frontend_url'), '/')."/opname/{$this->opname->id}",
        ]);
    }
}
