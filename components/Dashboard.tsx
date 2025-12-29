import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useMsal } from "@azure/msal-react";
import * as GraphService from "../services/graphService";
import { DashboardStats, Invoice, Worksheet, DateFilterType, AIReport, ClientInsight } from '../types';
import KPICards from './KPICards';
import DataTable from './DataTable';
import Analytics from './Analytics';
import NamePopup from './NamePopup'; // [ΠΡΟΣΘΗΚΗ] Εισαγωγή του Component
import { FileSpreadsheet, RefreshCw, PlusCircle, Search, LogOut, Calendar, Filter, ArrowRight, XCircle, Linkedin, X, Save, BookOpen, HelpCircle, Activity, Database, User, CheckCircle2, Zap, Shield, Rocket, DollarSign, TrendingUp, AlertTriangle, CreditCard, MousePointerClick, BarChart3, ListFilter, Sparkles, Maximize2 } from 'lucide-react';

// --- Date Helper Functions ---

const isAfter = (date: Date, dateToCompare: Date) => {
  return date.getTime() > dateToCompare.getTime();
};

const subDays = (date: Date, amount: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() - amount);
  return d;
};

const startOfYear = (date: Date) => {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const isWithinInterval = (date: Date, interval: { start: Date; end: Date }) => {
  return date.getTime() >= interval.start.getTime() && date.getTime() <= interval.end.getTime();
};

interface DashboardProps {
  demoMode?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ demoMode = false }) => {
  const { instance, accounts } = useMsal();
  const [sheets, setSheets] = useState<Worksheet[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  
  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Edit State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isClientPopupOpen, setIsClientPopupOpen] = useState(false); // [ΠΡΟΣΘΗΚΗ] State για το Client Directory
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [newInvoiceForm, setNewInvoiceForm] = useState({
    customerName: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    invoiceAmount: '',
    status: 'Pending',
    credit: '0'
  });

  const userName = demoMode ? "Demo User" : (accounts[0]?.name || "User");
  const userInitial = userName.charAt(0);

  // --- INIT & FETCH ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!demoMode && accounts.length > 0) {
          GraphService.ensureClient(instance, accounts[0]);
        }
        await GraphService.ensureFinancialFile();
        const worksheets = await GraphService.getWorksheets();
        setSheets(worksheets);
        if (worksheets.length > 0) setActiveSheet(worksheets[0].name);
      } catch (err: any) {
        console.error("Dashboard Init Error:", err);
        setError(err.message || "Failed to initialize dashboard.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [instance, accounts, demoMode]);

  const refreshData = useCallback(async () => {
      if (!activeSheet) return;
      setSyncing(true);
      try {
        const data = await GraphService.getSheetData(activeSheet);
        setInvoices(data);
      } catch (err) {
        console.error("Fetch Data Error:", err);
      } finally {
        if (demoMode) await new Promise(r => setTimeout(r, 500));
        setSyncing(false);
      }
  }, [activeSheet, demoMode]);

  useEffect(() => { refreshData(); }, [refreshData]);

  const handleResetAndRefresh = async () => {
    setDateFilter('all');
    setSearchQuery('');
    setCustomStartDate('');
    setCustomEndDate('');
    await refreshData();
  };

  // --- FILTERING ---
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
        const matchesSearch = inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (dateFilter === 'all') return true;
        const invDate = new Date(inv.invoiceDate);
        if (isNaN(invDate.getTime())) return false; 
        const today = new Date();
        
        if (dateFilter === 'last_30_days') return isAfter(invDate, subDays(today, 30));
        if (dateFilter === 'last_90_days') return isAfter(invDate, subDays(today, 90));
        if (dateFilter === 'this_year') return isAfter(invDate, startOfYear(today));
        if (dateFilter === 'custom') {
            if (!customStartDate || !customEndDate) return true; 
            const start = startOfDay(new Date(customStartDate));
            const end = endOfDay(new Date(customEndDate));
            return isWithinInterval(invDate, { start, end });
        }
        return true;
    });
  }, [invoices, searchQuery, dateFilter, customStartDate, customEndDate]);

  const stats: DashboardStats = useMemo(() => {
    const pendingItems = filteredInvoices.filter(i => i.status === 'Pending');
    const overdueItems = filteredInvoices.filter(i => i.status === 'Overdue');
    return {
      totalRevenue: filteredInvoices.reduce((acc, curr) => acc + curr.invoiceAmount, 0),
      totalCredit: filteredInvoices.reduce((acc, curr) => acc + curr.credit, 0),
      pendingPayments: pendingItems.length,
      pendingAmount: pendingItems.reduce((acc, curr) => acc + curr.invoiceAmount, 0),
      overdueCount: overdueItems.length,
      overdueAmount: overdueItems.reduce((acc, curr) => acc + curr.invoiceAmount, 0),
    };
  }, [filteredInvoices]);

  // --- STANDARD AI ANALYSIS ---
  const aiReport: AIReport = useMemo(() => {
    if (filteredInvoices.length === 0) return {
        summary: "No data available.", trend: 'stable', growthRate: 0,
        topClient: { name: 'N/A', amount: 0, percentage: 0 },
        riskAssessment: { level: 'Low', score: 0, message: '' }, actionItems: [],
        monthlyAverage: 0, bestMonth: 'N/A', projectedRevenue: 0,
        customerConcentration: 'Balanced', risingClients: [], decliningClients: []
    };

    const sorted = [...filteredInvoices].sort((a,b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());
    const midPoint = Math.floor(sorted.length / 2);
    const firstHalfRev = sorted.slice(0, midPoint).reduce((a,b) => a + b.invoiceAmount, 0);
    const secondHalfRev = sorted.slice(midPoint).reduce((a,b) => a + b.invoiceAmount, 0);
    
    let growthRate = 0;
    if (firstHalfRev > 0) growthRate = Math.round(((secondHalfRev - firstHalfRev) / firstHalfRev) * 100);

    const clientStats: Record<string, { total: number, recent: number, older: number }> = {};
    const cutoffDate = subDays(new Date(), 60);

    filteredInvoices.forEach(inv => {
        if (!clientStats[inv.customerName]) clientStats[inv.customerName] = { total: 0, recent: 0, older: 0 };
        const c = clientStats[inv.customerName];
        c.total += inv.invoiceAmount;
        if (isAfter(new Date(inv.invoiceDate), cutoffDate)) c.recent += inv.invoiceAmount;
        else c.older += inv.invoiceAmount;
    });

    const risingClients: ClientInsight[] = [];
    const decliningClients: ClientInsight[] = [];

    Object.entries(clientStats).forEach(([name, data]) => {
        const growth = data.older > 0 ? ((data.recent - data.older) / data.older) * 100 : 100;
        
        if (data.recent > data.older * 1.2) {
            risingClients.push({ name, changePercentage: Math.round(growth), amount: data.recent, status: 'Growth' });
        } else if (data.older > 1000 && data.recent < data.older * 0.5) {
             const drop = Math.round(((data.older - data.recent) / data.older) * 100);
             decliningClients.push({ name, changePercentage: -drop, amount: data.older - data.recent, status: 'Decline' });
        }
    });

    const monthlyAvg = stats.totalRevenue / (sorted.length > 0 ? 12 : 1);
    
    // Risk Calculation
    const totalRev = stats.totalRevenue || 1;
    const overdueRev = stats.overdueAmount;
    const riskScore = Math.min(Math.round((overdueRev / totalRev) * 100), 100);
    
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
    let riskMsg = "Financial health is stable.";
    
    if (riskScore > 25) {
        riskLevel = 'High';
        riskMsg = "Significant exposure to overdue payments.";
    } else if (riskScore > 10) {
        riskLevel = 'Medium';
        riskMsg = "Monitor outstanding invoices closely.";
    }

    return {
        summary: growthRate > 0 ? "Revenue is growing steadily based on recent trends." : "Revenue shows a slight decline compared to previous period.",
        trend: growthRate > 0 ? 'up' : 'down',
        growthRate,
        topClient: { name: 'Acme', amount: 0, percentage: 0 }, 
        riskAssessment: { level: riskLevel, score: riskScore, message: riskMsg },
        actionItems: ["Focus on collecting overdue payments.", "Upsell to growing clients.", "Review credit terms for declining accounts."],
        monthlyAverage: monthlyAvg,
        bestMonth: 'N/A',
        projectedRevenue: monthlyAvg * 1.1,
        customerConcentration: 'Balanced',
        risingClients: risingClients.slice(0,5),
        decliningClients: decliningClients.slice(0,5)
    };
  }, [filteredInvoices, stats]);

  // Handlers
  const handleOpenAddModal = () => {
    setEditingIndex(null); // Reset mode to Add
    setNewInvoiceForm({
        customerName: '',
        invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceDate: new Date().toISOString().split('T')[0],
        invoiceAmount: '',
        status: 'Pending',
        credit: '0'
    });
    setIsAddModalOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice, index: number) => {
    setEditingIndex(index); // Set mode to Edit
    setNewInvoiceForm({
        customerName: invoice.customerName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        invoiceAmount: invoice.invoiceAmount.toString(),
        status: invoice.status,
        credit: invoice.credit.toString()
    });
    setIsAddModalOpen(true);
  };
  
  const handleSaveNewInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSheet) return;
    setSyncing(true);
    try {
        const payload: Invoice = {
            ...newInvoiceForm,
            invoiceAmount: Number(newInvoiceForm.invoiceAmount),
            credit: Number(newInvoiceForm.credit),
            status: newInvoiceForm.status as any
        };

        if (editingIndex !== null) {
            // Call the NEW updateInvoice function for full record edit
            await GraphService.updateInvoice(activeSheet, editingIndex, payload);
        } else {
            // Standard Add Logic
            await GraphService.addInvoices(activeSheet, [payload]);
        }
        
        await refreshData();
        setIsAddModalOpen(false);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setSyncing(false); 
    }
  };
  
  const handleUpdateStatus = async (idx: number, status: string) => { 
      setSyncing(true);
      try { await GraphService.updateInvoiceStatus(activeSheet, idx, status); await refreshData(); } 
      catch(e){console.error(e)} finally { setSyncing(false); }
  };
  
  const handleDelete = async (idx: number) => { 
      setSyncing(true);
      try { await GraphService.deleteInvoice(activeSheet, idx); await refreshData(); } 
      catch(e){console.error(e)} finally { setSyncing(false); }
  };

  const handleLogout = () => {
    if (demoMode) window.location.reload();
    else instance.logoutPopup();
  };

  if (loading) return (
      <div className="h-screen flex flex-col items-center justify-center text-slate-500 bg-slate-50 gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-medium animate-pulse">Loading Financial Data...</p>
      </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-10 hidden md:flex">
         <div className="p-6 border-b border-slate-100 flex items-center gap-3">
             <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-2.5 rounded-xl text-white shadow-lg">
                 <FileSpreadsheet size={22} />
             </div>
             <h1 className="font-bold text-slate-800 tracking-tight text-lg">Excel Intelligence</h1>
         </div>
         
         <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Main Menu</div>
            <button className="w-full flex items-center gap-3 p-3 bg-brand-50 text-brand-700 rounded-lg font-medium transition-colors">
              <Activity size={20} />
              Dashboard
            </button>
            <button className="w-full flex items-center gap-3 p-3 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-lg font-medium transition-colors">
              <Database size={20} />
              Invoices
            </button>
            {/* [ΑΛΛΑΓΗ] Ενεργοποίηση onClick για το Clients */}
            <button 
                onClick={() => setIsClientPopupOpen(true)}
                className="w-full flex items-center gap-3 p-3 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-lg font-medium transition-colors"
            >
              <User size={20} />
              Clients
            </button>
         </nav>

        {/* --- NEW BLUE BUTTON IN SIDEBAR --- */}
        <div className="px-4 pb-4">
            <button 
                onClick={() => setIsHelpModalOpen(true)}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-blue-600/40 transition-all flex items-center justify-center gap-2 group"
            >
                <HelpCircle size={20} className="group-hover:scale-110 transition-transform" />
                <span>How it works</span>
            </button>
        </div>

         <div className="p-4 border-t border-slate-100">
             <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                   {userInitial}
                </div>
                <div className="overflow-hidden">
                   <p className="text-sm font-medium text-slate-700 truncate">{userName}</p>
                   <p className="text-xs text-slate-500 truncate">{demoMode ? "Demo Mode" : "Pro License"}</p>
                </div>
             </div>
             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
               <LogOut size={14} /> Sign Out
             </button>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
            <div className="font-bold text-slate-700 flex items-center gap-2">
                Financial Dashboard
                {syncing && <RefreshCw size={14} className="animate-spin text-slate-400" />}
            </div>
            <div className="flex items-center gap-4">
                 <a 
                    href="https://www.linkedin.com/in/sakis-athan/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#0077b5] text-white text-xs font-bold rounded-lg hover:bg-[#006396] transition-colors"
                 >
                    <Linkedin size={16} /> Connect with me
                 </a>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
             {/* Toolbar / Filters */}
             <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <div className="flex items-center gap-2 w-full md:w-auto relative">
                     <Search size={18} className="absolute left-3 text-slate-400" />
                     <input 
                         type="text" 
                         placeholder="Search client or invoice..." 
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none w-full md:w-64"
                     />
                 </div>
                 
                 <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                     <select 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                     >
                        <option value="all">All Time</option>
                        <option value="this_year">This Year</option>
                        <option value="last_30_days">Last 30 Days</option>
                        <option value="custom">Custom Range</option>
                     </select>
                     
                     <button onClick={handleResetAndRefresh} className="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg" title="Refresh">
                        <RefreshCw size={20} className={syncing ? "animate-spin" : ""} />
                     </button>
                     
                     {/* ADD INVOICE BUTTON */}
                     <button 
                        onClick={handleOpenAddModal} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-95 whitespace-nowrap"
                     >
                        <PlusCircle size={18} /> Add Invoice
                     </button>
                 </div>
             </div>

             {/* Main Views */}
             <KPICards stats={stats} />
             <Analytics invoices={filteredInvoices} aiReport={aiReport} />
             
             <div className="mt-8">
                 <div className="flex items-center justify-between mb-4">
                     <h3 className="font-bold text-slate-700">Recent Transactions</h3>
                     <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{filteredInvoices.length} entries</span>
                 </div>
                 <DataTable 
                    data={filteredInvoices} 
                    isLoading={syncing && invoices.length === 0} 
                    onUpdateStatus={handleUpdateStatus} 
                    onDelete={handleDelete} 
                    onEdit={handleEditInvoice} // Pass the new edit handler
                 />
             </div>
        </div>
      </main>

      {/* POPUP MODAL (Handles Add & Edit) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-slate-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <PlusCircle className="text-emerald-600" size={24} /> 
                        {editingIndex !== null ? 'Edit Invoice' : 'New Invoice'}
                    </h3>
                    <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={24} /></button>
                </div>
                
                <form onSubmit={handleSaveNewInvoice} className="p-6 space-y-4 text-left">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                        <input 
                            required 
                            type="text" 
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                            value={newInvoiceForm.customerName} 
                            onChange={e => setNewInvoiceForm({...newInvoiceForm, customerName: e.target.value})} 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Invoice</label>
                            <input 
                                required 
                                type="text" 
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                                value={newInvoiceForm.invoiceNumber} 
                                onChange={e => setNewInvoiceForm({...newInvoiceForm, invoiceNumber: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                            <input 
                                required 
                                type="date" 
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                                value={newInvoiceForm.invoiceDate} 
                                onChange={e => setNewInvoiceForm({...newInvoiceForm, invoiceDate: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                            <input 
                                required 
                                type="number" 
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                                value={newInvoiceForm.invoiceAmount} 
                                onChange={e => setNewInvoiceForm({...newInvoiceForm, invoiceAmount: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Credit</label>
                            <input 
                                required 
                                type="number" 
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                                value={newInvoiceForm.credit} 
                                onChange={e => setNewInvoiceForm({...newInvoiceForm, credit: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                        <select 
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg outline-none bg-white" 
                            value={newInvoiceForm.status} 
                            onChange={e => setNewInvoiceForm({...newInvoiceForm, status: e.target.value as any})}
                        >
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Overdue">Overdue</option>
                        </select>
                    </div>

                    <div className="flex gap-3 mt-8 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsAddModalOpen(false)} 
                            className="flex-1 py-3 bg-slate-100 rounded-xl text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- REDESIGNED HELP MODAL --- */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header with Slogan */}
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Rocket size={120} />
                    </div>
                    <div className="relative z-10 text-left">
                        <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-4 backdrop-blur-md">
                            <Rocket size={14} /> EXCEL INTELLIGENCE
                        </div>
                        <h2 className="text-3xl font-bold leading-tight mb-2">
                            Stop wasting hours on <br/> boring Excel sheets.
                        </h2>
                        <p className="text-blue-100 font-medium text-lg">
                            Automate your cash flow and grow your business.
                        </p>
                    </div>
                    <button onClick={() => setIsHelpModalOpen(false)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Metrics Explanation Content (Scrollable) */}
                <div className="p-8 overflow-y-auto flex-1 space-y-10 custom-scrollbar">
                    
                    {/* SECTION 1: KPIS */}
                    <section>
                         <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                            <Activity size={20} className="text-blue-600" /> 
                            1. The Dashboard Basics (KPIs)
                        </h3>
                        <p className="text-slate-500 mb-4 text-sm">We simplified complex data into 4 key cards so you know your financial health in seconds.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Total Revenue */}
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-4 text-left">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600">
                                    <DollarSign size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-emerald-900">Total Revenue</h4>
                                    <p className="text-xs text-emerald-700 mt-1 font-medium">Gross Income</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        <span className="font-semibold text-slate-700">What:</span> Sum of all invoices ever created.<br/>
                                        <span className="font-semibold text-slate-700">Why:</span> To see the total volume of business you have generated.
                                    </p>
                                </div>
                            </div>

                            {/* Outstanding */}
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-4 text-left">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-blue-900">Outstanding</h4>
                                    <p className="text-xs text-blue-700 mt-1 font-medium">To be collected</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        <span className="font-semibold text-slate-700">What:</span> Money you have earned but not yet received (Pending + Overdue).<br/>
                                        <span className="font-semibold text-slate-700">Why:</span> This is your potential cash flow.
                                    </p>
                                </div>
                            </div>

                             {/* Pending */}
                             <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-4 text-left">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-amber-600">
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-900">Pending</h4>
                                    <p className="text-xs text-amber-700 mt-1 font-medium">Active Invoices</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        <span className="font-semibold text-slate-700">What:</span> Invoices sent that are not yet due.<br/>
                                        <span className="font-semibold text-slate-700">Why:</span> Tracks expected incoming payments.
                                    </p>
                                </div>
                            </div>

                             {/* Overdue */}
                             <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-4 text-left">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-rose-600">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-rose-900">Overdue</h4>
                                    <p className="text-xs text-rose-700 mt-1 font-medium">Action Needed</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        <span className="font-semibold text-slate-700">What:</span> Invoices that are past their payment date.<br/>
                                        <span className="font-semibold text-slate-700">Why:</span> Immediate attention needed to recover funds.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: FILTERS & NAVIGATION */}
                    <section>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                            <ListFilter size={20} className="text-blue-600" /> 
                            2. Filters & Navigation
                        </h3>
                        <div className="space-y-4">
                             <div className="flex gap-4 items-start text-left">
                                 <div className="bg-slate-100 p-2 rounded text-slate-600"><Search size={18} /></div>
                                 <div>
                                     <h5 className="font-bold text-slate-800">Smart Search</h5>
                                     <p className="text-sm text-slate-500">
                                        <span className="font-semibold">How:</span> Type any Client Name or Invoice Number (e.g., "INV-2024").<br/>
                                        <span className="font-semibold">Why:</span> Instantly find a specific transaction without scrolling through hundreds of rows.
                                     </p>
                                 </div>
                             </div>

                             <div className="flex gap-4 items-start text-left">
                                 <div className="bg-slate-100 p-2 rounded text-slate-600"><Calendar size={18} /></div>
                                 <div>
                                     <h5 className="font-bold text-slate-800">Date Range Dropdown</h5>
                                     <p className="text-sm text-slate-500 mb-2">
                                        <span className="font-semibold">How:</span> Select "Last 30 Days", "This Year", or "Custom Range".<br/>
                                        <span className="font-semibold">Why:</span> Financial data is only useful in context. Use this to isolate Q1 performance or check last month's sales.
                                     </p>
                                 </div>
                             </div>
                        </div>
                    </section>

                    {/* SECTION 3: ACTIONS */}
                    <section>
                         <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                            <MousePointerClick size={20} className="text-blue-600" /> 
                            3. Actions & Excel Sync
                        </h3>
                        <div className="space-y-4">
                            <div className="flex gap-4 items-start text-left">
                                 <div className="bg-slate-100 p-2 rounded text-slate-600"><PlusCircle size={18} /></div>
                                 <div>
                                     <h5 className="font-bold text-slate-800">Add Invoice Button</h5>
                                     <p className="text-sm text-slate-500">
                                        <span className="font-semibold">How:</span> Opens a modal form. Fill in customer details and amount.<br/>
                                        <span className="font-semibold">Why:</span> It writes data <b>directly to your Excel file</b> in OneDrive via Microsoft Graph API. No need to open the heavy Excel app.
                                     </p>
                                 </div>
                             </div>

                             <div className="flex gap-4 items-start text-left">
                                 <div className="bg-slate-100 p-2 rounded text-slate-600"><CheckCircle2 size={18} /></div>
                                 <div>
                                     <h5 className="font-bold text-slate-800">Status Toggles (Table)</h5>
                                     <p className="text-sm text-slate-500">
                                        <span className="font-semibold">How:</span> In the "Actions" column, click the Checkmark or Alert icon.<br/>
                                        <span className="font-semibold">Why:</span> Quickly marks an invoice as "Paid" or "Pending" and updates the background color instantly.
                                     </p>
                                 </div>
                             </div>
                        </div>
                    </section>

                    {/* SECTION 4: AI & ANALYTICS */}
                    <section>
                         <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                            <BarChart3 size={20} className="text-blue-600" /> 
                            4. AI & Analytics
                        </h3>
                        <div className="flex gap-4 items-start mb-4 text-left">
                             <div className="bg-slate-100 p-2 rounded text-slate-600"><Sparkles size={18} /></div>
                             <div>
                                 <h5 className="font-bold text-slate-800">AI Insights Panel (Dark Card)</h5>
                                 <p className="text-sm text-slate-500 mb-2">
                                    <span className="font-semibold">How:</span> Our algorithm analyzes historical payment patterns.<br/>
                                    <span className="font-semibold">Why:</span> To automate decision making.
                                 </p>
                             </div>
                         </div>

                         {/* NEW: Click to Expand explanation */}
                         <div className="flex gap-4 items-start text-left">
                             <div className="bg-slate-100 p-2 rounded text-slate-600"><Maximize2 size={18} /></div>
                             <div>
                                 <h5 className="font-bold text-slate-800">Full Screen Intelligence</h5>
                                 <p className="text-sm text-slate-500">
                                    <span className="font-semibold">Action:</span> <b>Click anywhere</b> on the dark AI Intelligence card.<br/>
                                    <span className="font-semibold">Result:</span> Opens a detailed full-screen view with advanced charts and deeper risk analysis.
                                 </p>
                             </div>
                         </div>
                    </section>

                </div>
                
                <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
                    <button 
                        onClick={() => setIsHelpModalOpen(false)} 
                        className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                    >
                        Got it, thanks!
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* [ΠΡΟΣΘΗΚΗ] Ενεργοποίηση Client Directory Popup */}
      <NamePopup 
        isOpen={isClientPopupOpen} 
        onClose={() => setIsClientPopupOpen(false)} 
        invoices={invoices} 
      />
    </div>
  );
};

export default Dashboard;