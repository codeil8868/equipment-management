// 뷰/테이블 조회 결과 타입 (필요한 필드만)

export type SupplyStatus = {
  item_name: string;
  unit: string | null;
  current_stock: number;
  reorder_level: number;
  status: string; // 충분 | 부족 | 결품
  manager: string | null;
  last_date: string | null;
};

export type RentalAvail = {
  item_name: string;
  class: string | null;
  owned_qty: number;
  rented: number;
  available: number;
};

export type BudgetSummary = {
  year: number;
  category: string;
  annual_budget: number;
  spent: number;
  remaining: number;
  rate: number;
};

export type Inspection = {
  id: number;
  inspected_on: string;
  history_type: string | null;
  inspection_type: string | null;
  target: string | null;
  facility_name: string | null;
  asset_no: string | null;
  item: string | null;
  manager_primary: string | null;
  result: string | null;
};

export type Equipment = { asset_no: string; name: string; qty: number | null };
export type Facility = { mgmt_no: string; category: string | null; name: string };
export type Software = { name: string; owned_qty: number | null; installed_qty: number | null };
