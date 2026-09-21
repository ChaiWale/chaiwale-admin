'use client';

import React, { useState, useEffect } from 'react';
import { fetchAttendanceRoster, saveAttendanceRecords, getAttendanceExcelUrl, AttendanceRecordDto } from '../../services/admin-api.client';

type AttendanceCode = 'P' | 'A' | 'L' | 'HD' | '';

const STORAGE_KEY = 'chaiwale_active_staff_roster';

const ROLE_OPTIONS = [
  'Chai Specialist',
  'Head Chef',
  'Kitchen Cook',
  'Kitchen Helper',
  'Counter & Billing',
  'Service & Packing',
  'Logistics & Delivery',
  'Store Manager',
  'General Staff'
];

export default function AdminAttendancePage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [staffList, setStaffList] = useState<string[]>([]);
  const [gridData, setGridData] = useState<Record<string, Record<number, AttendanceCode>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Staff Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState(ROLE_OPTIONS[0]);

  // Multi-keyword staff filter
  const filteredStaffList = staffList.filter((staff) => {
    const rawQuery = searchQuery.toLowerCase().trim();
    const keywords = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];
    if (keywords.length === 0) return true;
    return keywords.every((kw) => staff.toLowerCase().includes(kw));
  });

  // Number of days in the selected month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getSavedStaff = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  };

  const saveStaffToStorage = (list: string[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  };

  const loadRoster = async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await fetchAttendanceRoster(selectedMonth, selectedYear);
      // Map records to grid: { [staffName]: { [day]: status } }
      const newGrid: Record<string, Record<number, AttendanceCode>> = {};
      const savedStaff = getSavedStaff();
      const foundStaff = new Set<string>(savedStaff);

      records.forEach((rec: any) => {
        const staff = rec.staff_name;
        if (staff) {
          foundStaff.add(staff);
          const dayNum = new Date(rec.date).getDate();
          if (!newGrid[staff]) newGrid[staff] = {};
          newGrid[staff][dayNum] = rec.status as AttendanceCode;
        }
      });

      const fullList = Array.from(foundStaff);
      setStaffList(fullList);
      saveStaffToStorage(fullList);
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

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStaffName.trim();
    if (!trimmed) return;

    const formatted = newStaffRole.trim() ? `${trimmed} (${newStaffRole.trim()})` : trimmed;

    if (staffList.some((s) => s.toLowerCase() === formatted.toLowerCase())) {
      setError('Staff member with this name and role already exists.');
      return;
    }

    const updated = [...staffList, formatted];
    setStaffList(updated);
    saveStaffToStorage(updated);
    setNewStaffName('');
    setNewStaffRole(ROLE_OPTIONS[0]);
    setShowAddModal(false);
    setFeedback(`✓ Added ${formatted} to roster`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRemoveStaff = (staff: string) => {
    if (!confirm(`Remove "${staff}" from active roster?`)) return;
    const updated = staffList.filter((s) => s !== staff);
    setStaffList(updated);
    saveStaffToStorage(updated);
    setFeedback(`Removed "${staff}" from roster`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const cycleStatus = (staff: string, day: number) => {
    const current = gridData[staff]?.[day] || '';
    let next: AttendanceCode = '';
    if (current === '') next = 'P';
    else if (current === 'P') next = 'A';
    else if (current === 'A') next = 'L';
    else if (current === 'L') next = 'HD';
    else next = '';

    setGridData((prev) => ({
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
        setFeedback('No attendance entries to save. Click any cell to mark P/A/L/HD first.');
        return;
      }

      await saveAttendanceRecords(recordsToSave);
      setFeedback(`✓ Successfully saved ${recordsToSave.length} attendance records!`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    if (staffList.length === 0) {
      alert('No staff members to export.');
      return;
    }
    const header = ['Staff Member', ...days.map((d) => `Day ${d}`), 'P', 'A', 'L', 'HD'].join(',');
    const rows = staffList.map((staff) => {
      const counts = getCounts(staff);
      const rowDays = days.map((d) => gridData[staff]?.[d] || '');
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
    Object.values(staffDays).forEach((code) => {
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
            Daily Duty & Attendance Register • Month: <strong>{monthNames[selectedMonth - 1]} {selectedYear}</strong> • Total Staff: <strong>{staffList.length}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Staff Search input */}
          <input
            type="text"
            placeholder="Search staff by name or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--cw-radius-md)',
              border: '1px solid var(--cw-color-border)',
              fontSize: '13px',
              minWidth: '220px'
            }}
          />

          {/* Add Staff Button */}
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--cw-radius-md)',
              border: 'none',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            + Add Staff Member
          </button>

          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
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
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--cw-radius-md)',
              border: '1px solid var(--cw-color-border)',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF'
            }}
          >
            {[2025, 2026, 2027].map((y) => (
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
            Excel Matrix
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
            Export CSV
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
            {saving ? 'Saving...' : 'Save Grid'}
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
          {error}
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
        <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
          Click any cell to cycle status (Present → Absent → Leave → Half Day → Clear)
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
            <p style={{ fontSize: '15px', fontWeight: 600 }}>Loading staff attendance roster...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748B' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1E2328', marginBottom: '8px' }}>
              No Staff Members in Active Roster
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '440px', margin: '0 auto 18px', lineHeight: 1.5 }}>
              Test staff have been cleared. Click &ldquo;+ Add Staff Member&rdquo; to add your genuine kitchen, chai specialists, delivery, and billing team.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              + Add First Staff Member
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }}>
            <thead>
              <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid var(--cw-color-border)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: '220px', fontWeight: 700, borderRight: '1px solid var(--cw-color-border)' }}>
                  Staff Member &amp; Role
                </th>
                {days.map((d) => (
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
              {filteredStaffList.map((staff) => {
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span>{staff}</span>
                        <button
                          onClick={() => handleRemoveStaff(staff)}
                          title={`Remove ${staff}`}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                        >
                          ✕
                        </button>
                      </div>
                    </td>

                    {days.map((d) => {
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

      {/* Add Staff Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              border: '1px solid var(--cw-color-border)'
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E2328', margin: '0 0 4px' }}>
              Add Staff Member
            </h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px' }}>
              Add a real staff member to your daily attendance register.
            </p>

            <form onSubmit={handleAddStaff}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Ramesh Kumar"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--cw-color-border)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Role / Designation
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--cw-color-border)',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: '#F1F5F9',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#D97706',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Add to Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
