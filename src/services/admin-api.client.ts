const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const TOKEN_STORAGE_KEY = 'chaiwale_admin_auth_token';
const USER_STORAGE_KEY = 'chaiwale_admin_auth_user';

export interface AdminUserDto {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'customer';
  fullName: string;
}

export interface DashboardStatsDto {
  period?: { dateFrom: string; dateTo: string };
  todayOrders: number;
  todaySales: number;
  paidAmount: number;
  outstandingAmount: number;
  breakdown: {
    codAmount: number;
    upiAmount: number;
    creditAmount: number;
  };
  cateringLeads: number;
  activeCorporateClients: number;
  recentInvoices?: any[];
  date: string;
}

export interface AdminOrderDto {
  id: string;
  order_number: string;
  order_type: string;
  customer_name?: string;
  delivery_address?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  status: string;
  payment_status: string;
  payment_mode?: string;
  transaction_ref?: string;
  created_at: string;
  items?: Array<{
    item_name: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }>;
}

export interface CateringLeadDto {
  id: string;
  leadNumber: string;
  customerName: string;
  phone: string;
  email?: string;
  companyName?: string;
  serviceType: string;
  headcount: number;
  eventDate?: string;
  requirements?: string;
  status: 'NEW' | 'CONTACTED' | 'REQUIREMENT_CONFIRMED' | 'QUOTE_SENT' | 'NEGOTIATION' | 'ADVANCE_RECEIVED' | 'CONFIRMED' | 'COMPLETED' | 'LOST';
  budgetEstimate?: number;
  advanceAmountPaid?: number;
  createdAt: string;
}

export interface MenuItemVariantDto {
  id?: string;
  menu_item_id?: string;
  name: string;
  price: number;
  is_available?: boolean;
}

export interface AdminMenuItemDto {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  base_price: number;
  is_veg: boolean;
  is_egg?: boolean;
  spice_level?: string;
  tags?: string[];
  image_path: string | null;
  is_available: boolean;
  variants?: MenuItemVariantDto[];
  created_at?: string;
  updated_at?: string;
}

export interface CategoryDto {
  id: string;
  slug: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export interface InvoiceRecordDto {
  id: string;
  invoice_number: string;
  invoice_type: string;
  department?: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'CANCELLED';
  issued_at: string;
  pdf_storage_path?: string | null;
  corporate_clients?: {
    id?: string;
    company_name: string;
  } | null;
  orders?: {
    id?: string;
    order_number?: string;
    customer_name?: string;
    order_type?: string;
    payment_mode?: string;
  } | null;
}

export interface InvoiceDetailDto extends InvoiceRecordDto {
  corporate_clients?: {
    id?: string;
    company_name: string;
    gstin?: string;
    billing_address?: string;
  } | null;
  orders?: {
    id?: string;
    order_number?: string;
    customer_id?: string;
    customer_name?: string;
    delivery_address?: string;
    payment_mode?: string;
    customers?: {
      name: string;
      phone: string;
    } | null;
    order_items?: Array<{
      item_name: string;
      unit_price: number;
      quantity: number;
      line_total: number;
    }>;
  } | null;
  payments?: Array<{
    id: string;
    amount: number;
    payment_mode: string;
    payment_status: string;
    transaction_ref?: string;
    paid_at: string;
  }>;
}

export interface LedgerRecordDto {
  id: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance_after: number;
  reference_note: string;
  created_at: string;
  corporate_clients?: {
    id?: string;
    company_name: string;
  } | null;
  invoices?: {
    invoice_number: string;
  } | null;
}

export interface AttendanceRecordDto {
  staffName: string;
  date: string;
  status: 'P' | 'A' | 'L' | 'HD';
  notes?: string;
}

// Token & Session Storage Utilities
export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredAuthUser(): AdminUserDto | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredSession(token: string, user: AdminUserDto): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * Common Authenticated Fetch Wrapper
 * Injects verified Authorization: Bearer <token> header.
 */
async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getStoredAuthToken();
  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    // If not already on login page, redirect
    if (!window.location.pathname.startsWith('/login')) {
      clearStoredSession();
      window.location.href = '/login?expired=true';
    }
  }

  return response;
}

