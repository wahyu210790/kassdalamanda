<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laporan Pemasukan Kas</title>
    <style>
        body { font-family: sans-serif; font-size: 14px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 5px 0 0 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; }
        .text-right { text-align: right; }
        .footer { margin-top: 30px; text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <h1>LAPORAN PEMASUKAN KAS KELAS</h1>
        <p>SD Kelas 1 Alamanda - Tahun Ajaran {{ $academicYear->name }}</p>
        @if($startDate && $endDate)
            <p>Periode: {{ date('d M Y', strtotime($startDate)) }} s/d {{ date('d M Y', strtotime($endDate)) }}</p>
        @endif
    </div>

    <table>
        <thead>
            <tr>
                <th width="5%">No</th>
                <th width="15%">Tanggal</th>
                <th width="30%">Nama Siswa</th>
                <th width="30%">Bulan Dibayar</th>
                <th width="20%" class="text-right">Nominal</th>
            </tr>
        </thead>
        <tbody>
            @php 
                $grandTotal = 0; 
                $months = [
                    1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April', 
                    5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus', 
                    9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
                ];
            @endphp
            @forelse($data as $index => $item)
                @php $grandTotal += $item->amount; @endphp
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ date('d/m/Y', strtotime($item->payment->payment_date)) }}</td>
                    <td>{{ $item->student->student_name ?? '-' }}</td>
                    <td>{{ $months[$item->month] ?? $item->month }} {{ $item->year }}</td>
                    <td class="text-right">Rp {{ number_format($item->amount, 0, ',', '.') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" style="text-align: center;">Tidak ada data pada periode ini</td>
                </tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr>
                <th colspan="4" class="text-right">Total Pemasukan Kas</th>
                <th class="text-right">Rp {{ number_format($grandTotal, 0, ',', '.') }}</th>
            </tr>
        </tfoot>
    </table>

    <div class="footer">
        <p>Dicetak pada: {{ date('d M Y H:i') }}</p>
    </div>
</body>
</html>
