import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend, ComposedChart, Line
} from 'recharts';
import { Invoice, AIReport, ChartType } from '../types';
import { 
  Sparkles, BarChart3, TrendingUp, TrendingDown, Target, Brain, CheckCircle2, Zap, Maximize2, X, Activity, PieChart as PieChartIcon, Layout
} from 'lucide-react';
import { format } from 'date-fns';

interface AnalyticsProps {
  invoices: Invoice[]; 
  aiReport: AIReport; 
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#64748b'];

const Analytics: React.FC<AnalyticsProps> = ({ invoices, aiReport }) => {
  const [chartType, setChartType] = useState<ChartType>('revenue_bar');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- DATA PREP ---

  // 1. Monthly Revenue & Moving Average
  const combinedTrendData = useMemo(() => {
    const groups: Record<string, number> = {};
    
    // Aggregate by month
    invoices.forEach(inv => {
      try {
        const date = new Date(inv.invoiceDate);
        // Ensure valid date
        if (!isNaN(date.getTime())) {
            const key = format(date, 'yyyy-MM'); // Sortable key
            groups[key] = (groups[key] || 0) + inv.invoiceAmount;
        }
      } catch (e) {}
    });

    // Convert to array and Sort Chronologically
    let data = Object.keys(groups)
        .map(key => {
            const [year, month] = key.split('-').map(Number);
            return { 
                rawDate: key,
                name: format(new Date(year, month - 1), 'MMM yy'), 
                revenue: groups[key],
                movingAvg: 0
            };
        })
        .sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    // Calculate Moving Average (3-month simple moving average)
    data = data.map((item, index, array) => {
        const start = Math.max(0, index - 2);
        const subset = array.slice(start, index + 1);
        const sum = subset.reduce((acc, curr) => acc + curr.revenue, 0);
        return { ...item, movingAvg: Math.round(sum / subset.length) };
    });

    return data;
  }, [invoices]);

  // 2. Status Distribution (Pie)
  const pieData = useMemo(() => {
    const counts = { Paid: 0, Pending: 0, Overdue: 0 };
    invoices.forEach(inv => { if (inv.status in counts) counts[inv.status]++; });
    return [
        { name: 'Paid', value: counts.Paid, color: '#10b981' },
        { name: 'Pending', value: counts.Pending, color: '#f59e0b' },
        { name: 'Overdue', value: counts.Overdue, color: '#ef4444' },
    ].filter(d => d.value > 0);
  }, [invoices]);

  // 3. Customer Revenue Share (Pie)
  const customerPieData = useMemo(() => {
      const clientMap: Record<string, number> = {};
      invoices.forEach(inv => {
          clientMap[inv.customerName] = (clientMap[inv.customerName] || 0) + inv.invoiceAmount;
      });

      let sorted = Object.entries(clientMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

      // Take Top 5 and group the rest
      if (sorted.length > 5) {
          const top5 = sorted.slice(0, 5);
          const othersValue = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0);
          return [...top5, { name: 'Others', value: othersValue }];
      }
      return sorted;
  }, [invoices]);

  // --- RENDER HELPERS ---
  const renderCustomLabel = ({ name, percent, x, y, cx, cy }: any) => {
    return (
      <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="bold">
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Determine Risk Colors
  const riskColor = aiReport.riskAssessment.level === 'High' ? 'bg-rose-500/20 text-rose-400' : aiReport.riskAssessment.level === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400';
  const riskBarColor = aiReport.riskAssessment.level === 'High' ? 'bg-rose-500' : aiReport.riskAssessment.level === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500';

  // --- RENDER CONTENT ---
  const renderChart = () => {
      switch(chartType) {
        case 'status_pie':
            return (
                <PieChart>
                    <Pie 
                        data={pieData} 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={110} 
                        dataKey="value"
                        label={renderCustomLabel}
                        labelLine={true}
                    >
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Invoices']} />
                    <Legend verticalAlign="bottom" height={36} />
                </PieChart>
            );
        case 'top_customers_pie':
            return (
                <PieChart>
                    <Pie 
                        data={customerPieData} 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={110} 
                        dataKey="value"
                        label={renderCustomLabel} // External labels
                        labelLine={true}
                    >
                        {customerPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
            );
        case 'trend_area':
            return (
                <AreaChart data={combinedTrendData}>
                    <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
            );
        case 'moving_average':
            return (
                <ComposedChart data={combinedTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" barSize={20} fill="#cbd5e1" radius={[4,4,0,0]} />
                    <Line type="monotone" dataKey="movingAvg" name="3-Month Avg" stroke="#f59e0b" strokeWidth={3} dot={false} />
                </ComposedChart>
            );
        default: // revenue_bar
            return (
                <BarChart data={combinedTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#0ea5e9" radius={[4,4,0,0]} />
                </BarChart>
            );
      }
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      
      {/* LEFT: Chart Section */}
      <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[500px]">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 size={20} className="text-brand-500" /> Performance Analytics
            </h3>
            <select 
                value={chartType} 
                onChange={(e) => setChartType(e.target.value as ChartType)} 
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
                <option value="revenue_bar">Monthly Revenue (Bar)</option>
                <option value="trend_area">Revenue Trend (Area)</option>
                <option value="moving_average">Revenue vs Moving Avg</option>
                <option value="status_pie">Payment Status</option>
                <option value="top_customers_pie">Customer Share</option>
            </select>
        </div>

        <div className="flex-1 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
            </ResponsiveContainer>
        </div>
      </div>

      {/* RIGHT: AI Report Card (Clickable) */}
      <div 
        onClick={() => setIsModalOpen(true)}
        className="lg:col-span-1 bg-slate-900 text-white p-0 rounded-2xl shadow-xl border border-slate-700 overflow-hidden flex flex-col h-[500px] cursor-pointer group relative transition-all hover:ring-2 hover:ring-purple-500 hover:shadow-2xl hover:shadow-purple-500/20"
      >
          {/* Header */}
          <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex items-center gap-3 shrink-0">
             <div className="p-2 bg-purple-500/20 rounded-lg">
                <Brain className="text-purple-400" size={20} />
             </div>
             <div>
                <h3 className="font-bold text-lg text-slate-100">AI Intelligence</h3>
                <p className="text-xs text-slate-400">Real-time financial analysis</p>
             </div>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
             
             {/* 1. Risk Analysis */}
             <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Risk / Reward</span>
                   <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riskColor}`}>{aiReport.riskAssessment.level} Risk</span>
                </div>
                {/* Custom Gauge/Bar */}
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2 relative">
                     <div className={`h-full ${riskBarColor} transition-all duration-1000 ease-out`} style={{ width: `${aiReport.riskAssessment.score}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                    <span>Safe</span>
                    <span>Critical</span>
                </div>
                <p className="text-xs text-slate-300 leading-snug border-l-2 border-slate-600 pl-2">
                    {aiReport.riskAssessment.message || "Financial health check complete."}
                </p>
             </div>

             {/* 2. Client Analysis (Movers) */}
             <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Target size={14}/> Customer Insights
                </h4>
                <div className="space-y-2">
                   {/* Rising */}
                   {aiReport.risingClients.slice(0,2).map(c => (
                      <div key={c.name} className="flex items-center justify-between p-2.5 bg-emerald-900/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-900/20 transition-colors">
                          <div className="flex items-center gap-3">
                              <div className="p-1 bg-emerald-500/20 rounded">
                                <TrendingUp size={14} className="text-emerald-400" />
                              </div>
                              <span className="text-xs font-medium text-slate-200">{c.name}</span>
                          </div>
                          <span className="text-xs font-bold text-emerald-400">+{c.changePercentage}%</span>
                      </div>
                   ))}
                   {/* Declining */}
                   {aiReport.decliningClients.slice(0,2).map(c => (
                      <div key={c.name} className="flex items-center justify-between p-2.5 bg-rose-900/10 border border-rose-500/20 rounded-lg hover:bg-rose-900/20 transition-colors">
                          <div className="flex items-center gap-3">
                              <div className="p-1 bg-rose-500/20 rounded">
                                <TrendingDown size={14} className="text-rose-400" />
                              </div>
                              <span className="text-xs font-medium text-slate-200">{c.name}</span>
                          </div>
                          <span className="text-xs font-bold text-rose-400">{c.changePercentage}%</span>
                      </div>
                   ))}
                   {aiReport.risingClients.length === 0 && aiReport.decliningClients.length === 0 && (
                       <p className="text-xs text-slate-500 italic">Not enough historical data for trend analysis.</p>
                   )}
                </div>
             </div>

             {/* 3. Action Items */}
             <div>
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Zap size={14}/> Recommended Actions
                 </h4>
                 <ul className="space-y-2.5">
                    {aiReport.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 group">
                            <CheckCircle2 size={16} className="text-purple-500 shrink-0 mt-0.5 group-hover:text-purple-400 transition-colors" />
                            <span className="text-xs text-slate-300 group-hover:text-slate-200 transition-colors leading-relaxed">{item}</span>
                        </li>
                    ))}
                 </ul>
             </div>

          </div>

          {/* Hover Overlay Hint */}
         <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
            <div className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                <Maximize2 size={16} /> Open Full Report
            </div>
         </div>
      </div>
    </div>

    {/* Full Screen Modal */}
    {isModalOpen && (
      <div className="fixed inset-0 z-[100] bg-slate-50 overflow-y-auto animate-in fade-in duration-200 custom-scrollbar">
         {/* Modal Header */}
         <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
             <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl shadow-lg">
                    <Brain size={24}/>
                 </div>
                 <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Financial Intelligence Hub</h2>
                    <p className="text-xs text-slate-500 font-medium">Comprehensive analysis & advanced visualization</p>
                 </div>
             </div>
             <button onClick={() => setIsModalOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700">
                <X size={24} />
             </button>
         </div>

         <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 pb-20">
             
             {/* TOP SECTION: Expanded AI Insights */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 
                 {/* 1. Risk Detail */}
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-slate-700 font-bold">
                            <Activity className="text-rose-500" size={20} />
                            Risk Assessment
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${aiReport.riskAssessment.level === 'High' ? 'bg-rose-100 text-rose-700' : aiReport.riskAssessment.level === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {aiReport.riskAssessment.level} Risk
                        </span>
                     </div>
                     
                     <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                                <span>Risk Score</span>
                                <span>{aiReport.riskAssessment.score}/100</span>
                            </div>
                            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${riskBarColor} transition-all duration-1000`} style={{ width: `${aiReport.riskAssessment.score}%` }}></div>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                            {aiReport.riskAssessment.message}
                        </p>
                     </div>
                 </div>

                 {/* 2. Strategy & Actions */}
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                     <div className="flex items-center gap-2 text-slate-700 font-bold mb-4">
                        <Zap className="text-amber-500" size={20} />
                        Strategic Actions
                     </div>
                     <ul className="space-y-3">
                        {aiReport.actionItems.map((item, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <CheckCircle2 size={18} className="text-purple-500 shrink-0 mt-0.5" />
                                <span className="text-sm text-slate-600 font-medium">{item}</span>
                            </li>
                        ))}
                     </ul>
                 </div>

                 {/* 3. Top Movers */}
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                     <div className="flex items-center gap-2 text-slate-700 font-bold mb-4">
                        <TrendingUp className="text-emerald-500" size={20} />
                        Significant Movements
                     </div>
                     <div className="space-y-3">
                        {aiReport.risingClients.slice(0, 3).map((c, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                <span className="text-sm font-bold text-slate-700">{c.name}</span>
                                <span className="text-sm font-bold text-emerald-600">+{c.changePercentage}%</span>
                            </div>
                        ))}
                         {aiReport.decliningClients.slice(0, 2).map((c, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                                <span className="text-sm font-bold text-slate-700">{c.name}</span>
                                <span className="text-sm font-bold text-rose-600">{c.changePercentage}%</span>
                            </div>
                        ))}
                     </div>
                 </div>

             </div>

             {/* BOTTOM SECTION: ALL CHARTS */}
             <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                    <Layout className="text-blue-500" />
                    Detailed Visualizations
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Chart 1: Trend */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[420px] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                             <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                <Activity size={16} className="text-blue-500"/> Revenue Trend
                             </h4>
                        </div>
                        <div className="flex-1 w-full text-xs">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={combinedTrendData}>
                                    <defs>
                                        <linearGradient id="modalColorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tick={{fill: '#64748b'}} />
                                    <YAxis fontSize={12} tick={{fill: '#64748b'}} />
                                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#modalColorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 2: Moving Average */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[420px] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                             <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                <TrendingUp size={16} className="text-amber-500"/> Revenue vs 3-Month Avg
                             </h4>
                        </div>
                        <div className="flex-1 w-full text-xs">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={combinedTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tick={{fill: '#64748b'}} />
                                    <YAxis fontSize={12} tick={{fill: '#64748b'}} />
                                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Legend />
                                    <Bar dataKey="revenue" name="Revenue" barSize={30} fill="#cbd5e1" radius={[4,4,0,0]} />
                                    <Line type="monotone" dataKey="movingAvg" name="3-Month Avg" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 3: Payment Status */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[420px] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                             <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                <PieChartIcon size={16} className="text-emerald-500"/> Payment Status
                             </h4>
                        </div>
                        <div className="flex-1 w-full text-xs">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={pieData} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={80}
                                        outerRadius={120} 
                                        dataKey="value"
                                        paddingAngle={5}
                                    >
                                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => [value, 'Invoices']} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 4: Customer Share */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[420px] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                             <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                <Target size={16} className="text-indigo-500"/> Top Customers Revenue
                             </h4>
                        </div>
                        <div className="flex-1 w-full text-xs">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={customerPieData} 
                                        cx="50%" 
                                        cy="50%" 
                                        outerRadius={120} 
                                        dataKey="value"
                                        label={renderCustomLabel} 
                                        labelLine={true}
                                    >
                                        {customerPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
             </div>
         </div>
      </div>
    )}
    </>
  );
};

export default Analytics;