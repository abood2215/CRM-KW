<?php

namespace App\Services\Whatsapp;

use App\Models\WhatsappNumber;
use App\Services\Whatsapp\Contracts\WhatsAppSenderInterface;

class WhatsAppSenderFactory
{
    public static function make(WhatsappNumber $number): WhatsAppSenderInterface
    {
        if ($number->isCloud()) {
            if (! $number->access_token || ! $number->phone_number_id) {
                throw new \RuntimeException("رقم واتساب \"{$number->name}\" لا يملك access_token أو phone_number_id.");
            }

            return new CloudApiWhatsAppSender($number->access_token, $number->phone_number_id);
        }

        if (! $number->session_name) {
            throw new \RuntimeException("رقم واتساب \"{$number->name}\" لا يملك session_name لجلسة Baileys.");
        }

        return new BaileysWhatsAppSender($number->session_name);
    }
}
