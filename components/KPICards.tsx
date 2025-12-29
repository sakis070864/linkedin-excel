import React from 'react';
import { DollarSign, AlertTriangle, TrendingUp, CreditCard } from 'lucide-react';
import { DashboardStats } from '../types';

interface KPICardsProps {
  stats: DashboardStats;
}

const KPICards: React.FC<KPICardsProps> = ({ stats }) => {
  const cards = [
    {
      title: "Total Revenue",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      subtext: "Gross Income",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "Outstanding",
      value: `$${(stats.totalRevenue - stats.totalCredit).toLocaleString()}`,
      subtext: "To be collected",
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Pending",
      value: `$${stats.pendingAmount.toLocaleString()}`,
      subtext: `${stats.pendingPayments} invoices`,
      icon: CreditCard,
      color: "text-amber-600",
      bg: "bg-amber-50"
    },
    {
      title: "Overdue",
      value: `$${stats.overdueAmount.toLocaleString()}`,
      subtext: `${stats.overdueCount} invoices`,
      icon: AlertTriangle,
      color: "text-rose-600",
      bg: "bg-rose-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">{card.title}</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{card.value}</h3>
            {card.subtext && <p className="text-xs text-slate-400 mt-1 font-medium">{card.subtext}</p>}
          </div>
          <div className={`p-3 rounded-lg ${card.bg}`}>
            <card.icon className={`w-6 h-6 ${card.color}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default KPICards;