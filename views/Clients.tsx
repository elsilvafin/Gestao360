import React, { useState, useMemo } from 'react';
import { Client, EntityType, Transaction, TransactionType, PaymentStatus, PaymentMethodType, Account } from '../types';
import { formatCurrency, getFinancialMonth } from '../utils/dateHelpers';
import { CheckCircle2, Package, User, Plus, X, Briefcase, Wrench, TrendingUp, TrendingDown, Wallet, Building2, ArrowRightLeft, ArrowUpRight } from 'lucide-react';
import { Loading } from '../components/Loading';

interface ClientsProps {
  clients: Client[];
  accounts: Account[];
  transactions: Transaction[];
  onGeneratePayment: (t: Transaction) => void;
  onAddClient: (c: Client) => void;
  onAddTransaction: (t: Transaction[]) => void;
  isLoading?: boolean;
}

export const Clients: React.FC<ClientsProps> = ({ clients, accounts, transactions, onGeneratePayment, onAddClient, onAddTransaction, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'RECURRING' | 'SINGLE'>('RECURRING');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Payment Modal States
  const [extraProducts, setExtraProducts] = useState('');
  const [extraValue, setExtraValue] = useState('0');

  // Withdrawal Modal States
  const [withdrawData, setWithdrawData] = useState({
      sourceAccountId: '',
      targetAccountId: '',
      value: '',
      type: 'PROLABORE' as 'PROLABORE' | 'PROFIT',
      date: new Date().toISOString().split('T')[0]
  });

  // Add Client Modal States
  const [newClientData, setNewClientData] = useState({
      name: '',
      value: '',
      isRecurring: true,
      fixedPayDay: '',
      targetAccountId: '',
      entityId: EntityType.MEI1 // Default
  });

  // Calculate Company Health Stats
  const currentRefMonth = getFinancialMonth(new Date().toISOString().split('T')[0]);

  const getStats = (entityId: EntityType) => {
      const entityTrans = transactions.filter(t => 
          t.entityId === entityId && 
          t.referenceMonth === currentRefMonth
      );

      const income = entityTrans
          .filter(t => t.type === TransactionType.INCOME)
          .reduce((sum, t) => sum + t.value, 0);

      const expense = entityTrans
          .filter(t => t.type === TransactionType.EXPENSE)
          .reduce((sum, t) => sum + t.value, 0);

      return { income, expense, balance: income - expense };
  };

  const mei1Stats = useMemo(() => getStats(EntityType.MEI1), [transactions, currentRefMonth]);
  const mei2Stats = useMemo(() => getStats(EntityType.MEI2), [transactions, currentRefMonth]);

  const totalStats = useMemo(() => ({
    income: mei1Stats.income + mei2Stats.income,
    expense: mei1Stats.expense + mei2Stats.expense,
    balance: (mei1Stats.income + mei2Stats.income) - (mei1Stats.expense + mei2Stats.expense)
  }), [mei1Stats, mei2Stats]);


  const filteredClients = clients.filter(c => 
      activeTab === 'RECURRING' ? c.isRecurring : !c.isRecurring
  );

  const handleOpenPayment = (client: Client) => {
    setSelectedClient(client);
    setExtraProducts('');
    setExtraValue('0');
  };

  const confirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const totalValue = selectedClient.recurringValue + parseFloat(extraValue || '0');
    const today = new Date().toISOString().split('T')[0];

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      entityId: selectedClient.entityId,
      type: TransactionType.INCOME,
      value: totalValue,
      category: 'Vendas/Serviços',
      subcategory: selectedClient.isRecurring ? 'Mensalidade' : 'Serviço Avulso',
      paymentMethod: 'Boleto/Pix',
      paymentMethodType: PaymentMethodType.PIX,
      accountId: selectedClient.targetAccountId, // Auto-link to the correct account
      status: PaymentStatus.PAID,
      date: today,
      referenceMonth: getFinancialMonth(today),
      description: `Receb. ${selectedClient.name} ${extraProducts ? '+ ' + extraProducts : ''}`,
    };

    onGeneratePayment(newTransaction);
    setSelectedClient(null);
  };

  const handleSaveClient = (e: React.FormEvent) => {
      e.preventDefault();
      
      const client: Client = {
          id: Math.random().toString(36).substr(2, 9),
          entityId: newClientData.entityId,
          name: newClientData.name,
          recurringValue: parseFloat(newClientData.value),
          isRecurring: newClientData.isRecurring,
          fixedPayDay: newClientData.isRecurring ? parseInt(newClientData.fixedPayDay) : undefined,
          targetAccountId: newClientData.targetAccountId
      };

      onAddClient(client);
      setIsAddModalOpen(false);
      // Reset form
      setNewClientData({
          name: '',
          value: '',
          isRecurring: true,
          fixedPayDay: '',
          targetAccountId: '',
          entityId: EntityType.MEI1
      });
  }

  const handleSaveWithdrawal = (e: React.FormEvent) => {
      e.preventDefault();
      
      const sourceAcc = accounts.find(a => a.id === withdrawData.sourceAccountId);
      const entityId = sourceAcc ? sourceAcc.entityId : EntityType.MEI1;
      
      const newTransaction: Transaction = {
          id: Math.random().toString(36).substr(2, 9),
          entityId: entityId, // Belongs to the MEI making the transfer
          type: TransactionType.TRANSFER,
          value: parseFloat(withdrawData.value),
          category: 'Retirada de Sócios',
          subcategory: withdrawData.type === 'PROLABORE' ? 'Pró-Labore' : 'Distribuição de Lucros',
          paymentMethod: 'Transferência',
          paymentMethodType: PaymentMethodType.TRANSFER,
          accountId: withdrawData.sourceAccountId, // Debit Source
          targetAccountId: withdrawData.targetAccountId, // Credit Target
          status: PaymentStatus.PAID,
          date: withdrawData.date,
          referenceMonth: getFinancialMonth(withdrawData.date),
          description: withdrawData.type === 'PROLABORE' ? 'Retirada Pró-Labore' : 'Retirada de Lucros'
      };

      onAddTransaction([newTransaction]);
      setIsWithdrawModalOpen(false);
      setWithdrawData({
          sourceAccountId: '',
          targetAccountId: '',
          value: '',
          type: 'PROLABORE',
          date: new Date().toISOString().split('T')[0]
      });
  };

  // Filter accounts
  const meiAccounts = accounts.filter(a => a.entityId === EntityType.MEI1 || a.entityId === EntityType.MEI2);
  const familyAccounts = accounts.filter(a => a.entityId === EntityType.FAMILY && a.type === 'BANK');

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      
      {/* Title & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-xl font-bold text-slate-800">Gestão Empresarial</h2>
            <p className="text-slate-500 text-sm">Visão consolidada das suas empresas</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setIsWithdrawModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all w-full md:w-auto justify-center"
            >
                <ArrowRightLeft size={18} />
                Registrar Retirada
            </button>
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all w-full md:w-auto justify-center"
            >
                <Plus size={18} />
                Novo Cliente / Serviço
            </button>
        </div>
      </div>

      {/* Consolidated Business Health */}
      <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                  <h3 className="text-slate-400 font-medium text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Building2 size={14}/> Resultado Consolidado (MEI 1 + MEI 2)
                  </h3>
                  <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold">{formatCurrency(totalStats.balance)}</span>
                      <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">Ref: {currentRefMonth}</span>
                  </div>
              </div>
              <div className="flex gap-8 w-full md:w-auto bg-slate-800/50 p-4 rounded-lg md:bg-transparent md:p-0">
                  <div className="flex-1 md:flex-none">
                      <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><TrendingUp size={12} className="text-emerald-400"/> Receitas</p>
                      <p className="font-bold text-emerald-400 text-xl">{formatCurrency(totalStats.income)}</p>
                  </div>
                  <div className="flex-1 md:flex-none">
                      <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><TrendingDown size={12} className="text-rose-400"/> Despesas</p>
                      <p className="font-bold text-rose-400 text-xl">{formatCurrency(totalStats.expense)}</p>
                  </div>
              </div>
          </div>
          {/* Background decoration */}
          <div className="absolute right-[-20px] top-[-50px] opacity-10 pointer-events-none">
              <Briefcase size={200} className="text-white transform rotate-12"/>
          </div>
      </div>

      {/* Individual Company Health Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* MEI 1 - Equipe da Piscina */}
          <div className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
              <div className="p-5">
                  <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                              <Briefcase size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800">Equipe da Piscina</h3>
                            <p className="text-xs text-slate-500">Fluxo do Mês</p>
                          </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${mei1Stats.balance >= 0 ? 'bg-purple-50 text-purple-700' : 'bg-red-50 text-red-600'}`}>
                          {formatCurrency(mei1Stats.balance)}
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                              <TrendingUp size={14} className="text-emerald-500" />
                              <span className="text-xs font-semibold text-slate-500 uppercase">Entradas</span>
                          </div>
                          <p className="font-bold text-emerald-600">{formatCurrency(mei1Stats.income)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                              <TrendingDown size={14} className="text-rose-500" />
                              <span className="text-xs font-semibold text-slate-500 uppercase">Saídas</span>
                          </div>
                          <p className="font-bold text-rose-600">{formatCurrency(mei1Stats.expense)}</p>
                      </div>
                  </div>
              </div>
          </div>

          {/* MEI 2 - EP Manutenção */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
              <div className="p-5">
                  <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                              <Wrench size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800">EP Manutenção</h3>
                            <p className="text-xs text-slate-500">Fluxo do Mês</p>
                          </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${mei2Stats.balance >= 0 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-600'}`}>
                          {formatCurrency(mei2Stats.balance)}
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                              <TrendingUp size={14} className="text-emerald-500" />
                              <span className="text-xs font-semibold text-slate-500 uppercase">Entradas</span>
                          </div>
                          <p className="font-bold text-emerald-600">{formatCurrency(mei2Stats.income)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                              <TrendingDown size={14} className="text-rose-500" />
                              <span className="text-xs font-semibold text-slate-500 uppercase">Saídas</span>
                          </div>
                          <p className="font-bold text-rose-600">{formatCurrency(mei2Stats.expense)}</p>
                      </div>
                  </div>
              </div>
          </div>

      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 mt-8">
          <button 
            onClick={() => setActiveTab('RECURRING')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'RECURRING' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Briefcase size={16} /> Contratos Recorrentes
          </button>
          <button 
            onClick={() => setActiveTab('SINGLE')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'SINGLE' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Wrench size={16} /> Serviços Avulsos
          </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map(client => (
          <div key={client.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-emerald-300 transition-all">
            
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <User size={80} className="text-slate-900"/>
            </div>

            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-slate-800 leading-tight pr-8">{client.name}</h3>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded uppercase ${client.entityId === EntityType.MEI1 ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                  {client.entityId === EntityType.MEI1 ? 'MEI 1' : 'MEI 2'}
                </span>
              </div>
              
              {client.isRecurring ? (
                  <p className="text-slate-500 text-xs mt-1 font-medium bg-slate-100 inline-block px-2 py-1 rounded">Vencimento dia {client.fixedPayDay}</p>
              ) : (
                  <p className="text-slate-500 text-xs mt-1 font-medium bg-slate-100 inline-block px-2 py-1 rounded">Serviço Pontual</p>
              )}
              
              <p className="text-xl font-bold text-emerald-600 mt-3">{formatCurrency(client.recurringValue)}</p>
            </div>

            <button 
              onClick={() => handleOpenPayment(client)}
              className="mt-4 w-full bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium text-sm"
            >
              <CheckCircle2 size={16} />
              {activeTab === 'RECURRING' ? 'Registrar Mensalidade' : 'Receber Serviço'}
            </button>
          </div>
        ))}
        
        {filteredClients.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400">
                <p>Nenhum cliente ou serviço encontrado nesta seção.</p>
            </div>
        )}
      </div>

      {/* Payment Pop-up Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-600 p-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <CheckCircle2 /> 
                Receber de {selectedClient.name.split('-')[0]}
              </h3>
              <button onClick={() => setSelectedClient(null)} className="text-emerald-100 hover:text-white"><X size={20}/></button>
            </div>
            
            <form onSubmit={confirmPayment} className="p-6 space-y-4">
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                <p className="text-sm text-emerald-800 mb-1">{selectedClient.isRecurring ? 'Valor da Mensalidade' : 'Valor do Serviço'}</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(selectedClient.recurringValue)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <Package size={16} /> Produtos Adicionais / Extras
                </label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: Consultoria Extra, Peças..."
                  value={extraProducts}
                  onChange={e => setExtraProducts(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor dos Extras</label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">R$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full border border-slate-300 rounded-lg pl-9 p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={extraValue}
                      onChange={e => setExtraValue(e.target.value)}
                    />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="flex-1 bg-slate-100 text-slate-700 font-medium py-3 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white font-medium py-3 rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20"
                >
                  Confirmar Recebimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-blue-50">
                    <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                        <ArrowRightLeft size={20} className="text-blue-600"/>
                        Retirada de Sócios
                    </h3>
                    <button onClick={() => setIsWithdrawModalOpen(false)} className="text-blue-400 hover:text-blue-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSaveWithdrawal} className="p-6 space-y-5">
                    
                    {/* Source Account (MEI) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Origem (Conta da Empresa)</label>
                        <select 
                            required
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={withdrawData.sourceAccountId}
                            onChange={e => setWithdrawData({...withdrawData, sourceAccountId: e.target.value})}
                        >
                            <option value="">Selecione...</option>
                            {meiAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                            ))}
                        </select>
                    </div>

                    {/* Target Account (Family) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Destino (Conta Pessoal)</label>
                        <select 
                            required
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={withdrawData.targetAccountId}
                            onChange={e => setWithdrawData({...withdrawData, targetAccountId: e.target.value})}
                        >
                            <option value="">Selecione...</option>
                            {familyAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                            ))}
                        </select>
                    </div>

                    {/* Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Retirada</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setWithdrawData({...withdrawData, type: 'PROLABORE'})}
                                className={`py-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-1 transition-all ${withdrawData.type === 'PROLABORE' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                <User size={18} /> Pró-Labore
                            </button>
                            <button
                                type="button"
                                onClick={() => setWithdrawData({...withdrawData, type: 'PROFIT'})}
                                className={`py-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-1 transition-all ${withdrawData.type === 'PROFIT' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                <ArrowUpRight size={18} /> Lucros
                            </button>
                        </div>
                    </div>

                    {/* Value */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Valor da Retirada (R$)</label>
                        <input 
                            required
                            type="number" 
                            step="0.01"
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="0.00"
                            value={withdrawData.value}
                            onChange={e => setWithdrawData({...withdrawData, value: e.target.value})}
                        />
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                        <input 
                            type="date" 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={withdrawData.date}
                            onChange={e => setWithdrawData({...withdrawData, date: e.target.value})}
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-lg shadow-blue-900/10 transition-all mt-2"
                    >
                        Confirmar Transferência
                    </button>

                </form>
            </div>
        </div>
      )}

      {/* Add Client/Service Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800">Novo Cadastro</h3>
                    <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSaveClient} className="p-6 space-y-5">
                    
                    {/* Entity Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Empresa Responsável</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setNewClientData({...newClientData, entityId: EntityType.MEI1})}
                                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${newClientData.entityId === EntityType.MEI1 ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                MEI 1 (Eq. Piscina)
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewClientData({...newClientData, entityId: EntityType.MEI2})}
                                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${newClientData.entityId === EntityType.MEI2 ? 'bg-orange-50 border-orange-500 text-orange-700 ring-1 ring-orange-500' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                MEI 2 (EP Manut.)
                            </button>
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Cliente / Serviço</label>
                        <input 
                            required
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="Ex: João Silva - Manutenção"
                            value={newClientData.name}
                            onChange={e => setNewClientData({...newClientData, name: e.target.value})}
                        />
                    </div>

                    {/* Value */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Valor Base (R$)</label>
                        <input 
                            required
                            type="number" 
                            step="0.01"
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="0.00"
                            value={newClientData.value}
                            onChange={e => setNewClientData({...newClientData, value: e.target.value})}
                        />
                    </div>

                    {/* Recurrence Switch */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <input 
                            type="checkbox"
                            id="isRecurring"
                            className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                            checked={newClientData.isRecurring}
                            onChange={e => setNewClientData({...newClientData, isRecurring: e.target.checked})}
                        />
                        <label htmlFor="isRecurring" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                            Este é um contrato recorrente (Mensal)
                        </label>
                    </div>

                    {/* Conditional Pay Day */}
                    {newClientData.isRecurring && (
                         <div className="animate-in fade-in slide-in-from-top-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Dia de Vencimento</label>
                            <input 
                                required
                                type="number" 
                                min="1" max="31"
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Ex: 10"
                                value={newClientData.fixedPayDay}
                                onChange={e => setNewClientData({...newClientData, fixedPayDay: e.target.value})}
                            />
                        </div>
                    )}

                    {/* Receiving Account */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Conta de Recebimento (Destino)</label>
                        <select 
                            required
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                            value={newClientData.targetAccountId}
                            onChange={e => setNewClientData({...newClientData, targetAccountId: e.target.value})}
                        >
                            <option value="">Selecione a conta...</option>
                            {meiAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">O pagamento cairá automaticamente nesta conta.</p>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg shadow-lg shadow-emerald-900/10 transition-all mt-2"
                    >
                        Salvar Cadastro
                    </button>

                </form>
            </div>
        </div>
      )}

    </div>
  );
};