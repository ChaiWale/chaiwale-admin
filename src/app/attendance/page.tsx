'use client';

import React, { useState, useEffect } from 'react';
import { fetchAttendanceRoster, saveAttendanceRecords, getAttendanceExcelUrl, AttendanceRecordDto } from '../../services/admin-api.client';

type AttendanceCode = 'P' | 'A' | 'L' | 'HD' | '';

interface StaffRow {
  name: string;
  days: Record<number, AttendanceCode>;
}

const DEFAULT_STAFF = [
  'Ramesh Sharma (Head Chef)',
  'Suresh Patel (Chai Specialist)',
  'Amit Verma (Kitchen Ops)',
  'Priya Nair (Counter / Billing)',
  'Deepa Roy (Service / Packing)',
  'Vikas Singh (Logistics & Delivery)'
];

export default function AdminAttendancePage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [staffList, setStaffList] = useState<string[]>(DEFAULT_STAFF);
  const [gridData, setGridData] = useState<Record<string, Record<number, AttendanceCode>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Number of days in the selected month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const loadRoster = async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await fetchAttendanceRoster(selectedMonth, selectedYear);
      // Map records to grid: { [staffName]: { [day]: status } }
      const newGrid: Record<string, Record<number, AttendanceCode>> = {};
      const foundStaff = new Set<string>(DEFAULT_STAFF);

      records.forEach((rec: any) => {
        const staff = rec.staff_name;
        foundStaff.add(staff);
        const dayNum = new Date(rec.date).getDate();
        if (!newGrid[staff]) newGrid[staff] = {};
        newGrid[staff][dayNum] = rec.status as AttendanceCode;
      });

      setStaffList(Array.from(foundStaff));
      setGridData(newGrid);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, [selectedMonth, selectedYear]);

  const cycleStatus = (staff: string, day: number) => {
    const current = gridData[staff]?.[day] || '';
    let next: AttendanceCode = '';
    if (current === '') next = 'P';
    else if (current === 'P') next = 'A';
    else if (current === 'A') next = 'L';
    else if (current === 'L') next = 'HD';
    else next = '';

    setGridData(prev => ({
      ...prev,
      [staff]: {
        ...(prev[staff] || {}),
        [day]: next
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    setError(null);
    try {
      const recordsToSave: AttendanceRecordDto[] = [];
      const monthStr = String(selectedMonth).padStart(2, '0');

      Object.entries(gridData).forEach(([staffName, dayMap]) => {
        Object.entries(dayMap).forEach(([dayStr, status]) => {
          if (status) {
            const dayFormatted = String(dayStr).padStart(2, '0');
            recordsToSave.push({
              staffName,
              date: `${selectedYear}-${monthStr}-${dayFormatted}`,
              status: status as 'P' | 'A' | 'L' | 'HD'
            });
          }
        });
      });

      if (recordsToSave.length === 0) {
        setFeedback('No attendance entries to save.');
        return;
      }

      await saveAttendanceRecords(recordsToSave);
      setFeedback(`✓ Successfully saved ${recordsToSave.length} attendance records to Supabase!`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const header = ['Staff Member', ...days.map(d => `Day ${d}`), 'P', 'A', 'L', 'HD'].join(',');
    const rows = staffList.map(staff => {
      const counts = getCounts(staff);
      const rowDays = days.map(d => gridData[staff]?.[d] || '');
      return [`"${staff}"`, ...rowDays, counts.P, counts.A, counts.L, counts.HD].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Chaiwale_Attendance_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCounts = (staff: string) => {
    const staffDays = gridData[staff] || {};
    let P = 0,
      A = 0,
      L = 0,
      HD = 0;
    Object.values(staffDays).forEach(code => {
      if (code === 'P') P++;
      else if (code === 'A') A++;
      else if (code === 'L') L++;
      else if (code === 'HD') HD++;
    });
    return { P, A, L, HD };
  };

  const getCodeStyle = (code: AttendanceCode) => {
    switch (code) {
      case 'P':
        return { backgroundColor: '#DCFCE7', color: '#166534', fontWeight: 700 };
      case 'A':
        return { backgroundColor: '#FEE2E2', color: '#991B1B', fontWeight: 700 };
      case 'L':
        return { backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 700 };
      case 'HD':
        return { backgroundColor: '#E0E7FF', color: '#3730A3', fontWeight: 700 };
      default:
        return { backgroundColor: '#FFFFFF', color: '#CBD5E1' };
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1E2328' }}>Staff Monthly Attendance</h1>
          <p style={{ color: 'var(--cw-color-text-muted)', fontSize: '13px', marginTop: '2px' }}>
            Excel-style operational register backed by Supabase • Month: <strong>{monthNames[selectedMonth - 1]} {selectedYear}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--cw-radius-md)',
              border: '1px solid var(--cw-color-border)',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF'
            }}
          >
            {monthNames.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--cw-radius-md)',
              border: '1px solid var(--cw-color-border)',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF'
            }}
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Export Excel */}
          <a
            href={getAttendanceExcelUrl(selectedMonth, selectedYear)}
            download
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--cw-radius-md)',
              backgroundColor: '#16A34A',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📊 Excel Matrix
          </a>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--cw-radius-md)',
              border: '1px solid var(--cw-color-border)',
              backgroundColor: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📥 Export CSV
          </button>

          {/* Save Grid */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--cw-radius-md)',
              border: 'none',
              backgroundColor: 'var(--cw-color-primary)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : '💾 Save Grid'}
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{ padding: '12px 16px', backgroundColor: '#DCFCE7', color: '#16A34A', borderRadius: 'var(--cw-radius-md)', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>
          {feedback}
        </div>
      )}

      {error && (
        <div style={{ padding: '14px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--cw-radius-md)', marginBottom: '20px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Legend & Instructions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          padding: '12px 16px',
          borderRadius: 'var(--cw-radius-md)',
          border: '1px solid var(--cw-color-border)',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', gap: '8px', fontSize: '12px', fontWeight: 700 }}>
          <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '3px 8px', borderRadius: '4px' }}>P = Present</span>
          <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '3px 8px', borderRadius: '4px' }}>A = Absent</span>
          <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '3px 8px', borderRadius: '4px' }}>L = Leave</span>
          <span style={{ backgroundColor: '#E0E7FF', color: '#3730A3', padding: '3px 8px', borderRadius: '4px' }}>HD = Half Day</span>
        </div>
        <p style={{ fontSize: '12px', color: '#64748B' }}>
          💡 Click any cell to cycle status (Present → Absent → Leave → Half Day → Clear)
        </p>
      </div>

      {/* Excel Monthly Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--cw-radius-md)',
          border: '1px solid var(--cw-color-border)',
          overflowX: 'auto',
          boxShadow: 'var(--cw-shadow-sm)'
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontSize: '15px', fontWeight: 600 }}>Loading roster from Supabase...</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }}>
            <thead>
              <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid var(--cw-color-border)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: '180px', fontWeight: 700, borderRight: '1px solid var(--cw-color-border)' }}>
                  Staff Member
                </th>
                {days.map(d => (
                  <th key={d} style={{ padding: '8px 2px', minWidth: '32px', fontWeight: 600, borderRight: '1px solid #E2E8F0' }}>
                    {d}
                  </th>
                ))}
                <th style={{ padding: '8px', minWidth: '38px', backgroundColor: '#DCFCE7', color: '#166534', fontWeight: 700 }}>P</th>
                <th style={{ padding: '8px', minWidth: '38px', backgroundColor: '#FEE2E2', color: '#991B1B', fontWeight: 700 }}>A</th>
                <th style={{ padding: '8px', minWidth: '38px', backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 700 }}>L</th>
                <th style={{ padding: '8px', minWidth: '38px', backgroundColor: '#E0E7FF', color: '#3730A3', fontWeight: 700 }}>HD</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map(staff => {
                const counts = getCounts(staff);

                return (
                  <tr key={staff} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td
                      style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#1E2328',
                        borderRight: '1px solid var(--cw-color-border)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {staff}
                    </td>

                    {days.map(d => {
                      const code = gridData[staff]?.[d] || '';
                      const style = getCodeStyle(code);

                      return (
                        <td
                          key={d}
                          onClick={() => cycleStatus(staff, d)}
                          style={{
                            padding: '6px 2px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            borderRight: '1px solid #E2E8F0',
                            ...style
                          }}
                          title={`Day ${d}: ${code || 'Empty'} (Click to cycle)`}
                        >
                          {code || '·'}
                        </td>
                      );
                    })}

                    <td style={{ padding: '8px', backgroundColor: '#F0FDF4', color: '#166534', fontWeight: 800 }}>
                      {counts.P}
                    </td>
                    <td style={{ padding: '8px', backgroundColor: '#FEF2F2', color: '#991B1B', fontWeight: 800 }}>
                      {counts.A}
                    </td>
                    <td style={{ padding: '8px', backgroundColor: '#FFFBEB', color: '#92400E', fontWeight: 800 }}>
                      {counts.L}
                    </td>
                    <td style={{ padding: '8px', backgroundColor: '#EEF2FF', color: '#3730A3', fontWeight: 800 }}>
                      {counts.HD}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
