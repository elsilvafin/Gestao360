import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, EntityType, TransactionType, PaymentStatus, PaymentMethodType, Card, Account } from '../types';
import { getFinancialMonth, formatCurrency, formatDateBr, addMonths } from '../utils/dateHelpers';
import { Plus, X, CreditCard, Banknote, ArrowRightLeft, ArrowRight, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Loading } from '../components/Loading';

interface TransactionsProps {
  transactions: Transaction[];
  cards: Card[];
  accounts: Account[];
  onAddTransaction: (t: Transaction[]) => void;
  isLoading?: boolean;
}

// Structured Expense Categories with Subcategories
const EXPENSE_STRUCTURE: Record<string, string[]> = {
    'Alimentação': ['Delivery', 'Lanchonete/Café', 'Marmita', 'Restaurante', 'Supermercado/Varejão'],
    'Contas de Consumo': ['Água', 'Celular Recarga', 'Energia', 'Gás', 'Internet'],
    'Donativo': ['Geral'],
    'Educação': ['Livros', 'Mensalidade'],
    'Insumos': ['Equipamentos Limpeza', 'Ferramentas Manutenção', 'Combustível Trabalho', 'Uniforme', 'EPI', 'MEI'],
    'Investimentos': ['Ações', "Fii's", 'Reits', 'Stocks', 'Reserva Emergência', 'Tesouro', 'Cripto', 'Outros'],
    'Lazer': ['Diversão', 'Passeios', 'Streamings', 'Viagens'],
    'Moradia': ['Financiamento', 'IPTU', 'Manutenção', 'Decoração', 'Reforma'],
    'Pessoais': ['Cabelo', 'Produtos', 'Roupas', 'Sapatos', 'Acessórios'],
    'Saúde': ['Academia', 'Consultas', 'Farmácia', 'Convênio', 'Dentista', 'Exames'],
    'Taxas': ['Geral', 'Juros/Multa', 'Taxa App Pagamento'],
    'Transporte': ['Combustível', 'Estacionamento', 'IPVA', 'Licenciamento', 'Lavagem', 'Manutenção', 'Pedágio', 'Parcela', 'Público', 'Uber'],
    'Outros': ['Geral']
};