/**
 * Authenticate Administrator / Staff
 */
export async function loginAdmin(email: string, pass: string): Promise<{ accessToken: string; user: AdminUserDto }> {
  const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Authentication failed. Please check your credentials.');
  }

  const { accessToken, user } = json.data;
  setStoredSession(accessToken, user);
  return { accessToken, user };
}

/**
 * Sign out and clear stored session
 */
export function logoutAdmin(): void {
  clearStoredSession();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

/**
 * Fetch current authenticated user info
 */
export async function fetchCurrentAuthUser(): Promise<AdminUserDto> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/auth/me`);
  if (!res.ok) {
    throw new Error('Failed to verify session.');
  }
  const json = await res.json();
  return json.data;
}

/**
 * Fetch live dashboard stats from backend (Manager / Admin)
 */
export async function fetchDashboardStats(dateFrom?: string, dateTo?: string): Promise<DashboardStatsDto> {
  const params = new URLSearchParams();
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  const url = `${BACKEND_URL}/api/v1/admin/dashboard-stats${params.toString() ? '?' + params.toString() : ''}`;
  const res = await authFetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch dashboard metrics: ${res.statusText}`);
  }
  const data = await res.json();
  return data.data;
}

/**
 * Fetch customer directory (Manager / Admin)
 */
export async function fetchAdminCustomers(limit = 50): Promise<any[]> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/admin/customers?limit=${limit}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch customers: ${res.statusText}`);
  }
  const data = await res.json();
  return data.data || [];
}

/**
 * Fetch recent orders from backend (Staff / Manager / Admin)
 */
export async function fetchRecentOrders(limit = 20): Promise<AdminOrderDto[]> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/orders/recent?limit=${limit}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch recent orders: ${res.statusText}`);
  }
  const data = await res.json();
  return data.data || [];
}

/**
 * Update order preparation/delivery status (Staff / Manager / Admin)
 */
export async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update order status');
  }
  return true;
}

/**
 * Permanently delete an order (Admin only)
 */
export async function deleteOrder(orderId: string): Promise<boolean> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/orders/${encodeURIComponent(orderId)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete order');
  }
  return true;
}

/**
 * Fetch catering leads (Manager / Admin)
 */
export async function fetchCateringLeads(limit = 25): Promise<CateringLeadDto[]> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/catering/leads?limit=${limit}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch catering leads: ${res.statusText}`);
  }
  const data = await res.json();
  return data.data || [];
}

/**
 * Update catering lead status (Manager / Admin)
 */
export async function updateCateringLeadStatus(leadId: string, status: string): Promise<boolean> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/catering/leads/${encodeURIComponent(leadId)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update lead status');
  }
  return true;
}

/**
 * Fetch all catalog items (including unavailable items) (Public / Authenticated)
 */
export async function fetchAdminMenuItems(): Promise<AdminMenuItemDto[]> {
  const res = await fetch(`${BACKEND_URL}/api/v1/menu/items?all=true`);
  if (!res.ok) {
    throw new Error(`Failed to fetch menu items: ${res.statusText}`);
  }
  const data = await res.json();
  return data.data || [];
}

/**
 * Toggle menu item availability (Manager / Admin)
 */
export async function toggleItemAvailability(id: string, isAvailable: boolean): Promise<AdminMenuItemDto> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/menu/items/${encodeURIComponent(id)}/availability`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAvailable })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update availability');
  }
  const data = await res.json();
  return data.data;
}

/**
 * Fetch monthly attendance roster (Staff / Manager / Admin)
 */
