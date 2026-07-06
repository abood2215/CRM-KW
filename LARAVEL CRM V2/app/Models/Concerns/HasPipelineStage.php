<?php

namespace App\Models\Concerns;

use App\Enums\ContactPipelineStage;
use Illuminate\Database\Eloquent\Builder;

trait HasPipelineStage
{
    /** Contacts that are leads in the sales pipeline (as opposed to pure campaign contacts). */
    public function scopeInPipeline(Builder $query): Builder
    {
        return $query->whereNotNull('pipeline_stage');
    }

    public function scopeInPipelineStage(Builder $query, ContactPipelineStage|string $stage): Builder
    {
        $value = $stage instanceof ContactPipelineStage ? $stage->value : $stage;

        return $query->where('pipeline_stage', $value);
    }

    public function advanceStage(ContactPipelineStage $stage): void
    {
        $this->update(['pipeline_stage' => $stage->value]);
    }
}
