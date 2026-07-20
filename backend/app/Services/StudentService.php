<?php

namespace App\Services;

use App\Models\Student;
use App\Enums\StudentStatus;

class StudentService
{
    public function createStudent(array $data, int $academicYearId): Student
    {
        return Student::create([
            'academic_year_id' => $academicYearId,
            'student_name' => $data['student_name'],
            'parent_name' => $data['parent_name'],
            'phone' => $data['phone'] ?? null,
            'status' => StudentStatus::Active,
        ]);
    }

    public function updateStudent(Student $student, array $data): Student
    {
        $student->update([
            'student_name' => $data['student_name'],
            'parent_name' => $data['parent_name'],
            'phone' => $data['phone'] ?? null,
            'status' => $data['status'] ?? $student->status,
        ]);

        return $student;
    }

    public function deactivateStudent(Student $student): Student
    {
        $student->update(['status' => StudentStatus::Inactive]);
        $student->delete(); // Soft delete
        return $student;
    }
}
