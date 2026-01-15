import React, { useState, useMemo } from 'react';
import { RecurringExpense, Transaction, TransactionType, EntityType, PaymentStatus, PaymentMethodType, Account, Card } from '../types';
import { formatCurrency, getFinancialMonth, formatDateBr } from '../utils/dateHelpers';
import { Plus, CheckCircle2, AlertCircle, Home, X, Calendar, ListTodo, ShoppingBag, ArrowUpRight, CreditCard, Banknote, PieChart as PieChartIcon, Trash2, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Loading } from '../components/Loading';

interface FamilyManagementProps {
  expenses: RecurringExpense[];
  transactions: Transaction[];
  accounts: Account[];
  cards: Card[];
  onAddExpense: (expense: RecurringExpense) => void;
  onPayExpense: (transactions: Transaction[]) => void;
  onDeleteExpense: (id: string) => void;
  isLoading?: boolean;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export const FamilyManagement: React.FC<FamilyManagementProps> = ({ 
  expenses, 
  transactions, 
  accounts,
  cards,
  onAddExpense, 
  onPayExpense,
  onDeleteExpense,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState<'FIXED' | 'VARIABLE'>('FIXED');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<RecurringExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<RecurringExpense | null>(null);

  const [newExpenseData, setNewExpenseData] = useState({
    name: '',
    value: '',
    dueDay: '',
    category: 'Moradia',
    paymentMethodType: PaymentMethodType.PIX,
  });

  const [paymentData, setPaymentData] = useState({
    value: '',
    feeValue: '', // Fee for credit card payments (99pay)
    paymentMethodType: PaymentMethodType.PIX,
    selectedAccountId: '',
    selectedCardId: '',
    date: new Date().toISOString().split('T')[0]
  });

  const currentRefMonth = getFinancialMonth(new Date().toISOString().split('T')[0]);

  // --- CALCULATION LOGIC ---

  // 1. Fixed Expenses Logic
  const expensesStatus = useMemo(() => {
    return expenses.map(expense => {
      // Find ANY transaction for this expense in current month (Paid or Pending)
      const existingTransaction = transactions.find(t => 
        t.entityId === EntityType.FAMILY &&
        t.type === TransactionType.EXPENSE &&
        t.referenceMonth === currentRefMonth &&
        (t.subcategory === 'Despesa Fixa') && 
        t.description.toLowerCase().includes(expense.name.toLowerCase())
      );

      return { 
          ...expense, 
          isPaid: existingTransaction?.status === PaymentStatus.PAID,
          isPending: existingTransaction?.status === PaymentStatus.PENDING,
          transactionId: existingTransaction?.id
      };
    });
  }, [expenses, transactions, currentRefMonth]);

  // 2. Variable Expenses Logic
  const variableTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.entityId === EntityType.FAMILY &&
      t.type === TransactionType.EXPENSE &&
      t.referenceMonth === currentRefMonth &&
      t.subcategory !== 'Despesa Fixa' // Exclude fixed expenses
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentRefMonth]);

  // 3. Totals
  const totalFixedBudget = expenses.reduce((acc, curr) => acc + curr.value, 0);
  const totalFixedPaid = expensesStatus.filter(e => e.isPaid).reduce((acc, curr) => acc + curr.value, 0);
  
  const totalVariablePaid = variableTransactions.reduce((acc, curr) => acc + curr.value, 0);
  
  const totalSpentMonth = totalFixedPaid + totalVariablePaid;

  // 4. Chart Data (Variable Expenses by Category)
  const categoryChartData = useMemo(() => {
    const map = new Map<string, number>();
    variableTransactions.forEach(t => {
        const current = map.get(t.category) || 0;
        map.set(t.category, current + t.value);
    });
    return Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Sort desc
  }, [variableTransactions]);


