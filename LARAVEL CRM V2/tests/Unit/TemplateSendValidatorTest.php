<?php

namespace Tests\Unit;

use App\Models\WhatsappTemplate;
use App\Services\Whatsapp\TemplateSendValidator;
use PHPUnit\Framework\TestCase;

/**
 * Regression coverage for the 132012 incident (2026-07-21): Meta silently rejected sends
 * whose components didn't match the approved template shape — most often a missing header
 * component for an image/video/document-header template with no header_content uploaded yet.
 * These assert the validator catches every shape TemplateSendValidator::assertSendable is
 * meant to guard, using unsaved model instances so this needs no database at all.
 */
class TemplateSendValidatorTest extends TestCase
{
    private function template(array $attributes): WhatsappTemplate
    {
        return new WhatsappTemplate($attributes);
    }

    public function test_throws_when_media_header_template_has_no_header_url(): void
    {
        $template = $this->template(['name' => 'promo', 'header_type' => 'image', 'variables_count' => 0]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('يتطلب هيدر');

        TemplateSendValidator::assertSendable($template, null, []);
    }

    public function test_passes_when_media_header_template_has_a_header_url(): void
    {
        $template = $this->template(['name' => 'promo', 'header_type' => 'image', 'variables_count' => 0]);

        TemplateSendValidator::assertSendable($template, 'https://example.com/image.jpg', []);
        $this->assertTrue(true); // no exception thrown
    }

    public function test_passes_for_text_or_no_header_template_without_any_url(): void
    {
        $template = $this->template(['name' => 'plain', 'header_type' => 'none', 'variables_count' => 0]);

        TemplateSendValidator::assertSendable($template, null, []);
        $this->assertTrue(true);
    }

    public function test_throws_when_fewer_variables_are_supplied_than_the_template_requires(): void
    {
        $template = $this->template(['name' => 'greeting', 'header_type' => 'none', 'variables_count' => 3]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('يتطلب 3 متغيرات');

        TemplateSendValidator::assertSendable($template, null, ['فقط', 'اثنين']);
    }

    public function test_passes_when_variable_count_matches_exactly(): void
    {
        $template = $this->template(['name' => 'greeting', 'header_type' => 'none', 'variables_count' => 2]);

        TemplateSendValidator::assertSendable($template, null, ['أ', 'ب']);
        $this->assertTrue(true);
    }
}