const INCOME_CATEGORIES = [
    'Equipe da Piscina - Limpeza', 'Equipe da Piscina - Manutenção',
    'Extra Produtos', 'Extra Chocolê', 'Extra Uber', 'Investimentos - Proventos'
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#06b6d4', '#f97316', '#64748b'];

export const Transactions: React.FC<TransactionsProps> = ({ transactions, cards, accounts, onAddTransaction, isLoading }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    value: '',
    feeValue: '', // New field for Payment App Fees (99pay, etc)
    type: TransactionType.EXPENSE,
    entityId: EntityType.FAMILY,
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    subcategory: '', 
    
    // Payment / Transfer details
    paymentMethodType: PaymentMethodType.CREDIT_CARD,
    selectedCardId: '',
    installments: 1,
    selectedAccountId: '', 
    targetAccountId: '', 
  });

  // Reset subcategory when category changes
  const availableSubcategories = useMemo(() => {
      if (formData.type === TransactionType.EXPENSE && formData.category && EXPENSE_STRUCTURE[formData.category]) {
          return EXPENSE_STRUCTURE[formData.category];
      }
      return [];
  }, [formData.category, formData.type]);

  // --- CHART DATA CALCULATION ---
  const expenseChartData = useMemo(() => {
    // Filter only Expenses for the chart
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
    const map = new Map<string, number>();

    expenses.forEach(t => {
      const current = map.get(t.category) || 0;
      map.set(t.category, current + t.value);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort Descending
  }, [transactions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const baseValue = parseFloat(formData.value);
    const feeVal = parseFloat(formData.feeValue) || 0;
    const numInstallments = formData.installments;
    const installmentValue = baseValue / numInstallments;
    
    let methodLabel = '';
    let initialStatus = PaymentStatus.PENDING;

    // Logic for Transfer
    if (formData.type === TransactionType.TRANSFER) {
        methodLabel = 'Transferência Interna';
        initialStatus = PaymentStatus.PAID;
    } 
    // Logic for Payment Methods
    else {
        if (formData.paymentMethodType === PaymentMethodType.CREDIT_CARD) {
            const card = cards.find(c => c.id === formData.selectedCardId);
            methodLabel = card ? `Cartão: ${card.name}` : 'Cartão de Crédito';
            initialStatus = PaymentStatus.PENDING;
        } else if (formData.paymentMethodType === PaymentMethodType.PIX) {
            methodLabel = 'Pix / Débito';
            initialStatus = PaymentStatus.PAID;
        } else if (formData.paymentMethodType === PaymentMethodType.CASH) {
            methodLabel = 'Dinheiro Físico';
            initialStatus = PaymentStatus.PAID;
        }
    }

    const newTransactions: Transaction[] = [];

    // 1. Create Main Transactions (Installments if applicable)
    for (let i = 0; i < numInstallments; i++) {
        const dateStr = i === 0 ? formData.date : addMonths(formData.date, i);
        
        newTransactions.push({
            id: Math.random().toString(36).substr(2, 9),
            entityId: formData.entityId,
            type: formData.type,
            value: installmentValue,
            category: formData.type === TransactionType.TRANSFER ? 'Transferência' : formData.category,
            subcategory: formData.type === TransactionType.TRANSFER ? 'Geral' : (formData.subcategory || 'Geral'),
            paymentMethod: methodLabel,
            paymentMethodType: formData.type === TransactionType.TRANSFER ? PaymentMethodType.TRANSFER : formData.paymentMethodType,
            
            // Link IDs
            cardId: (formData.type !== TransactionType.TRANSFER && formData.paymentMethodType === PaymentMethodType.CREDIT_CARD) ? formData.selectedCardId : undefined,
            accountId: formData.selectedAccountId, // Source for Pix/Cash OR Transfer Source
            targetAccountId: formData.type === TransactionType.TRANSFER ? formData.targetAccountId : undefined,

            status: initialStatus,
            date: dateStr,
            referenceMonth: getFinancialMonth(dateStr), 
            description: numInstallments > 1 
                ? `${formData.description} (${i + 1}/${numInstallments})` 
                : formData.description,
            installmentCurrent: i + 1,
            installmentTotal: numInstallments
        });
    }

    // 2. Create Fee Transaction (if exists and using Credit Card)
    if (feeVal > 0 && formData.paymentMethodType === PaymentMethodType.CREDIT_CARD && formData.type === TransactionType.EXPENSE) {
        newTransactions.push({
            id: Math.random().toString(36).substr(2, 9),
            entityId: formData.entityId,
            type: TransactionType.EXPENSE,
            value: feeVal,
            category: 'Taxas',
            subcategory: 'Taxa App Pagamento',
            paymentMethod: methodLabel,
            paymentMethodType: PaymentMethodType.CREDIT_CARD,
            cardId: formData.selectedCardId,
            status: PaymentStatus.PENDING,
            date: formData.date,
            referenceMonth: getFinancialMonth(formData.date),
            description: `Taxa App - ${formData.description}`,
            installmentCurrent: 1,
            installmentTotal: 1
        });
    }

    onAddTransaction(newTransactions);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
      setFormData({ 
        value: '',
        feeValue: '',
        type: TransactionType.EXPENSE,
        entityId: EntityType.FAMILY,
        description: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
        subcategory: '',
        paymentMethodType: PaymentMethodType.CREDIT_CARD,
        selectedCardId: '',
        installments: 1,
        selectedAccountId: '',
        targetAccountId: '',
    });
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Lançamentos</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={18} />
          Novo Lançamento
        </button>
      </div>

      {/* --- CHART SECTION --- */}
      {expenseChartData.length > 0 && (
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8 animate-in fade-in slide-in-from-top-2">
            <div className="flex-1 w-full relative min-w-0" style={{ height: 250 }}>
                <h4 className="absolute top-0 left-0 text-sm font-bold text-slate-600 flex items-center gap-2">
                    <PieChartIcon size={16}/> Despesas por Categoria
                </h4>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={expenseChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {expenseChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '12px'}} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            
            {/* Chart Summary List */}
            <div className="w-full md:w-1/3 space-y-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                <h5 className="text-xs font-bold text-slate-400 uppercase">Top 5 Categorias</h5>
                {expenseChartData.slice(0, 5).map((cat, idx) => (
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

      {/* --- TABLE SECTION --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Ref. Mês</th>
                <th className="px-6 py-4 font-medium">Descrição</th>
                <th className="px-6 py-4 font-medium">Pagamento</th>
                <th className="px-6 py-4 font-medium text-right">Valor</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{formatDateBr(t.date)}</td>
                    <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold border border-indigo-100 whitespace-nowrap">
                            {t.referenceMonth}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <p className="text-slate-800 font-medium">{t.description}</p>
                        <p className="text-xs text-slate-500">
                            {t.category} {t.subcategory && t.subcategory !== 'Geral' && `• ${t.subcategory}`}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{t.entityId === EntityType.FAMILY ? 'Família' : t.entityId === EntityType.MEI1 ? 'Eq. Piscina' : 'EP Manut.'}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                        {t.paymentMethod}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : t.type === TransactionType.TRANSFER ? 'text-blue-600' : 'text-rose-600'}`}>
                    {t.type === TransactionType.EXPENSE ? '-' : t.type === TransactionType.INCOME ? '+' : ''}{formatCurrency(t.value)}
                    </td>
                    <td className="px-6 py-4 text-center">
                        {t.status === PaymentStatus.PAID ? (
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold border border-emerald-100">Pago</span>
                        ) : (
                            <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-bold border border-orange-100">Pendente</span>
                        )}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Novo Lançamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Value Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                <div className="relative">
                    <span className="absolute left-3 top-3.5 text-slate-400 font-semibold">R$</span>
                    <input 
                    required
                    type="number" 
                    step="0.01"
                    className="w-full border border-slate-300 rounded-lg pl-10 p-3 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.value}
                    onChange={e => setFormData({...formData, value: e.target.value})}
                    placeholder="0,00"
                    />
                </div>
              </div>

              {/* Type and Entity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    value={formData.type}
                    onChange={e => {
                        const newType = e.target.value as TransactionType;
                        setFormData({
                            ...formData, 
                            type: newType,
                            category: '', 
                            subcategory: '',
                            feeValue: '', // reset fee
                            // Automatically switch to PIX if Income is selected (since Card is invalid)
                            paymentMethodType: newType === TransactionType.INCOME && formData.paymentMethodType === PaymentMethodType.CREDIT_CARD 
                                ? PaymentMethodType.PIX 
                                : formData.paymentMethodType
                        });
                    }}
                  >
                    <option value={TransactionType.INCOME}>Receita</option>
                    <option value={TransactionType.EXPENSE}>Despesa</option>
                    <option value={TransactionType.TRANSFER}>Transferência</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entidade</label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    value={formData.entityId}
                    onChange={e => setFormData({...formData, entityId: e.target.value as EntityType})}
                  >
                    <option value={EntityType.FAMILY}>Família</option>
                    <option value={EntityType.MEI1}>Equipe da Piscina</option>
                    <option value={EntityType.MEI2}>EP Manutenção</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <input 
                  required
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Descrição do lançamento..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              {/* Data */}
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                  <input 
                    type="date" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
              </div>

              {/* CONDITIONAL: Categories (Hidden for Transfer) */}
              {formData.type !== TransactionType.TRANSFER && (
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                        <select 
                        required
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value, subcategory: ''})}
                        >
                        <option value="">Selecione...</option>
                        {formData.type === TransactionType.EXPENSE 
                            ? Object.keys(EXPENSE_STRUCTURE).sort().map(c => <option key={c} value={c}>{c}</option>)
                            : INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                        }
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Subcategoria</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                            value={formData.subcategory}
                            onChange={e => setFormData({...formData, subcategory: e.target.value})}
                            disabled={!formData.category || formData.type === TransactionType.INCOME} // Income currently has no subcats logic implemented visually
                        >
                            <option value="">Geral</option>
                            {availableSubcategories.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                    </div>
                 </div>
              )}

              {/* CONDITIONAL SECTION: Payment Method OR Transfer Logic */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                 
                 {/* 1. TRANSFER LOGIC */}
                 {formData.type === TransactionType.TRANSFER && (
                    <div className="space-y-3 animate-in fade-in">
                        <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <ArrowRightLeft size={14} /> Dados da Transferência
                        </h4>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Conta de Saída (Origem)</label>
                            <select 
                                required
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                value={formData.selectedAccountId}
                                onChange={e => setFormData({...formData, selectedAccountId: e.target.value})}
                            >
                                <option value="">Selecione...</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id} disabled={acc.id === formData.targetAccountId}>
                                        {acc.name} ({formatCurrency(acc.balance)})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Conta de Entrada (Destino)</label>
                            <select 
                                required
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                value={formData.targetAccountId}
                                onChange={e => setFormData({...formData, targetAccountId: e.target.value})}
                            >
                                <option value="">Selecione...</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id} disabled={acc.id === formData.selectedAccountId}>
                                        {acc.name} ({formatCurrency(acc.balance)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                 )}

                 {/* 2. PAYMENT METHOD LOGIC (For Income/Expense) */}
                 {formData.type !== TransactionType.TRANSFER && (
                     <>
                        <label className="block text-xs font-bold text-slate-500 uppercase">Forma de Pagamento</label>
                        <div className={`grid gap-2 ${formData.type === TransactionType.INCOME ? 'grid-cols-2' : 'grid-cols-3'}`}>
                            {/* HIDE Card option if INCOME */}
                            {formData.type !== TransactionType.INCOME && (
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, paymentMethodType: PaymentMethodType.CREDIT_CARD, installments: 1})}
                                    className={`flex flex-col items-center justify-center p-2 rounded border transition-all ${
                                        formData.paymentMethodType === PaymentMethodType.CREDIT_CARD 
                                        ? 'bg-white border-emerald-500 text-emerald-600 shadow-sm ring-1 ring-emerald-500' 
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    <CreditCard size={20} className="mb-1" />
                                    <span className="text-xs font-medium">Cartão</span>
                                </button>
                            )}
                            
                            <button 
                                type="button"
                                onClick={() => setFormData({...formData, paymentMethodType: PaymentMethodType.PIX, installments: 1, feeValue: ''})}
                                className={`flex flex-col items-center justify-center p-2 rounded border transition-all ${
                                    formData.paymentMethodType === PaymentMethodType.PIX
                                    ? 'bg-white border-emerald-500 text-emerald-600 shadow-sm ring-1 ring-emerald-500' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                                }`}
                            >
                                <ArrowRight size={20} className="mb-1" />
                                <span className="text-xs font-medium">Pix</span>
                            </button>
                            <button 
                                type="button"
                                onClick={() => setFormData({...formData, paymentMethodType: PaymentMethodType.CASH, installments: 1, feeValue: ''})}
                                className={`flex flex-col items-center justify-center p-2 rounded border transition-all ${
                                    formData.paymentMethodType === PaymentMethodType.CASH
                                    ? 'bg-white border-emerald-500 text-emerald-600 shadow-sm ring-1 ring-emerald-500' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                                }`}
                            >
                                <Banknote size={20} className="mb-1" />
                                <span className="text-xs font-medium">Dinheiro</span>
                            </button>
                        </div>

                        {/* --- Sub-fields for specific methods --- */}
                        
                        {/* A. Credit Card */}
                        {formData.paymentMethodType === PaymentMethodType.CREDIT_CARD && formData.type !== TransactionType.INCOME && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-3 pt-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Qual Cartão?</label>
                                    <select 
                                        required
                                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                        value={formData.selectedCardId}
                                        onChange={e => setFormData({...formData, selectedCardId: e.target.value})}
                                    >
                                        <option value="">Selecione...</option>
                                        {cards.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400 mt-1">* O valor será lançado na fatura correspondente à data.</p>
                                </div>
                                
                                {formData.type === TransactionType.EXPENSE && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Parcelamento</label>
                                            <select 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                                value={formData.installments}
                                                onChange={e => setFormData({...formData, installments: Number(e.target.value)})}
                                            >
                                                <option value={1}>À vista (1x)</option>
                                                {Array.from({length: 11}, (_, i) => i + 2).map(n => (
                                                    <option key={n} value={n}>{n}x</option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* FEE INPUT */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Taxa (App/99)</label>
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs font-bold">R$</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    className="w-full border border-slate-300 rounded-lg pl-8 p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                                    placeholder="0.00"
                                                    value={formData.feeValue}
                                                    onChange={e => setFormData({...formData, feeValue: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* B. Pix (Bank Accounts) */}
                        {formData.paymentMethodType === PaymentMethodType.PIX && (
                             <div className="animate-in fade-in slide-in-from-top-1 duration-200 pt-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Conta Utilizada</label>
                                <select 
                                    required
                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                    value={formData.selectedAccountId}
                                    onChange={e => setFormData({...formData, selectedAccountId: e.target.value})}
                                >
                                    <option value="">Selecione...</option>
                                    {accounts.filter(a => a.type === 'BANK').map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} (Saldo: {formatCurrency(acc.balance)})</option>
                                    ))}
                                </select>
                             </div>
                        )}

                        {/* C. Cash (Specific Accounts) */}
                        {formData.paymentMethodType === PaymentMethodType.CASH && (
                             <div className="animate-in fade-in slide-in-from-top-1 duration-200 pt-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Origem do Dinheiro</label>
                                <select 
                                    required
                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                    value={formData.selectedAccountId}
                                    onChange={e => setFormData({...formData, selectedAccountId: e.target.value})}
                                >
                                    <option value="">Selecione...</option>
                                    {accounts.filter(a => a.type === 'CASH').map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} (Saldo: {formatCurrency(acc.balance)})</option>
                                    ))}
                                </select>
                             </div>
                        )}
                     </>
                 )}
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg shadow-lg shadow-emerald-900/10 transition-all mt-4"
              >
                Salvar Lançamento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};