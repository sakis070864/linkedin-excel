import React, { useState, useMemo } from 'react';
import { Invoice } from '../types';
import { Check, AlertCircle, Trash2, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface DataTableProps {
  data: Invoice[];
  isLoading: boolean;
  onUpdateStatus: (rowIndex: number, newStatus: string) => void;
  onDelete: (rowIndex: number) => void;
  onEdit?: (invoice: Invoice, index: number) => void; // Prop gia to double click edit
}

type SortKey = keyof Invoice;
type SortDirection = 'asc' | 'desc';

const DataTable: React.FC<DataTableProps> = ({ data, isLoading, onUpdateStatus, onDelete, onEdit }) => {
  // State for Delete Modal
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);
  
  // State for Sorting
  const [sortConfig, setSortConfig] = useState<{ key: SortKey | null; direction: SortDirection }>({ 
    key: null, 
    direction: 'asc' 
  });

  // Handle Sort Click
  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Sort Data Logic
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      // Handle undefined/null safety
      if (aValue === undefined || bValue === undefined) return 0;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [data, sortConfig]);

  const confirmDelete = () => {
    if (invoiceToDelete !== null) {
        onDelete(invoiceToDelete);
        setInvoiceToDelete(null); 
    }
  };

  const cancelDelete = () => {
    setInvoiceToDelete(null);
  };

  // Helper to render sortable table headers
  const SortableHeader = ({ label, sortKey, align = 'left' }: { label: string, sortKey: SortKey, align?: 'left' | 'right' | 'center' }) => {
    const isActive = sortConfig.key === sortKey;
    
    return (
      <th 
        className={`px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group select-none ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
          <span className={isActive ? 'text-brand-700 font-bold' : ''}>{label}</span>
          <div className="flex flex-col items-center justify-center w-4 h-4">
            {isActive ? (
               sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-brand-600" /> : <ArrowDown size={14} className="text-brand-600" />
            ) : (
               <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
            )}
          </div>
        </div>
      </th>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium">Syncing with Excel...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-white rounded-lg shadow-sm border border-dashed border-slate-300">
        <div className="text-center text-slate-500">
          <p>No data found matching your filters.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'overdue': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative flex flex-col">
        {/* Container with max-height for roughly 10 rows and scrollbars */}
        <div className="overflow-auto max-h-[550px] w-full">
          <table className="w-full text-left text-sm border-collapse">
            {/* Sticky Header */}
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 w-12 text-center text-slate-400">#</th>
                
                {/* SORTABLE HEADERS */}
                <SortableHeader label="Customer" sortKey="customerName" />
                <th className="px-6 py-4">Invoice #</th>
                <SortableHeader label="Date" sortKey="invoiceDate" />
                <SortableHeader label="Amount" sortKey="invoiceAmount" align="right" />
                <SortableHeader label="Credit" sortKey="credit" align="right" />
                
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedData.map((invoice, idx) => (
                <tr 
                  key={invoice.id || idx} 
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                  onDoubleClick={() => onEdit && onEdit(invoice, invoice.rowIndex ?? idx)}
                  title="Double click to edit"
                >
                  <td className="px-6 py-3 text-center text-slate-400 font-mono text-xs">{(invoice.rowIndex ?? idx) + 1}</td>
                  <td className="px-6 py-3 font-medium text-slate-900">{invoice.customerName}</td>
                  <td className="px-6 py-3 text-slate-500 font-mono text-xs">{invoice.invoiceNumber}</td>
                  <td className="px-6 py-3 text-slate-500">{invoice.invoiceDate}</td>
                  <td className="px-6 py-3 text-right font-medium text-slate-900">
                    ${invoice.invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-500">
                    ${invoice.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                      <div className="flex justify-center gap-2">
                          {/* Status Toggle Button */}
                          {invoice.status !== 'Paid' && (
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onUpdateStatus(invoice.rowIndex ?? idx, 'Paid'); }}
                                  title="Mark as Paid"
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              >
                                  <Check size={16} />
                              </button>
                          )}
                          {invoice.status === 'Paid' && (
                               <button 
                               onClick={(e) => { e.stopPropagation(); onUpdateStatus(invoice.rowIndex ?? idx, 'Pending'); }}
                               title="Mark as Pending"
                               className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                           >
                               <AlertCircle size={16} />
                           </button>
                          )}

                          {/* Delete Button - Opens Modal */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setInvoiceToDelete(invoice.rowIndex ?? idx); }}
                            title="Delete Invoice"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {invoiceToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200">
                <AlertTriangle className="text-rose-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Invoice?</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Are you sure you want to delete this invoice? <br/>
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 shadow-md shadow-rose-500/30 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DataTable;