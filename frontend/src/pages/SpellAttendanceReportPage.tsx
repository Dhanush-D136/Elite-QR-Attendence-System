import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  FileCheck,
  RefreshCw,
  Search,
  Award,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Users
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as xlsx from 'xlsx';
import { spellAttendanceService, SpellReportData, SpellStudentItem } from '../services/spellAttendanceService';

export const SpellAttendanceReportPage: React.FC = () => {
  // Date defaults: 1st of current month to today
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultTo = now.toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);
  const [department, setDepartment] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [section, setSection] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  const [reportData, setReportData] = useState<SpellReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await spellAttendanceService.getSpellAttendanceReport({
        from_date: fromDate,
        to_date: toDate,
        department,
        year,
        section,
        search
      });
      setReportData(data);
    } catch (err: any) {
      console.error('Failed to generate spell attendance report:', err);
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to fetch spell attendance data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport();
  };

  // Filter students by active category band if selected
  const filteredStudents = (reportData?.students || []).filter((st) => {
    if (selectedCategoryFilter === 'ALL') return true;
    return st.category === selectedCategoryFilter;
  });

  // Export Excel
  const handleExportExcel = () => {
    if (!reportData || reportData.students.length === 0) return;

    const exportRows = reportData.students.map((st) => ({
      'Register Number': st.roll_number,
      'Student Name': st.name,
      'Department': st.department,
      'Year': `Year ${st.year}`,
      'Section': st.section,
      'Total Working Days': st.working_days,
      'Present Days': st.present_days,
      'Absent Days': st.absent_days,
      'Spell Attendance %': `${st.spell_percentage}%`,
      'Category': st.category
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Spell Attendance');
    xlsx.writeFile(workbook, `Spell_Attendance_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!reportData || reportData.students.length === 0) return;

    const headers = ['Register Number', 'Student Name', 'Department', 'Year', 'Section', 'Working Days', 'Present Days', 'Absent Days', 'Spell Attendance %', 'Category'];
    const rows = [headers.join(',')];

    reportData.students.forEach((st) => {
      const line = [
        `"${st.roll_number}"`,
        `"${st.name.replace(/"/g, '""')}"`,
        `"${st.department}"`,
        `"Year ${st.year}"`,
        `"${st.section}"`,
        st.working_days,
        st.present_days,
        st.absent_days,
        `"${st.spell_percentage}%"`,
        `"${st.category}"`
      ];
      rows.push(line.join(','));
    });

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Spell_Attendance_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!reportData || reportData.students.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Header title
    doc.setFontSize(16);
    doc.setTextColor(17, 24, 39);
    doc.text('ELITE INSTITUTE OF TECHNOLOGY', 14, 15);

    doc.setFontSize(12);
    doc.setTextColor(109, 93, 252);
    doc.text('Official Spell Attendance Report (Date-Wise Calculation)', 14, 23);

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Period: ${fromDate} to ${toDate}  |  Total Working Days: ${reportData.workingDays} Days`, 14, 29);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 34);

    const tableData = reportData.students.map((st) => [
      st.roll_number,
      st.name,
      `${st.department} (${st.year}-${st.section})`,
      st.working_days.toString(),
      st.present_days.toString(),
      st.absent_days.toString(),
      `${st.spell_percentage}%`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Reg No', 'Student Name', 'Dept / Class', 'Working Days', 'Present Days', 'Absent Days', 'Spell %']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [109, 93, 252], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { top: 40 }
    });

    doc.save(`Spell_Attendance_Report_${fromDate}_to_${toDate}.pdf`);
  };

  const categories = reportData?.categories || {
    hundred: 0,
    ninetyFivePlus: 0,
    ninetyPlus: 0,
    eightyFivePlus: 0,
    seventyFivePlus: 0,
    belowSeventyFive: 0
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Title Header */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-display font-extrabold text-[#111827]">Spell Attendance System</h1>
            <p className="text-xs text-[#6B7280]">
              Date-wise attendance percentage calculation (1 Present Day if attended at least 1 period per day).
            </p>
          </div>
        </div>

        {/* Export Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            disabled={!reportData || reportData.students.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#ECFDF5] border border-[#10B981]/30 text-[#059669] text-xs font-bold hover:bg-[#D1FAE5] transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!reportData || reportData.students.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#EFF6FF] border border-[#3B82F6]/30 text-[#2563EB] text-xs font-bold hover:bg-[#DBEAFE] transition-all disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            CSV
          </button>

          <button
            onClick={handleExportPDF}
            disabled={!reportData || reportData.students.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F5F3FF] border border-[#8B5CF6]/30 text-[#7C3AED] text-xs font-bold hover:bg-[#EDE9FE] transition-all disabled:opacity-50"
          >
            <FileCheck className="w-4 h-4" />
            PDF Report
          </button>
        </div>
      </div>

      {/* Filter Control Form */}
      <form onSubmit={handleGenerate} className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#374151] mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7E7E7] focus:outline-none focus:border-[#6D5DFC]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#374151] mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7E7E7] focus:outline-none focus:border-[#6D5DFC]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#374151] mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7E7E7] focus:outline-none focus:border-[#6D5DFC]"
            >
              <option value="">All Departments</option>
              <option value="AI & DS">B.Tech AI & DS</option>
              <option value="CSE">B.E CSE</option>
              <option value="IT">B.Tech IT</option>
              <option value="ECE">B.E ECE</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#374151] mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7E7E7] focus:outline-none focus:border-[#6D5DFC]"
            >
              <option value="">All Years</option>
              <option value="1">I Year</option>
              <option value="2">II Year</option>
              <option value="3">III Year</option>
              <option value="4">IV Year</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#374151] mb-1">Section</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7E7E7] focus:outline-none focus:border-[#6D5DFC]"
            >
              <option value="">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#374151] mb-1">Search Student</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name / Reg No"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#E7E7E7] focus:outline-none focus:border-[#6D5DFC]"
              />
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-3" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-[#6B7280]">
            Working Days in Period: <strong className="text-[#111827] font-extrabold">{reportData ? reportData.workingDays : 0} Days</strong>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D5DFC] text-white text-xs font-bold hover:bg-[#5C4CE3] shadow-md transition-all disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
            Generate Spell Attendance
          </button>
        </div>
      </form>

      {/* Attendance Categories / Bands Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* ALL */}
        <button
          onClick={() => setSelectedCategoryFilter('ALL')}
          className={`p-3.5 rounded-[20px] border text-left transition-all ${
            selectedCategoryFilter === 'ALL'
              ? 'bg-[#111827] border-[#111827] text-white shadow-md'
              : 'bg-white border-[#E7E7E7] text-[#374151] hover:bg-[#FAFAFA]'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Total</span>
          <h4 className="text-xl font-extrabold mt-0.5">{reportData ? reportData.totalStudents : 0}</h4>
          <span className="text-[10px] font-semibold block mt-0.5">All Students</span>
        </button>

        {/* 100% */}
        <button
          onClick={() => setSelectedCategoryFilter('100%')}
          className={`p-3.5 rounded-[20px] border text-left transition-all ${
            selectedCategoryFilter === '100%'
              ? 'bg-[#059669] border-[#059669] text-white shadow-md'
              : 'bg-[#ECFDF5] border-[#10B981]/30 text-[#065F46] hover:bg-[#D1FAE5]'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">100%</span>
          <h4 className="text-xl font-extrabold mt-0.5">{categories.hundred}</h4>
          <span className="text-[10px] font-semibold block mt-0.5">Full Attendance</span>
        </button>

        {/* 95%+ */}
        <button
          onClick={() => setSelectedCategoryFilter('95% and Above')}
          className={`p-3.5 rounded-[20px] border text-left transition-all ${
            selectedCategoryFilter === '95% and Above'
              ? 'bg-[#16A34A] border-[#16A34A] text-white shadow-md'
              : 'bg-[#F0FDF4] border-[#22C55E]/30 text-[#15803D] hover:bg-[#DCFCE7]'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">95% & Above</span>
          <h4 className="text-xl font-extrabold mt-0.5">{categories.ninetyFivePlus}</h4>
          <span className="text-[10px] font-semibold block mt-0.5">Excellent</span>
        </button>

        {/* 90%+ */}
        <button
          onClick={() => setSelectedCategoryFilter('90% and Above')}
          className={`p-3.5 rounded-[20px] border text-left transition-all ${
            selectedCategoryFilter === '90% and Above'
              ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-md'
              : 'bg-[#EFF6FF] border-[#3B82F6]/30 text-[#1D4ED8] hover:bg-[#DBEAFE]'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">90% & Above</span>
          <h4 className="text-xl font-extrabold mt-0.5">{categories.ninetyPlus}</h4>
          <span className="text-[10px] font-semibold block mt-0.5">Very Good</span>
        </button>

        {/* 85%+ */}
        <button
          onClick={() => setSelectedCategoryFilter('85% and Above')}
          className={`p-3.5 rounded-[20px] border text-left transition-all ${
            selectedCategoryFilter === '85% and Above'
              ? 'bg-[#4F46E5] border-[#4F46E5] text-white shadow-md'
              : 'bg-[#EEF2FF] border-[#6366F1]/30 text-[#4338CA] hover:bg-[#E0E7FF]'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">85% & Above</span>
          <h4 className="text-xl font-extrabold mt-0.5">{categories.eightyFivePlus}</h4>
          <span className="text-[10px] font-semibold block mt-0.5">Good</span>
        </button>

        {/* 75%+ */}
        <button
          onClick={() => setSelectedCategoryFilter('75% and Above')}
          className={`p-3.5 rounded-[20px] border text-left transition-all ${
            selectedCategoryFilter === '75% and Above'
              ? 'bg-[#D97706] border-[#D97706] text-white shadow-md'
              : 'bg-[#FFFBEB] border-[#F59E0B]/30 text-[#B45309] hover:bg-[#FEF3C7]'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">75% & Above</span>
          <h4 className="text-xl font-extrabold mt-0.5">{categories.seventyFivePlus}</h4>
          <span className="text-[10px] font-semibold block mt-0.5">Eligible</span>
        </button>

        {/* Below 75% */}
        <button
          onClick={() => setSelectedCategoryFilter('Below 75%')}
          className={`p-3.5 rounded-[20px] border text-left transition-all ${
            selectedCategoryFilter === 'Below 75%'
              ? 'bg-[#DC2626] border-[#DC2626] text-white shadow-md'
              : 'bg-[#FEF2F2] border-[#EF4444]/30 text-[#991B1B] hover:bg-[#FEE2E2]'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">Below 75%</span>
          <h4 className="text-xl font-extrabold mt-0.5">{categories.belowSeventyFive}</h4>
          <span className="text-[10px] font-semibold block mt-0.5 text-red-600 font-bold">Shortage Warning</span>
        </button>
      </div>

      {/* Main Spell Attendance Table */}
      <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E7E7E7] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#111827]">
              Spell Attendance Report Records ({filteredStudents.length} Students)
            </h2>
            <p className="text-xs text-[#6B7280]">
              Showing date-wise calculated present days out of {reportData ? reportData.workingDays : 0} total working days.
            </p>
          </div>
          {selectedCategoryFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedCategoryFilter('ALL')}
              className="text-xs font-bold text-[#6D5DFC] hover:underline"
            >
              Clear Filter ({selectedCategoryFilter})
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#6B7280] space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#6D5DFC]" />
            <p className="text-xs font-semibold">Calculating date-wise spell attendance...</p>
          </div>
        ) : errorMessage ? (
          <div className="p-12 text-center text-[#EF4444] space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-xs font-bold">{errorMessage}</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-[#6B7280] space-y-2">
            <Users className="w-10 h-10 mx-auto text-[#D1D5DB]" />
            <p className="text-xs font-bold">No student attendance records matched the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#374151]">
              <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] uppercase font-bold text-[10px] text-[#6B7280] tracking-wider">
                <tr>
                  <th className="px-6 py-4">Reg No</th>
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Dept & Class</th>
                  <th className="px-6 py-4 text-center">Working Days</th>
                  <th className="px-6 py-4 text-center">Present Days</th>
                  <th className="px-6 py-4 text-center">Absent Days</th>
                  <th className="px-6 py-4 text-right">Spell Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {filteredStudents.map((st) => (
                  <tr key={st.student_id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[#111827]">{st.roll_number}</td>
                    <td className="px-6 py-4 font-bold text-[#111827]">{st.name}</td>
                    <td className="px-6 py-4 text-[#6B7280]">
                      {st.department} - Year {st.year} ({st.section})
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-[#374151]">
                      {st.working_days} Days
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-[#ECFDF5] text-[#059669] font-extrabold border border-[#10B981]/20">
                        {st.present_days} Present
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-[#FEF2F2] text-[#DC2626] font-extrabold border border-[#EF4444]/20">
                        {st.absent_days} Absent
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <span
                          className={`text-sm font-extrabold ${
                            st.spell_percentage >= 75 ? 'text-[#059669]' : 'text-[#DC2626]'
                          }`}
                        >
                          {st.spell_percentage.toFixed(2)}%
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            st.spell_percentage >= 90
                              ? 'bg-[#10B981]'
                              : st.spell_percentage >= 75
                              ? 'bg-[#F59E0B]'
                              : 'bg-[#EF4444]'
                          }`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpellAttendanceReportPage;
