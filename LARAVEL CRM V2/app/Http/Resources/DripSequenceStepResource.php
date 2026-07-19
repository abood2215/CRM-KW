<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DripSequenceStepResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'step_order' => $this->step_order,
            'delay_days' => $this->delay_days,
            'template_name' => $this->template_name,
            'template_language' => $this->template_language,
            'template_variables' => $this->template_variables,
        ];
    }
}
