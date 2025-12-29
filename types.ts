
export interface Invoice {
  id?: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO Date string
  invoiceAmount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  credit: number;
  rowIndex?: number;
}

export interface Worksheet {
  id: string;
  name: string;
  position: number;
  visibility: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalCredit: number;
  pendingPayments: number;
  pendingAmount: number;
  overdueCount: number;
  overdueAmount: number;
}

export interface ClientInsight {
    name: string;
    changePercentage: number;
    amount: number;
    status: 'Growth' | 'Decline' | 'Stable';
}

export interface AIReport {
  summary: string;
  trend: 'up' | 'down' | 'stable';
  growthRate: number;
  topClient: { name: string; amount: number; percentage: number };
  riskAssessment: { level: 'Low' | 'Medium' | 'High'; score: number; message: string };
  actionItems: string[];
  
  // Basic Analytics Fields
  monthlyAverage: number;
  bestMonth: string;
  projectedRevenue: number;
  customerConcentration: 'High' | 'Balanced' | 'Low';
  
  // Simple Lists
  risingClients: ClientInsight[];
  decliningClients: ClientInsight[];
}

export type DateFilterType = 'all' | 'this_year' | 'last_30_days' | 'last_90_days' | 'custom';
export type ChartType = 'revenue_bar' | 'status_pie' | 'trend_area' | 'moving_average' | 'risk_vs_reward' | 'cumulative' | 'customer_revenue' | 'customer_outstanding' | 'top_customers_pie';
