<?php

namespace App\Enums;

enum PaymentType: string
{
    case Cash = 'cash';
    case Saving = 'saving';
    case Both = 'both';
}