  // --- HANDLERS ---

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const expense: RecurringExpense = {
      id: Math.random().toString(36).substr(2, 9),
      name: newExpenseData.name,
      value: parseFloat(newExpenseData.value),
      dueDay: parseInt(newExpenseData.dueDay),
      category: newExpenseData.category,
      paymentMethodType: newExpenseData.paymentMethodType
    };
    onAddExpense(expense);
    setIsAddModalOpen(false);
    setNewExpenseData({ name: '', value: '', dueDay: '', category: 'Moradia', paymentMethodType: PaymentMethodType.PIX });
  };

  const handleOpenPayModal = (expense: RecurringExpense) => {
    // Determine the correct date based on Financial Month cycle (16-15)
    // Ref: 2024-02. If dueDay >= 16, it belongs to Jan. If dueDay < 16, belongs to Feb.
    const [yearStr, monthStr] = currentRefMonth.split('-');
    let targetYear = parseInt(yearStr);
    let targetMonth = parseInt(monthStr);

    if (expense.dueDay >= 16) {
        targetMonth = targetMonth - 1;
        if (targetMonth === 0) {
            targetMonth = 12;
            targetYear = targetYear - 1;
        }
    }
    const calculatedDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(expense.dueDay).padStart(2, '0')}`;

    setSelectedExpense(expense);
    setPaymentData({
      value: expense.value.toString(),
      feeValue: '',
      paymentMethodType: expense.paymentMethodType,
      selectedAccountId: '',
      selectedCardId: '',
      date: calculatedDate
    });
  };

  const handleGeneratePendingTransactions = () => {
    const pendingToCreate: Transaction[] = [];
    const [yearStr, monthStr] = currentRefMonth.split('-');
    const refYear = parseInt(yearStr);
    const refMonth = parseInt(monthStr);

    expensesStatus.forEach(exp => {
        // If no transaction exists (neither Paid nor Pending)
        if (!exp.isPaid && !exp.isPending) {
            
            // Calculate Correct Date
            let targetYear = refYear;
            let targetMonth = refMonth;

            if (exp.dueDay >= 16) {
                targetMonth = targetMonth - 1;
                if (targetMonth === 0) {
                    targetMonth = 12;
                    targetYear = targetYear - 1;
                }
            }
            const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(exp.dueDay).padStart(2, '0')}`;

            pendingToCreate.push({
                id: Math.random().toString(36).substr(2, 9),
                entityId: EntityType.FAMILY,
                type: TransactionType.EXPENSE,
                value: exp.value,
                category: exp.category,
                subcategory: 'Despesa Fixa',
                paymentMethod: 'Pendente',
                paymentMethodType: exp.paymentMethodType, // Use default preference
                status: PaymentStatus.PENDING,
                date: dateStr,
                referenceMonth: currentRefMonth,
                description: exp.name,
                installmentCurrent: 1,
                installmentTotal: 1
            });
        }
    });

    if (pendingToCreate.length > 0) {
        onPayExpense(pendingToCreate); // Reusing this function as it adds transactions
    }
  };

  const confirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;

    // Check if we are updating an existing PENDING transaction or creating a new one
    // For simplicity in this logic, we are creating a new one. 
    // Ideally, we should check if a Pending one exists and update it, but handling that via 'onPayExpense' (which is 'addTransaction') appends.
    // To fix this without complex backend logic: If user pays via this modal, we assume they are settling it. 
    // If a PENDING transaction exists, the user should ideally click "Pay" on the Transactions view, but here we enforce a new record.
    // *In a real app, we would update by ID.*

    let methodLabel = 'Pix/Dinheiro';
    if (paymentData.paymentMethodType === PaymentMethodType.CREDIT_CARD) {
        const c = cards.find(card => card.id === paymentData.selectedCardId);
        methodLabel = c ? `Cartão: ${c.name}` : 'Cartão de Crédito';
    } else if (paymentData.paymentMethodType === PaymentMethodType.PIX) {
        methodLabel = 'Pix / Débito';
    }

    const transactionsToCreate: Transaction[] = [];

    // 1. Main Expense
    const mainTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      entityId: EntityType.FAMILY,
      type: TransactionType.EXPENSE,
      value: parseFloat(paymentData.value),
      category: selectedExpense.category,
      subcategory: 'Despesa Fixa', 
      paymentMethod: methodLabel,
      paymentMethodType: paymentData.paymentMethodType,
      
      accountId: paymentData.paymentMethodType !== PaymentMethodType.CREDIT_CARD ? paymentData.selectedAccountId : undefined,
      cardId: paymentData.paymentMethodType === PaymentMethodType.CREDIT_CARD ? paymentData.selectedCardId : undefined,

      status: paymentData.paymentMethodType === PaymentMethodType.CREDIT_CARD ? PaymentStatus.PENDING : PaymentStatus.PAID,
      date: paymentData.date,
      referenceMonth: getFinancialMonth(paymentData.date),
      description: selectedExpense.name,
      installmentCurrent: 1,
      installmentTotal: 1
    };
    transactionsToCreate.push(mainTransaction);

    // 2. Fee Transaction (if applicable)
    const feeVal = parseFloat(paymentData.feeValue) || 0;
    if (feeVal > 0 && paymentData.paymentMethodType === PaymentMethodType.CREDIT_CARD) {
        transactionsToCreate.push({
            id: Math.random().toString(36).substr(2, 9),
            entityId: EntityType.FAMILY,
            type: TransactionType.EXPENSE,
            value: feeVal,
            category: 'Taxas',
            subcategory: 'Taxa App Pagamento',
            paymentMethod: methodLabel,
            paymentMethodType: PaymentMethodType.CREDIT_CARD,
            cardId: paymentData.selectedCardId,
            status: PaymentStatus.PENDING,
            date: paymentData.date,
            referenceMonth: getFinancialMonth(paymentData.date),
            description: `Taxa App - ${selectedExpense.name}`,
            installmentCurrent: 1,
            installmentTotal: 1
        });
    }

    onPayExpense(transactionsToCreate);
    setSelectedExpense(null);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
        onDeleteExpense(expenseToDelete.id);
        setExpenseToDelete(null);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gestão Familiar</h2>
          <p className="text-slate-500 text-sm">Controle de orçamento doméstico ({currentRefMonth})</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleGeneratePendingTransactions}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all justify-center"
                title="Gerar contas pendentes para as despesas que ainda não têm lançamento no mês"
            >
                <RefreshCw size={18} />
                <span className="hidden md:inline">Sincronizar Mês</span>
                <span className="md:hidden">Sync</span>
            </button>
            <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all justify-center"
            >
            <Plus size={18} />
            <span className="hidden md:inline">Nova Despesa Fixa</span>
            <span className="md:hidden">Nova</span>
            </button>
        </div>
      </div>

      {/* Summary Cards (Updated) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Fixed Budget */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-slate-500 text-xs font-bold uppercase mb-1">Orçamento Fixo (Previsto)</p>
                <div className="flex items-baseline gap-2">
                   <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totalFixedBudget)}</h3>
                </div>
                <div className="mt-2 text-xs flex items-center gap-1 text-slate-400">
                    <ListTodo size={12}/> {expensesStatus.filter(e => !e.isPaid).length} pendentes
                </div>
            </div>
            <div className="absolute right-[-10px] bottom-[-10px] text-slate-100 opacity-50">
                <Home size={80} />
            </div>
        </div>

        {/* Card 2: Variable Spending */}
        <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-blue-600 text-xs font-bold uppercase mb-1">Gasto Variável (Mês)</p>
                <h3 className="text-2xl font-bold text-blue-700">{formatCurrency(totalVariablePaid)}</h3>
                 <div className="mt-2 text-xs flex items-center gap-1 text-blue-400">
                    <ShoppingBag size={12}/> {variableTransactions.length} lançamentos
                </div>
            </div>
            <div className="absolute right-[-10px] bottom-[-10px] text-blue-50 opacity-50">
                <ShoppingBag size={80} />
            </div>
        </div>

        {/* Card 3: Total Spent */}
        <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-orange-600 text-xs font-bold uppercase mb-1">Total Gasto (Fixo + Var)</p>
                <h3 className="text-2xl font-bold text-orange-700">{formatCurrency(totalSpentMonth)}</h3>
                <div className="mt-2 text-xs flex items-center gap-1 text-orange-400">
                    <ArrowUpRight size={12}/> Saídas totais
                </div>
            </div>
             <div className="absolute right-[-10px] bottom-[-10px] text-orange-50 opacity-50">
                <AlertCircle size={80} />
            </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex gap-2 border-b border-slate-200 mt-2">
          <button 
            onClick={() => setActiveTab('FIXED')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'FIXED' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Home size={16} /> Despesas Fixas
          </button>
          <button 
            onClick={() => setActiveTab('VARIABLE')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'VARIABLE' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <ShoppingBag size={16} /> Despesas Variáveis
          </button>
      </div>

      {/* --- TAB CONTENT: FIXED EXPENSES --- */}
      {activeTab === 'FIXED' && (
          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {expensesStatus.map(expense => (
                    <div key={expense.id} className={`bg-white rounded-xl border shadow-sm p-5 transition-all relative group ${expense.isPaid ? 'border-emerald-200 bg-emerald-50/30' : expense.isPending ? 'border-orange-200 bg-orange-50/30' : 'border-slate-200 hover:border-emerald-200'}`}>
                        
                        {/* Delete Button (Visible on Hover/Mobile) */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setExpenseToDelete(expense); }}
                            className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors p-1"
                            title="Excluir Despesa"
                        >
                            <Trash2 size={16} />
                        </button>

                        <div className="flex justify-between items-start mb-3 pr-8">
                            <div>
                                <h4 className="font-bold text-slate-800 text-lg">{expense.name}</h4>
                                <p className="text-xs text-slate-500">{expense.category}</p>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Calendar size={14} />
                                <span>Dia {expense.dueDay}</span>
                            </div>
                            <div className="text-xl font-bold text-slate-700">
                                {formatCurrency(expense.value)}
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between gap-3">
                             <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${expense.isPaid ? 'bg-emerald-100 text-emerald-700' : expense.isPending ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                                {expense.isPaid ? 'Pago' : expense.isPending ? 'Pendente' : 'Aberto'}
                            </div>

                            {/* Logic: If Pending or Paid, we generally don't show Pay button, unless we want to allow re-paying (which creates dups currently). 
                                Better: If Open, show Pay. If Pending, show "Settler" or just indicate it's in transactions. 
                                For this MVP: If Paid, show Paid. If Pending/Open, allows Paying (which settles it). 
                            */}
                            
                            {!expense.isPaid && (
                                <button 
                                    onClick={() => handleOpenPayModal(expense)}
                                    className={`flex-1 py-2 rounded-lg text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 ${expense.isPending ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                >
                                    <CheckCircle2 size={16} /> {expense.isPending ? 'Quitar' : 'Pagar'}
                                </button>
                            )}
                            
                            {expense.isPaid && (
                                <div className="flex-1 py-2 rounded-lg bg-emerald-100 text-emerald-700 font-medium text-sm flex items-center justify-center gap-2 cursor-default">
                                    <CheckCircle2 size={16} /> Pago
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {expensesStatus.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                        <p>Nenhuma despesa fixa cadastrada.</p>
                        <button onClick={() => setIsAddModalOpen(true)} className="text-emerald-600 font-bold hover:underline mt-2">Adicionar Primeira</button>
                    </div>
                )}
            </div>
         </div>
      )}

      {/* --- TAB CONTENT: VARIABLE EXPENSES --- */}
      {activeTab === 'VARIABLE' && (
          <div className="space-y-6 mt-4 animate-in fade-in slide-in-from-right-2 duration-300">
             
             {/* Chart Section */}
             {variableTransactions.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1 w-full relative min-w-0" style={{ height: 250 }}>
                        <h4 className="absolute top-0 left-0 text-sm font-bold text-slate-600 flex items-center gap-2"><PieChartIcon size={16}/> Distribuição por Categoria</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '12px'}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Top Categories List */}
                    <div className="w-full md:w-1/3 space-y-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                        <h5 className="text-xs font-bold text-slate-400 uppercase">Top Gastos Variáveis</h5>
                        {categoryChartData.slice(0, 4).map((cat, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                                    <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                                </div>
                                <span className="text-sm font-bold text-slate-800">{formatCurrency(cat.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
             )}

             {/* Table Section */}
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">Data</th>
                                <th className="px-6 py-4 font-medium">Descrição</th>
                                <th className="px-6 py-4 font-medium">Categoria</th>
                                <th className="px-6 py-4 font-medium">Pagamento</th>
                                <th className="px-6 py-4 font-medium text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {variableTransactions.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400"/>
                                            {formatDateBr(t.date)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {t.description}
                                        <div className="text-[10px] text-slate-400">{t.installmentTotal && t.installmentTotal > 1 ? `Parcela ${t.installmentCurrent}/${t.installmentTotal}` : ''}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                            {t.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            {t.paymentMethodType === PaymentMethodType.CREDIT_CARD ? <CreditCard size={14}/> : <Banknote size={14}/>}
                                            {t.paymentMethod}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-rose-600">
                                        - {formatCurrency(t.value)}
                                    </td>
                                </tr>
                            ))}
                             {variableTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        Nenhuma despesa variável lançada neste mês.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200">
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-right font-bold text-slate-600 uppercase text-xs tracking-wider">Total Variável</td>
                                <td className="px-6 py-4 text-right font-bold text-rose-700 text-lg">{formatCurrency(totalVariablePaid)}</td>
                            </tr>
                        </tfoot>
                     </table>
                 </div>
             </div>
          </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Nova Despesa Fixa</h3>
                    <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Despesa</label>
                        <input required type="text" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ex: Internet, Aluguel" value={newExpenseData.name} onChange={e => setNewExpenseData({...newExpenseData, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Valor Estimado (R$)</label>
                        <input required type="number" step="0.01" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" value={newExpenseData.value} onChange={e => setNewExpenseData({...newExpenseData, value: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Dia de Vencimento</label>
                        <input required type="number" min="1" max="31" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" value={newExpenseData.dueDay} onChange={e => setNewExpenseData({...newExpenseData, dueDay: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                        <select className="w-full border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-emerald-500 outline-none" value={newExpenseData.category} onChange={e => setNewExpenseData({...newExpenseData, category: e.target.value})}>
                            <option value="Alimentação">Alimentação</option>
                            <option value="Contas de Consumo">Contas de Consumo</option>
                            <option value="Donativo">Donativo</option>
                            <option value="Educação">Educação</option>
                            <option value="Insumos">Insumos</option>
                            <option value="Investimentos">Investimentos</option>
                            <option value="Lazer">Lazer</option>
                            <option value="Moradia">Moradia</option>
                            <option value="Pessoais">Pessoais</option>
                            <option value="Saúde">Saúde</option>
                            <option value="Transporte">Transporte</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg mt-2">Salvar Despesa</button>
                </form>
            </div>
        </div>
      )}

      {/* Pay Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-emerald-600 p-4 flex justify-between items-center text-white rounded-t-xl">
                    <h3 className="font-bold flex items-center gap-2"><CheckCircle2 /> Registrar Pagamento</h3>
                    <button onClick={() => setSelectedExpense(null)} className="hover:text-emerald-100"><X size={24} /></button>
                </div>
                <form onSubmit={confirmPayment} className="p-6 space-y-4">
                    <div className="bg-emerald-50 p-3 rounded border border-emerald-100">
                        <p className="text-xs text-emerald-800 font-bold uppercase">{selectedExpense.name}</p>
                        <p className="text-2xl font-bold text-emerald-700">{formatCurrency(parseFloat(paymentData.value || '0'))}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Valor Final</label>
                        <input required type="number" step="0.01" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" value={paymentData.value} onChange={e => setPaymentData({...paymentData, value: e.target.value})} />
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Forma de Pagamento</label>
                         <select className="w-full border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-emerald-500 outline-none" value={paymentData.paymentMethodType} onChange={e => setPaymentData({...paymentData, paymentMethodType: e.target.value as PaymentMethodType})}>
                             <option value={PaymentMethodType.PIX}>Pix / Débito / Dinheiro</option>
                             <option value={PaymentMethodType.CREDIT_CARD}>Cartão de Crédito</option>
                         </select>
                    </div>

                    {paymentData.paymentMethodType === PaymentMethodType.PIX && (
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Conta de Saída</label>
                             <select required className="w-full border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-emerald-500 outline-none" value={paymentData.selectedAccountId} onChange={e => setPaymentData({...paymentData, selectedAccountId: e.target.value})}>
                                 <option value="">Selecione...</option>
                                 {accounts.map(acc => (
                                     <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                                 ))}
                             </select>
                        </div>
                    )}

                    {paymentData.paymentMethodType === PaymentMethodType.CREDIT_CARD && (
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cartão</label>
                                <select required className="w-full border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-emerald-500 outline-none" value={paymentData.selectedCardId} onChange={e => setPaymentData({...paymentData, selectedCardId: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {cards.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                             </div>
                             
                             {/* FEE INPUT */}
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Taxa Pagamento (App/99)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">R$</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        className="w-full border border-slate-300 rounded-lg pl-8 p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="0.00"
                                        value={paymentData.feeValue}
                                        onChange={e => setPaymentData({...paymentData, feeValue: e.target.value})}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Se houver, será criado um lançamento separado de "Taxas".</p>
                             </div>
                        </div>
                    )}

                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg mt-2">Confirmar</button>
                </form>
             </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                    <Trash2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Despesa?</h3>
                <p className="text-sm text-slate-500 mb-6">
                    Você tem certeza que deseja remover <strong>{expenseToDelete.name}</strong> da lista de despesas fixas?
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setExpenseToDelete(null)}
                        className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 shadow-lg shadow-red-900/20"
                    >
                        Sim, Excluir
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};