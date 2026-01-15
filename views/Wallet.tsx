import React, { useState, useMemo } from 'react';
import { Account, Card, Transaction, TransactionType } from '../types';
import { formatCurrency, getFinancialMonth, formatDateBr } from '../utils/dateHelpers';
import { CreditCard, Wallet as WalletIcon, Building2, Banknote, Plus, X, Landmark, Calendar, Search, ArrowRight } from 'lucide-react';
import { Loading } from '../components/Loading';

interface WalletProps {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  onAddCard: (card: Card) => void;
  isLoading?: boolean;
}

export const Wallet: React.FC<WalletProps> = ({ accounts, cards, transactions, onAddCard, isLoading }) => {
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null); // State for the selected card details
  
  const [newCardData, setNewCardData] = useState({
      name: '',
      limit: '',
      closingDay: '',
      dueDay: ''
  });

  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const currentRefMonth = getFinancialMonth(new Date().toISOString().split('T')[0]);

  const handleSaveCard = (e: React.FormEvent) => {
      e.preventDefault();
      const card: Card = {
          id: Math.random().toString(36).substr(2, 9),
          name: newCardData.name,
          limit: parseFloat(newCardData.limit),
          closingDay: parseInt(newCardData.closingDay),
          dueDay: parseInt(newCardData.dueDay),
          currentInvoice: 0 // Will be calculated dynamically
      };
      onAddCard(card);
      setIsAddCardOpen(false);
      setNewCardData({ name: '', limit: '', closingDay: '', dueDay: '' });
  };

  // Helper to calculate card metrics based on transactions
  const getCardMetrics = (cardId: string) => {
      // Filter transactions for this card and the current financial month
      const cardTransactions = transactions.filter(t => 
          t.cardId === cardId && 
          t.referenceMonth === currentRefMonth &&
          t.type === TransactionType.EXPENSE
      );

      const totalInvoice = cardTransactions.reduce((sum, t) => sum + t.value, 0);
      
      // Calculate portion that is from installments (where total installments > 1)
      const installmentPortion = cardTransactions
        .filter(t => (t.installmentTotal || 0) > 1)
        .reduce((sum, t) => sum + t.value, 0);

      return { totalInvoice, installmentPortion };
  };

  // Memoized transactions for the selected card statement
  const selectedCardTransactions = useMemo(() => {
    if (!selectedCard) return [];
    return transactions
        .filter(t => t.cardId === selectedCard.id && t.referenceMonth === currentRefMonth && t.type === TransactionType.EXPENSE)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCard, transactions, currentRefMonth]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      
      {/* Total Balance Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
            <p className="text-slate-400 font-medium mb-1">Saldo Total Disponível</p>
            <h2 className="text-4xl font-bold">{formatCurrency(totalBalance)}</h2>
        </div>
        <WalletIcon className="absolute right-[-20px] bottom-[-20px] text-white opacity-5 w-48 h-48" />
      </div>

      {/* Accounts Section */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Building2 className="text-emerald-600" /> Contas & Dinheiro
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(acc => (
                <div key={acc.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${acc.type === 'CASH' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {acc.type === 'CASH' ? <Banknote size={24} /> : <Landmark size={24} />}
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-700 text-sm">{acc.name}</h4>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{acc.entityId}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`font-bold text-lg ${acc.balance >= 0 ? 'text-slate-700' : 'text-red-500'}`}>
                            {formatCurrency(acc.balance)}
                        </p>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Cards Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="text-indigo-600" /> Cartões de Crédito
            </h3>
            <button 
                onClick={() => setIsAddCardOpen(true)}
                className="text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
            >
                <Plus size={16} /> Adicionar Cartão
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map(card => {
                const { totalInvoice, installmentPortion } = getCardMetrics(card.id);
                const limitUsage = Math.min((totalInvoice / card.limit) * 100, 100);

                return (
                <div 
                    key={card.id} 
                    onClick={() => setSelectedCard(card)}
                    className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-700 transition-colors flex items-center gap-2">
                                {card.name} <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400"/>
                            </h3>
                            <p className="text-slate-500 text-sm">Limite: {formatCurrency(card.limit)}</p>
                        </div>
                        <div className="text-right">
                             <div className="inline-block p-1 bg-slate-100 rounded text-slate-600 text-[10px] font-bold mb-1">
                                VENC {card.dueDay}
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1 items-end">
                                <span className="text-slate-600 text-xs">Fatura Atual ({currentRefMonth})</span>
                                <span className="font-bold text-xl text-slate-800">{formatCurrency(totalInvoice)}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div 
                                    className={`h-2 rounded-full transition-all duration-500 ${limitUsage > 80 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                                    style={{ width: `${limitUsage}%` }}
                                ></div>
                            </div>
                        </div>
                        
                        <div className="bg-indigo-50 rounded-lg p-3 flex justify-between items-center">
                            <span className="text-xs text-indigo-800 font-medium">Parcelados nesta fatura</span>
                            <span className="text-sm font-bold text-indigo-900">{formatCurrency(installmentPortion)}</span>
                        </div>

                        <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-50">
                            <span>Fecha dia: {card.closingDay}</span>
                            <span>Disponível: {formatCurrency(card.limit - totalInvoice)}</span>
                        </div>
                    </div>
                </div>
            )})}
        </div>
      </div>

      {/* Add Card Modal */}
      {isAddCardOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Adicionar Novo Cartão</h3>
              <button onClick={() => setIsAddCardOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Cartão</label>
                <input 
                  required
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: Nubank Platinum"
                  value={newCardData.name}
                  onChange={e => setNewCardData({...newCardData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Limite (R$)</label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0.00"
                  value={newCardData.limit}
                  onChange={e => setNewCardData({...newCardData, limit: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dia Fechamento</label>
                    <input 
                    required
                    type="number" 
                    min="1" max="31"
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Ex: 15"
                    value={newCardData.closingDay}
                    onChange={e => setNewCardData({...newCardData, closingDay: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dia Vencimento</label>
                    <input 
                    required
                    type="number" 
                    min="1" max="31"
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Ex: 23"
                    value={newCardData.dueDay}
                    onChange={e => setNewCardData({...newCardData, dueDay: e.target.value})}
                    />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg shadow-lg shadow-indigo-900/10 transition-all mt-4"
              >
                Salvar Cartão
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Card Details (Statement) Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="bg-indigo-600 p-6 text-white shrink-0">
                    <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <CreditCard size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold leading-none">{selectedCard.name}</h3>
                                <p className="text-indigo-200 text-sm mt-1">Extrato detalhado</p>
                            </div>
                         </div>
                         <button onClick={() => setSelectedCard(null)} className="text-indigo-200 hover:text-white transition-colors">
                            <X size={24} />
                         </button>
                    </div>

                    <div className="flex justify-between items-end">
                        <div>
                             <p className="text-xs font-bold text-indigo-300 uppercase mb-1">Mês de Referência</p>
                             <div className="flex items-center gap-2 bg-indigo-700/50 px-3 py-1.5 rounded-lg border border-indigo-500/30">
                                <Calendar size={14} />
                                <span className="font-semibold">{currentRefMonth}</span>
                             </div>
                        </div>
                        <div className="text-right">
                             <p className="text-xs font-bold text-indigo-300 uppercase mb-1">Total da Fatura</p>
                             <p className="text-3xl font-bold">
                                {formatCurrency(selectedCardTransactions.reduce((acc, t) => acc + t.value, 0))}
                             </p>
                        </div>
                    </div>
                </div>

                {/* Transactions List */}
                <div className="flex-1 overflow-y-auto p-0">
                    {selectedCardTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                            <Search size={32} className="mb-2 opacity-50"/>
                            <p>Nenhuma transação nesta fatura.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {selectedCardTransactions.map(t => (
                                <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                    <div className="flex items-start gap-3">
                                        <div className="flex flex-col items-center justify-center bg-slate-100 w-10 h-10 rounded-lg text-slate-500 font-bold text-xs">
                                            <span>{formatDateBr(t.date).split('/')[0]}</span>
                                            <span className="text-[9px] uppercase">{formatDateBr(t.date).split('/')[1]}</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{t.description}</p>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                <span>{t.category}</span>
                                                {t.installmentTotal && t.installmentTotal > 1 && (
                                                    <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">
                                                        {t.installmentCurrent}/{t.installmentTotal}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-800">
                                            {formatCurrency(t.value)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 text-center shrink-0">
                    <button 
                        onClick={() => setSelectedCard(null)}
                        className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
                    >
                        Fechar Extrato
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};