export async function fetchAttendanceRoster(month: number, year: number): Promise<any[]> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/attendance/roster?month=${month}&year=${year}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch roster: ${res.statusText}`);
  }
  const data = await res.json();
  return data.data || [];
}

/**
 * Save attendance records to Supabase (Manager / Admin)
 */
export async function saveAttendanceRecords(records: AttendanceRecordDto[]): Promise<boolean> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/attendance/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to save attendance');
  }
  return true;
}

/**
 * Verify UPI / External payment for an online order (Staff / Manager / Admin)
 */
export async function verifyOrderPayment(orderId: string, transactionRef?: string): Promise<boolean> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/orders/${encodeURIComponent(orderId)}/verify-payment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionRef })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to verify payment');
  }
  return true;
}

/**
 * Record catering advance payment (Manager / Admin)
 */
export async function recordCateringAdvance(
  leadId: string,
  amount: number,
  paymentMode: 'CASH' | 'UPI' | 'CREDIT',
  transactionRef?: string
): Promise<any> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/catering/leads/${encodeURIComponent(leadId)}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, paymentMode, transactionRef })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to record catering advance');
  }
  const data = await res.json();
  return data.data;
}

/**
 * Fetch KOT Thermal Print ESC/POS base64 payload
 */
export async function fetchKOTPayload(orderId: string): Promise<string> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/printing/receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'KOT', orderId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to generate KOT print payload');
  }
  const data = await res.json();
  return data.data.escPosBase64;
}

/**
 * Document & Excel Export URLs
 */
export function getAttendanceExcelUrl(month: number, year: number): string {
  return `${BACKEND_URL}/api/v1/documents/excel/attendance?month=${month}&year=${year}`;
}

export function getAttendancePdfUrl(month: number, year: number): string {
  return `${BACKEND_URL}/api/v1/documents/pdf/attendance?month=${month}&year=${year}`;
}

export function getSalesExcelUrl(): string {
  const token = getStoredAuthToken();
  return `${BACKEND_URL}/api/v1/documents/excel/sales?token=${token || ''}`;
}

export function getInvoicePdfUrl(invoiceId: string): string {
  return `/api/pdf/invoice/${encodeURIComponent(invoiceId)}`;
}

export function getStatementPdfUrl(clientId: string): string {
  const token = getStoredAuthToken();
  return `${BACKEND_URL}/api/v1/documents/pdf/statement/${encodeURIComponent(clientId)}?token=${token || ''}`;
}

/**
 * Fetch active categories for menu item assignment
 */
export async function fetchCategories(): Promise<CategoryDto[]> {
  const res = await fetch(`${BACKEND_URL}/api/v1/menu/categories`);
  if (!res.ok) {
    throw new Error('Failed to fetch menu categories');
  }
  const json = await res.json();
  return json.data || [];
}

/**
 * Resolves media paths (Supabase public storage or backend proxy)
 */
export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  if (path.startsWith('/assets/')) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${BACKEND_URL}${path}`;
  }
  // Default to backend media proxy or direct public storage
  return `${BACKEND_URL}/api/v1/media/${path}`;
}

/**
 * Upload compressed WebP image to Supabase Storage (Admin / Staff)
 */
export async function uploadMenuImage(
  imageBase64: string,
  fileName: string,
  folder = 'items'
): Promise<{ imagePath: string; storagePath: string; publicUrl: string }> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/media/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      fileName,
      folder,
      bucket: 'menu'
    })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Image upload failed');
  }

  return json.data;
}

/**
 * Create new menu item with variants, spicy level, tags, and image (Admin / Orders staff)
 */
export async function createAdminMenuItem(payload: {
  name: string;
  category_id: string;
  base_price: number;
  is_veg: boolean;
  is_egg?: boolean;
  spice_level?: string;
  tags?: string[];
  description?: string;
  image_path?: string | null;
  is_available?: boolean;
  variants?: MenuItemVariantDto[];
}): Promise<AdminMenuItemDto> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/menu/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create menu item');
  }
  const json = await res.json();
  return json.data;
}

/**
 * Update existing menu item with variants, spicy level, tags, and image (Admin / Orders staff)
 */
