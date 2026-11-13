<?php

namespace App\Enums;

enum ExpenseSource: string
{
    case Cash = 'cash';
    case Saving = 'saving';
    case AdditionalIncome = 'additional_income';
}
