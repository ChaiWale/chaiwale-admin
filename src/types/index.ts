export interface AdminDashboardMetric {
  totalOrdersToday: number;
  activeCateringInquiries: number;
  staffPresentCount: number;
}

export type AttendanceCode = 'P' | 'A' | 'L' | 'HD';

export interface AttendanceGridRow {
  staffId: string;
  staffName: string;
  days: Record<number, AttendanceCode>;
}
