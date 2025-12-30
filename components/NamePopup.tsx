import React, { useMemo } from 'react';
import { X, User, Users, DollarSign } from 'lucide-react';
import { Invoice } from '../types'; //

interface NamePopupProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[]; //
}

const NamePopup: React.FC<NamePopupProps> = ({ isOpen, onClose, invoices = [] }) => {
  
  // Υπολογισμός μοναδικών πελατών και των συνολικών ποσών τους
  const customerSummary = useMemo(() => {
    if (!invoices || !Array.isArray(invoices)) return []; 
    
    // Δημιουργία αντικειμένου για τη συγκέντρωση των ποσών
    const totalsMap = invoices.reduce((acc, inv) => {
      const name = inv.customerName;
      const amount = inv.invoiceAmount || 0; //
      
      if (!acc[name]) {
        acc[name] = 0;
      }
      acc[name] += amount;
      return acc;
    }, {} as Record<string, number>);

    // Μετατροπή σε πίνακα αντικειμένων και ταξινόμηση αλφαβητικά
    return Object.entries(totalsMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl shadow-sm">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Client Directory</h3>
              <p className="text-xs text-slate-500 font-medium">
                {(customerSummary || []).length} Unique Customers
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Λίστα με Ονόματα και Ποσά */}
        <div className="p-4 max-h-[450px] overflow-y-auto custom-scrollbar">
          {(customerSummary || []).length > 0 ? (
            <div className="space-y-1">
              {customerSummary.map((client, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 hover:bg-blue-50/50 rounded-xl transition-colors group cursor-default border border-transparent hover:border-blue-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:text-blue-600 group-hover:shadow-sm transition-all font-bold text-xs">
                      {client.name ? client.name.charAt(0) : '?'}
                    </div>
                    <span className="font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">
                      {client.name}
                    </span>
                  </div>
                  
                  {/* Εμφάνιση Συνολικού Ποσού */}
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Total</p>
                    <p className="text-sm font-bold text-emerald-600">
                      ${client.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                <User size={24} />
              </div>
              <p className="text-slate-400 text-sm font-medium">No customers found in records.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/80">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
          >
            Close Directory
          </button>
        </div>

      </div>
    </div>
  );
};

export default NamePopup;