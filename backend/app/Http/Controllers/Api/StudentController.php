<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Services\StudentService;
use App\Http\Requests\Student\StoreStudentRequest;
use App\Http\Requests\Student\UpdateStudentRequest;
use App\Http\Resources\StudentResource;
use App\Http\Resources\StudentDetailResource;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function __construct(private StudentService $service) {}

    public function index(Request $request)
    {
        $academicYearId = $request->query('academic_year_id');
        
        $students = Student::where('academic_year_id', $academicYearId)
            ->when($request->query('status'), fn($q, $status) => $q->where('status', $status))
            ->orderBy('student_name')
            ->get();
            
        return StudentResource::collection($students);
    }

    public function store(StoreStudentRequest $request)
    {
        $student = $this->service->createStudent(
            $request->validated(), 
            $request->query('academic_year_id')
        );
        
        return new StudentResource($student);
    }

    public function show(Student $student)
    {
        $student->load(['paymentMonths', 'payments.paymentMonths']);
        
        // Cukup simpel untuk MVP
        $student->summary = [
            'total_kas_paid' => $student->paymentMonths->where('payment_type', \App\Enums\PaymentType::Cash)->sum('amount'),
            'total_saving_paid' => $student->paymentMonths->where('payment_type', \App\Enums\PaymentType::Saving)->sum('amount'),
        ];
        
        return new StudentDetailResource($student);
    }

    public function update(UpdateStudentRequest $request, Student $student)
    {
        $student = $this->service->updateStudent($student, $request->validated());
        return new StudentResource($student);
    }

    public function destroy(Student $student)
    {
        $this->service->deactivateStudent($student);
        return response()->json(['message' => 'Siswa berhasil dinonaktifkan']);
    }
}
