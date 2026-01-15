import React, { useMemo, useState } from 'react';
import { Transaction, EntityType, TransactionType, PaymentStatus } from '../types';
import { 
  getFinancialMonth, 
  formatCurrency, 
  getMonthName, 
  navigateMonth, 
  formatDateBr,
  getDaysInMonth,
  getFirstDayOfWeek
} from '../utils/dateHelpers';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  DollarSign, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Sun,
  X,
  TrendingUp,
  PieChart as PieIcon
} from 'lucide-react';
import { Loading } from '../components/Loading';

interface DashboardProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

// Expanded Color Palette for Categories
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#06b6d4', '#f97316'];
const PIE_COLORS_BALANCE = ['#10b981', '#f43f5e']; // Green for Income, Red for Expense

// Investment Palette (Gold/Wealth/Growth tones)
const INV_COLORS = ['#fbbf24', '#8b5cf6', '#3b82f6', '#10b981', '#6366f1', '#f472b6', '#f59e0b'];

type ViewMode = 'DEFAULT' | 'TODAY' | 'CALENDAR';

export const Dashboard: React.FC<DashboardProps> = ({ transactions, isLoading }) => {
  // Determine the default filter to be the current financial month
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const currentRefMonth = getFinancialMonth(today);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentRefMonth);
  const [viewMode, setViewMode] = useState<ViewMode>('DEFAULT');

  // Filter Data based on Month Selection (Standard Dashboard Logic)
  const filteredData = useMemo(() => {
    return transactions.filter(t => t.referenceMonth === selectedMonth);
  }, [transactions, selectedMonth]);

  // Calculate Aggregates
  const stats = useMemo(() => {
    const income = filteredData
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.value, 0);
    const expense = filteredData
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.value, 0);
    return {
      income,
      expense,
      balance: income - expense
    };
  }, [filteredData]);

  // Balance Pie Data
  const balancePieData = [
    { name: 'Entradas', value: stats.income },
    { name: 'Saídas', value: stats.expense },
  ];

  // Category Data (Expenses Only)
  const categoryData = useMemo(() => {
    const expenses = filteredData.filter(t => t.type === TransactionType.EXPENSE && t.category !== 'Investimentos');
    const catMap = new Map<string, number>();
    expenses.forEach(t => {
      const current = catMap.get(t.category) || 0;
      catMap.set(t.category, current + t.value);
    });
    return Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort Descending
  }, [filteredData]);

  // --- INVESTMENT DATA (Current Year) ---
  const investmentData = useMemo(() => {
      // Filter transactions that are categorized as Investments OR typed as Investment
      // AND belong to the current year (based on date string YYYY-MM-DD)
      const yearInvestments = transactions.filter(t => 
        (t.category === 'Investimentos' || t.type === TransactionType.INVESTMENT) &&
        t.date.startsWith(String(currentYear))
      );

      const map = new Map<string, number>();
      yearInvestments.forEach(t => {
          const label = t.subcategory && t.subcategory !== 'Geral' ? t.subcategory : 'Aportes Gerais';
          map.set(label, (map.get(label) || 0) + t.value);
      });

      return Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

  }, [transactions, currentYear]);

  const totalInvestedYear = investmentData.reduce((acc, curr) => acc + curr.value, 0);


  // Helper for Real Calendar View
  const calendarGrid = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const daysCount = getDaysInMonth(year, month); // e.g., 28, 30, 31
    const startDayOfWeek = getFirstDayOfWeek(year, month); // 0 (Sun) to 6 (Sat)

    const grid = [];

    // 1. Add empty slots for days before the 1st
    for (let i = 0; i < startDayOfWeek; i++) {
        grid.push({ type: 'EMPTY', key: `empty-${i}` });
    }

    // 2. Add actual days
    for (let i = 1; i <= daysCount; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      const dayTransactions = transactions.filter(t => t.date === dateStr);
      const dayIncome = dayTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.value, 0);
      const dayExpense = dayTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.value, 0);
      
      grid.push({
        type: 'DAY',
        key: dateStr,
        date: dateStr,
        dayNumber: i,
        income: dayIncome,
        expense: dayExpense,
        hasTrans: dayTransactions.length > 0
      });
    }

    return grid;
  }, [selectedMonth, transactions]);

  // Helper for Today View
  const todayTransactions = useMemo(() => {
    return transactions.filter(t => t.date === today);
  }, [transactions, today]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Header Navigation */}
      <div className="flex flex-col items-center justify-center space-y-4">
        
        {/* Month Navigator */}
        <div className="flex items-center gap-6 bg-white px-6 py-2 rounded-full shadow-sm border border-slate-200">
          <button 
            onClick={() => setSelectedMonth(navigateMonth(selectedMonth, -1))}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="text-center min-w-[140px]">
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
              {getMonthName(selectedMonth)}
            </h2>
            <p className="text-[10px] text-slate-400 font-medium">Ciclo 16 à 15</p>
          </div>

          <button 
            onClick={() => setSelectedMonth(navigateMonth(selectedMonth, 1))}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full max-w-md gap-3">
          <button 
            onClick={() => setViewMode(viewMode === 'TODAY' ? 'DEFAULT' : 'TODAY')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold transition-all ${
              viewMode === 'TODAY' 
              ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-inner' 
              : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 shadow-sm'
            }`}
          >
             <Sun size={18} />
             Hoje
          </button>
          <button 
             onClick={() => setViewMode(viewMode === 'CALENDAR' ? 'DEFAULT' : 'CALENDAR')}
             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold transition-all ${
              viewMode === 'CALENDAR' 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-inner' 
              : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'
            }`}
          >
             <CalendarIcon size={18} />
             Calendário
          </button>
        </div>
      </div>

      {/* 2. Conditional Views */}

      {/* VIEW: TODAY */}
      {viewMode === 'TODAY' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-slate-800 flex items-center gap-2"><Sun size={20} className="text-orange-500"/> Lançamentos de Hoje ({formatDateBr(today)})</h3>
               <button onClick={() => setViewMode('DEFAULT')}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            
            {todayTransactions.length === 0 ? (
               <p className="text-center text-slate-400 py-8">Nenhum lançamento registrado hoje.</p>
            ) : (
              <div className="space-y-3">
                 {todayTransactions.map(t => (
                   <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <p className="font-semibold text-slate-800">{t.description}</p>
                        <p className="text-xs text-slate-500">{t.category} • {t.paymentMethod}</p>
                      </div>
                      <span className={`font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                         {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.value)}
                      </span>
                   </div>
                 ))}
              </div>
            )}
        </div>
      )}

      {/* VIEW: CALENDAR */}
      {viewMode === 'CALENDAR' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4">
               <div>
                 <h3 className="font-bold text-slate-800 flex items-center gap-2"><CalendarIcon size={20} className="text-indigo-500"/> {getMonthName(selectedMonth)}</h3>
                 <p className="text-xs text-slate-400 ml-7">Calendário Civil Completo</p>
               </div>
               <button onClick={() => setViewMode('DEFAULT')}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 md:gap-2">
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                   <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase py-2">{d}</div>
                ))}
                
                {calendarGrid.map((item) => {
                  if (item.type === 'EMPTY') {
                      return <div key={item.key} className="bg-transparent min-h-[60px]"></div>;
                  }

                  const isToday = item.date === today;

                  return (
                    <div key={item.key} className={`min-h-[60px] md:min-h-[80px] p-1 rounded-lg border flex flex-col justify-between transition-colors ${isToday ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}>
                        <span className={`text-xs font-bold self-center md:self-start ${isToday ? 'text-blue-700' : 'text-slate-500'}`}>{item.dayNumber}</span>
                        {item.hasTrans && (
                          <div className="w-full space-y-1 mt-1">
                             {item.income > 0 && (
                                <div className="w-full bg-emerald-100 text-emerald-700 text-[9px] md:text-[10px] px-1 rounded font-bold truncate">
                                   + {formatCurrency(item.income)}
                                </div>
                             )}
                             {item.expense > 0 && (
                                <div className="w-full bg-rose-100 text-rose-700 text-[9px] md:text-[10px] px-1 rounded font-bold truncate">
                                   - {formatCurrency(item.expense)}
                                </div>
                             )}
                          </div>
                        )}
                    </div>
                  );
                })}
            </div>
        </div>
      )}


      {/* VIEW: DEFAULT (Charts & Stats) */}
      {viewMode === 'DEFAULT' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Balanço Mensal (Pie Chart Card) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-0 overflow-hidden">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">Balanço Mensal</h3>
                 <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${stats.balance >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                     {stats.balance >= 0 ? <ArrowUpCircle size={14}/> : <ArrowDownCircle size={14}/>}
                     {formatCurrency(stats.balance)}
                 </div>
             </div>
             
             <div className="flex flex-col md:flex-row items-center p-6 gap-6">
                 {/* Chart */}
                 <div className="relative flex-shrink-0 min-w-0" style={{ width: 160, height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={balancePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {balancePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS_BALANCE[index]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <span className="text-[10px] font-bold text-slate-400">RESUMO</span>
                    </div>
                 </div>

                 {/* Legend / Stats */}
                 <div className="flex-1 w-full space-y-3">
                    <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span className="text-sm font-medium text-emerald-900">Entradas</span>
                        </div>
                        <span className="font-bold text-emerald-700">{formatCurrency(stats.income)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-rose-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                            <span className="text-sm font-medium text-rose-900">Saídas</span>
                        </div>
                        <span className="font-bold text-rose-700">{formatCurrency(stats.expense)}</span>
                    </div>
                 </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Expenses by Category (Existing) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[320px] flex flex-col">
              <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <PieIcon size={18} /> Despesas por Categoria
              </h3>
              {categoryData.length > 0 ? (
                <div className="w-full flex-1 min-h-0" style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => formatCurrency(val)} />
                      <Legend 
                        layout="vertical" 
                        align="right" 
                        verticalAlign="middle" 
                        wrapperStyle={{fontSize: '11px', paddingLeft: '10px'}} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Sem despesas registradas neste mês.
                </div>
              )}
            </div>

            {/* 2. Investments (New) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[320px] flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-start mb-4 z-10 relative">
                  <div>
                      <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                          <TrendingUp size={18} className="text-amber-500"/> Investimentos do Ano
                      </h3>
                      <p className="text-xs text-slate-400">{currentYear}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase">Total Aportado</p>
                      <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalInvestedYear)}</p>
                  </div>
              </div>
              
              {investmentData.length > 0 ? (
                <div className="w-full flex-1 min-h-0 relative z-10" style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={investmentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {investmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={INV_COLORS[index % INV_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => formatCurrency(val)} />
                      <Legend 
                        layout="vertical" 
                        align="right" 
                        verticalAlign="middle" 
                        wrapperStyle={{fontSize: '11px', paddingLeft: '10px'}} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                   {/* Center Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pl-14 lg:pl-0">
                       <span className="text-xs font-bold text-slate-400">{currentYear}</span>
                    </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm relative z-10">
                  <TrendingUp size={40} className="mb-2 opacity-20"/>
                  <p>Nenhum aporte registrado em {currentYear}.</p>
                </div>
              )}
              
              {/* Decorative Background */}
              <div className="absolute -bottom-10 -right-10 opacity-5">
                   <TrendingUp size={200} />
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};