export async function updateAdminMenuItem(
  id: string,
  payload: Partial<{
    name: string;
    category_id: string;
    base_price: number;
    is_veg: boolean;
    is_egg: boolean;
    spice_level: string;
    tags: string[];
    description: string;
    image_path: string | null;
    is_available: boolean;
    variants: MenuItemVariantDto[];
  }>
): Promise<AdminMenuItemDto> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/menu/items/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update menu item');
  }
  const json = await res.json();
  return json.data;
}

/**
 * Fetch invoices list (Admin Hub)
 */
export async function fetchInvoices(filters?: {
  status?: string;
  clientId?: string;
  limit?: number;
}): Promise<InvoiceRecordDto[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.clientId) params.set('clientId', filters.clientId);
  params.set('limit', String(filters?.limit || 50));

  const res = await authFetch(`${BACKEND_URL}/api/v1/billing/invoices?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch invoices: ${res.statusText}`);
  }
  const data = await res.json();
  return data.data || [];
}

/**
 * Fetch invoice details by ID
 */
export async function fetchInvoiceById(invoiceId: string): Promise<InvoiceDetailDto> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/billing/invoices/${encodeURIComponent(invoiceId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch invoice details for ${invoiceId}`);
  }
  const data = await res.json();
  return data.data;
}

/**
 * Fetch Customer & Corporate Ledgers
 */
export async function fetchLedger(clientId?: string, limit = 50): Promise<LedgerRecordDto[]> {
  const url = clientId
    ? `${BACKEND_URL}/api/v1/billing/ledger?clientId=${encodeURIComponent(clientId)}&limit=${limit}`
    : `${BACKEND_URL}/api/v1/billing/ledger?limit=${limit}`;
  const res = await authFetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch ledger: ${res.statusText}`);
  }
  const data = await res.json();
  return data.data || [];
}

/**
 * Record payment against invoice / credit ledger
 */
export async function recordInvoicePayment(payload: {
  invoiceId: string;
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD';
  transactionRef?: string;
  notes?: string;
}): Promise<{
  paymentId: string;
  invoiceNumber: string;
  status: string;
  paidAmount: number;
  outstandingAmount: number;
}> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/billing/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to record payment');
  }
  const data = await res.json();
  return data.data;
}

/**
 * Fetch thermal print payload
 */
export async function fetchPrintPayload(params: {
  receiptType: 'CUSTOMER_BILL' | 'KOT' | 'CREDIT_BILL';
  orderId?: string;
  invoiceId?: string;
}): Promise<{
  receiptType: string;
  base64String: string;
  plainTextPreview: string;
}> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/printing/receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to generate print receipt');
  }
  const data = await res.json();
  return data.data;
}

/**
 * Create a new category (Admin / Staff)
 */
export async function createAdminCategory(input: {
  name: string;
  slug?: string;
  display_order?: number;
}): Promise<CategoryDto> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/menu/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create category');
  }
  const data = await res.json();
  return data.data;
}

export interface ClientOfficeDto {
  id: string;
  name: string;
  phone: string;
  company_name?: string;
  floor_unit?: string;
  notes?: string;
  client_pin?: string;
  total_consumption: number;
  total_payments: number;
  balance_due: number;
  last_entry_date?: string;
  created_at: string;
}

export interface ClientStatementDto {
  office: ClientOfficeDto;
  entries: Array<{
    id: string;
    date: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    notes?: string;
  }>;
  payments: Array<{
    id: string;
    date: string;
    amount: number;
    payment_mode: string;
    notes?: string;
  }>;
  totalConsumption: number;
  totalPayments: number;
  balanceDue: number;
  whatsappText: string;
}

/**
 * Fetch all registered corporate / khata clients with PINs and balances
 */
export async function fetchClients(): Promise<ClientOfficeDto[]> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/khata/offices`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch client accounts');
  }
  const json = await res.json();
  return json.data || [];
}

/**
 * Create a new corporate / regular client account with PIN
 */
export async function createClient(payload: {
  name: string;
  phone: string;
  company_name?: string;
  floor_unit?: string;
  notes?: string;
  client_pin?: string;
}): Promise<ClientOfficeDto> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/khata/offices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create client account');
  }
  const json = await res.json();
  return json.data;
}

/**
 * Regenerate or set custom access PIN for a client
 */
export async function regenerateClientPin(clientId: string, pin?: string): Promise<string> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/khata/offices/${encodeURIComponent(clientId)}/pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to set client PIN');
  }
  const json = await res.json();
  return json.data.pin;
}

/**
 * Fetch complete billing statement (consumptions, payments, balance due) for a client
 */
export async function fetchClientStatement(clientId: string): Promise<ClientStatementDto> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/khata/statement/${encodeURIComponent(clientId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch client statement');
  }
  const json = await res.json();
  return json.data;
}

/**
 * Record a payment from a client account
 */
export async function addClientPayment(payload: {
  office_id: string;
  amount: number;
  payment_mode?: string;
  date?: string;
  notes?: string;
}): Promise<any> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/khata/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to record payment');
  }
  const json = await res.json();
  return json.data;
}

/**
 * Add a consumption / bill entry for a client
 */
export async function addClientEntry(payload: {
  office_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  date?: string;
  notes?: string;
}): Promise<any> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/khata/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to add bill entry');
  }
  const json = await res.json();
  return json.data;
}

/**
 * Update client details
 */
export async function updateClient(
  clientId: string,
  payload: { name?: string; phone?: string; company_name?: string; floor_unit?: string; notes?: string }
): Promise<ClientOfficeDto> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/khata/offices/${encodeURIComponent(clientId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update client');
  }
  const json = await res.json();
  return json.data;
}

/**
 * Delete client account
 */
export async function deleteClient(clientId: string): Promise<void> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/khata/offices/${encodeURIComponent(clientId)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete client');
  }
}

/**
 * Delete a khata entry
 */
export async function deleteClientEntry(entryId: string): Promise<void> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/khata/entries/${encodeURIComponent(entryId)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete entry');
  }
}

/**
 * Delete a payment record
 */
export async function deleteClientPayment(paymentId: string): Promise<void> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/khata/payments/${encodeURIComponent(paymentId)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete payment');
  }
}

export interface PromoBannerDto {
  id: string;
  badge: string;
  title: string;
  description: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  whatsappNumber?: string;
  whatsappText?: string;
  theme?: 'cream' | 'dark' | 'amber';
  isActive: boolean;
  order: number;
}

export async function fetchPromoBanners(): Promise<PromoBannerDto[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/config/banners`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch promo banners:', err);
    return [];
  }
}

export async function updatePromoBanners(banners: PromoBannerDto[]): Promise<PromoBannerDto[]> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/config/banners`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ banners })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to update promo banners');
  }
  return json.data;
}

export interface HeroSlideDto {
  id: string;
  badge: string;
  tag: string;
  headline: string;
  headlineAccent: string;
  sub: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  waCtaLabel: string;
  waCtaHref: string;
  highlights: string[];
  image: string;
  imageAlt: string;
  order: number;
}

export async function fetchHeroSlides(): Promise<HeroSlideDto[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/config/hero`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch hero slides:', err);
    return [];
  }
}

export async function updateHeroSlides(slides: HeroSlideDto[]): Promise<HeroSlideDto[]> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/config/hero`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to update hero slides');
  }
  return json.data;
}

export interface StoreProfileDto {
  store_name: string;
  tagline: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  upi_id: string;
  opening_time?: string;
  closing_time?: string;
}

export async function fetchStoreProfile(): Promise<StoreProfileDto> {
  const res = await fetch(`${BACKEND_URL}/api/v1/config/store-profile`, {
    cache: 'no-store'
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to fetch store profile');
  }
  return json.data;
}

export async function updateStoreProfile(profile: Partial<StoreProfileDto>): Promise<StoreProfileDto> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/config/store-profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to update store profile');
  }
  return json.data;
}

export async function deleteInvoice(invoiceId: string): Promise<boolean> {
  const res = await authFetch(`${BACKEND_URL}/api/v1/billing/invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to delete invoice');
  }
  return true;
}






