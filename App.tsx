import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './views/Dashboard';
import { Transactions } from './views/Transactions';
import { Clients } from './views/Clients';
import { Wallet } from './views/Wallet';
import { FamilyManagement } from './views/FamilyManagement';
import { AppView, Transaction, Client, EntityType, TransactionType, PaymentStatus, Card, AppNotification, Account, PaymentMethodType, RecurringExpense } from './types';
import { getFinancialMonth } from './utils/dateHelpers';
import { Bell, Menu, ChevronDown, User as UserIcon, LogOut } from 'lucide-react';

// Users Configuration
const USERS = [
  { id: 'u1', name: 'Eliú', initials: 'EL', color: 'bg-slate-800' },
  { id: 'u2', name: 'Leticia', initials: 'LE', color: 'bg-rose-600' }
];

// Mock Initial Data - CLEARED FICTITIOUS DATA
const INITIAL_TRANSACTIONS: Transaction[] = [];

const INITIAL_CARDS: Card[] = [
  { id: 'card1', name: 'Itaú Azul Platinum - Principal', limit: 15000, closingDay: 15, dueDay: 23, currentInvoice: 0 },
  { id: 'card2', name: 'C6 Carbon - Transição', limit: 10000, closingDay: 16, dueDay: 24, currentInvoice: 0 },
  { id: 'card3', name: 'Nubank - Eliú', limit: 5000, closingDay: 16, dueDay: 24, currentInvoice: 0 },
  { id: 'card4', name: 'Rico - Leticia', limit: 5000, closingDay: 17, dueDay: 25, currentInvoice: 0 },
];

const INITIAL_ACCOUNTS: Account[] = [
  { id: 'acc1', name: 'PJ - Equipe da Piscina', type: 'BANK', balance: 0.00, entityId: EntityType.MEI1 },
  { id: 'acc2', name: 'PJ - EP Manutenção', type: 'BANK', balance: 0.00, entityId: EntityType.MEI2 },
  { id: 'acc3', name: 'Dinheiro Físico', type: 'CASH', balance: 0.00, entityId: EntityType.FAMILY },
  { id: 'acc4', name: 'Itaú Azul - Eliú', type: 'BANK', balance: 0.00, entityId: EntityType.FAMILY },
  { id: 'acc5', name: 'C6 - Eliú', type: 'BANK', balance: 0.00, entityId: EntityType.FAMILY },
  { id: 'acc6', name: 'Caixa - Eliú', type: 'BANK', balance: 0.00, entityId: EntityType.FAMILY },
  { id: 'acc7', name: '99 - Eliú', type: 'BANK', balance: 0.00, entityId: EntityType.FAMILY },
  { id: 'acc8', name: 'Mercado Pago - Eliú', type: 'BANK', balance: 0.00, entityId: EntityType.FAMILY },
  { id: 'acc9', name: 'Reserva Emergência - MP Leticia', type: 'BANK', balance: 0.00, entityId: EntityType.FAMILY },
  { id: 'acc10', name: 'Reserva Física - Emergência', type: 'CASH', balance: 0.00, entityId: EntityType.FAMILY },
];

const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', entityId: EntityType.MEI1, name: 'Fábio - Cond. Vista Bella', recurringValue: 170.00, fixedPayDay: 2, targetAccountId: 'acc1', isRecurring: true },
  { id: 'c2', entityId: EntityType.MEI2, name: 'Rodrigo - Cond. Alphaville', recurringValue: 210.00, fixedPayDay: 3, targetAccountId: 'acc2', isRecurring: true },
  { id: 'c3', entityId: EntityType.MEI2, name: 'Elisete - Cond. Vista Bella', recurringValue: 180.00, fixedPayDay: 4, targetAccountId: 'acc2', isRecurring: true },
  { id: 'c4', entityId: EntityType.MEI2, name: 'Dimas - Cond. Jurucê', recurringValue: 150.00, fixedPayDay: 4, targetAccountId: 'acc2', isRecurring: true },
  { id: 'c5', entityId: EntityType.MEI2, name: 'Zé Mario - Cond. Jurucê', recurringValue: 180.00, fixedPayDay: 8, targetAccountId: 'acc2', isRecurring: true },
  { id: 'c6', entityId: EntityType.MEI2, name: 'Lucca Santinni - Bonfim', recurringValue: 480.00, fixedPayDay: 8, targetAccountId: 'acc2', isRecurring: true },
  { id: 'c7', entityId: EntityType.MEI1, name: 'Lucas Djalma - Cond. Ypê Branco', recurringValue: 260.00, fixedPayDay: 10, targetAccountId: 'acc1', isRecurring: true },
  { id: 'c8', entityId: EntityType.MEI1, name: 'Diego - Cond. Santa Luzia', recurringValue: 200.00, fixedPayDay: 10, targetAccountId: 'acc1', isRecurring: true },
  { id: 'c9', entityId: EntityType.MEI1, name: 'Mateus - Jd. Independência', recurringValue: 180.00, fixedPayDay: 10, targetAccountId: 'acc1', isRecurring: true },
  { id: 'c10', entityId: EntityType.MEI2, name: 'Denival - Cond. Jurucê', recurringValue: 170.00, fixedPayDay: 13, targetAccountId: 'acc2', isRecurring: true },
  { id: 'c11', entityId: EntityType.MEI2, name: 'Eunilson - Cond. Jurucê', recurringValue: 180.00, fixedPayDay: 15, targetAccountId: 'acc2', isRecurring: true },
  { id: 'c12', entityId: EntityType.MEI1, name: 'Ludmila - Cond. Portal da Mata', recurringValue: 180.00, fixedPayDay: 19, targetAccountId: 'acc1', isRecurring: true },
  { id: 'c13', entityId: EntityType.MEI1, name: 'Leticia - Cond. Vista Bella', recurringValue: 220.00, fixedPayDay: 20, targetAccountId: 'acc1', isRecurring: true },
  { id: 'c14', entityId: EntityType.MEI1, name: 'Priscila - Vila Virgínia', recurringValue: 190.00, fixedPayDay: 20, targetAccountId: 'acc1', isRecurring: true },
  { id: 'c15', entityId: EntityType.MEI1, name: 'Michelle - Alto da Boa Vista', recurringValue: 200.00, fixedPayDay: 20, targetAccountId: 'acc1', isRecurring: true },
  { id: 'c16', entityId: EntityType.MEI1, name: 'Alexandre - Cond. Paineiras', recurringValue: 270.00, fixedPayDay: 20, targetAccountId: 'acc1', isRecurring: true },
  { id: 'c17', entityId: EntityType.MEI1, name: 'Regina - Fazenda', recurringValue: 150.00, fixedPayDay: 21, targetAccountId: 'acc1', isRecurring: true },
  { id: 'c18', entityId: EntityType.MEI1, name: 'Luiz - Cond. Madrid', recurringValue: 200.00, fixedPayDay: 22, targetAccountId: 'acc1', isRecurring: true },
  { id: 'c19', entityId: EntityType.MEI1, name: 'Ana Lúcia - Jd. Canadá', recurringValue: 270.00, fixedPayDay: 24, targetAccountId: 'acc1', isRecurring: true },
  { id: 'c20', entityId: EntityType.MEI1, name: 'Mariângela - Nova Aliança Sul', recurringValue: 220.00, fixedPayDay: 25, targetAccountId: 'acc1', isRecurring: true },
  { id: 'c21', entityId: EntityType.MEI1, name: 'Edward - Cond. Vista Bella', recurringValue: 170.00, fixedPayDay: 29, targetAccountId: 'acc1', isRecurring: true },
  { id: 'c22', entityId: EntityType.MEI1, name: 'Valdirene - Jandaia', recurringValue: 250.00, fixedPayDay: 29, targetAccountId: 'acc1', isRecurring: true },
];

const INITIAL_FAMILY_EXPENSES: RecurringExpense[] = [
    { id: 'fe1', name: 'Casa - Financiamento/Seguro', value: 585.53, dueDay: 20, category: 'Moradia', paymentMethodType: PaymentMethodType.PIX },
    { id: 'fe2', name: 'Internet - Alcans', value: 89.00, dueDay: 12, category: 'Contas de Consumo', paymentMethodType: PaymentMethodType.PIX },
    { id: 'fe3', name: 'Energia - CPFL', value: 150.00, dueDay: 18, category: 'Contas de Consumo', paymentMethodType: PaymentMethodType.PIX },
    { id: 'fe4', name: 'Água e Esgoto - DAE', value: 49.28, dueDay: 20, category: 'Contas de Consumo', paymentMethodType: PaymentMethodType.PIX },
    { id: 'fe5', name: 'Carro - Parcela', value: 225.00, dueDay: 5, category: 'Transporte', paymentMethodType: PaymentMethodType.PIX },
    { id: 'fe6', name: 'MEI 1 - Eliú', value: 81.90, dueDay: 20, category: 'Outros', paymentMethodType: PaymentMethodType.PIX },
    { id: 'fe7', name: 'MEI 2 - Leticia', value: 81.90, dueDay: 20, category: 'Outros', paymentMethodType: PaymentMethodType.PIX },
    { id: 'fe8', name: 'IPVA (1/5)', value: 288.67, dueDay: 22, category: 'Transporte', paymentMethodType: PaymentMethodType.PIX },
    { id: 'fe9', name: 'IPTU (1/3)', value: 60.00, dueDay: 24, category: 'Moradia', paymentMethodType: PaymentMethodType.PIX },
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState(USERS[0]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // Loading State
  const [isLoading, setIsLoading] = useState(true);

  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  
  // DATA PERSISTENCE INITIALIZATION
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('g360_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('g360_clients');
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });

  const [cards, setCards] = useState<Card[]>(() => {
    const saved = localStorage.getItem('g360_cards');
    return saved ? JSON.parse(saved) : INITIAL_CARDS;
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('g360_accounts');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [familyExpenses, setFamilyExpenses] = useState<RecurringExpense[]>(() => {
    const saved = localStorage.getItem('g360_expenses');
    return saved ? JSON.parse(saved) : INITIAL_FAMILY_EXPENSES;
  });
  
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Persistence Effects
  useEffect(() => { localStorage.setItem('g360_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('g360_clients', JSON.stringify(clients)); }, [clients]);
  useEffect(() => { localStorage.setItem('g360_cards', JSON.stringify(cards)); }, [cards]);
  useEffect(() => { localStorage.setItem('g360_accounts', JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem('g360_expenses', JSON.stringify(familyExpenses)); }, [familyExpenses]);


  // Simulate Data Fetching on View Change (Visual only since data is local)
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // 800ms simulation
    return () => clearTimeout(timer);
  }, [currentView]);

  const addAppNotification = (title: string, message: string, type: AppNotification['type']) => {
    setNotifications(prev => {
      if (prev.some(n => n.title === title && n.message === message)) return prev;
      return [{ id: Math.random().toString(36).substr(2, 9), title, message, type, timestamp: new Date(), read: false }, ...prev];
    });
  };

  const addTransaction = (newTransactions: Transaction[]) => {
    setTransactions(prev => [...prev, ...newTransactions]);

    newTransactions.forEach(t => {
        // Handle Transfers
        if (t.type === TransactionType.TRANSFER && t.accountId && t.targetAccountId) {
             setAccounts(prevAccounts => prevAccounts.map(acc => {
                if (acc.id === t.accountId) {
                    return { ...acc, balance: acc.balance - t.value }; // Debit Sender
                }
                if (acc.id === t.targetAccountId) {
                    return { ...acc, balance: acc.balance + t.value }; // Credit Receiver
                }
                return acc;
            }));
            addAppNotification('Transferência Realizada', `Transferido R$ ${t.value} entre contas.`, 'info');
            return;
        }

        // Handle Standard Income/Expense on Cash/Pix accounts
        if ((t.paymentMethodType === PaymentMethodType.PIX || t.paymentMethodType === PaymentMethodType.CASH) && t.accountId) {
            setAccounts(prevAccounts => prevAccounts.map(acc => {
                if (acc.id === t.accountId) {
                    const modifier = t.type === TransactionType.EXPENSE ? -1 : 1;
                    return { ...acc, balance: acc.balance + (t.value * modifier) };
                }
                return acc;
            }));
            if(newTransactions.length === 1) addAppNotification('Saldo Atualizado', `Saldo da conta atualizado.`, 'info');
        }
    });
  };

  const handleClientPayment = (t: Transaction) => {
    setTransactions(prev => [...prev, t]);
    
    // Auto-credit the specific business account if targetAccountId is present
    if (t.accountId) {
        setAccounts(prevAccounts => prevAccounts.map(acc => {
            if (acc.id === t.accountId) {
                return { ...acc, balance: acc.balance + t.value };
            }
            return acc;
        }));
    }

    addAppNotification('Pagamento Registrado', `Recebimento de ${t.description} confirmado.`, 'success');
  };

  const handleAddNewCard = (newCard: Card) => {
      setCards(prev => [...prev, newCard]);
      addAppNotification('Cartão Adicionado', `${newCard.name} foi adicionado à carteira.`, 'success');
  };

  const handleAddClient = (newClient: Client) => {
      setClients(prev => [...prev, newClient]);
      addAppNotification('Cliente Adicionado', `${newClient.name} foi cadastrado.`, 'success');
  }

  const handleAddFamilyExpense = (newExpense: RecurringExpense) => {
      setFamilyExpenses(prev => [...prev, newExpense]);
      addAppNotification('Despesa Fixa', `${newExpense.name} adicionada à gestão familiar.`, 'success');
  };

  const handlePayFamilyExpense = (transactions: Transaction[]) => {
      addTransaction(transactions);
      const main = transactions[0];
      if (transactions.length > 1) {
          addAppNotification('Pagamento Registrado', `${main.description} (+ taxas) foram pagos.`, 'success');
      } else {
          addAppNotification('Pagamento Registrado', `${main.description} foi pago.`, 'success');
      }
  }

  const handleDeleteFamilyExpense = (id: string) => {
      setFamilyExpenses(prev => prev.filter(e => e.id !== id));
      addAppNotification('Despesa Removida', 'A despesa fixa foi excluída da lista.', 'success');
  };

  const renderView = () => {
    switch(currentView) {
      case AppView.DASHBOARD:
        return <Dashboard transactions={transactions} isLoading={isLoading} />;
      case AppView.WALLET:
        return <Wallet accounts={accounts} cards={cards} transactions={transactions} onAddCard={handleAddNewCard} isLoading={isLoading} />;
      case AppView.TRANSACTIONS:
        return <Transactions transactions={transactions} onAddTransaction={addTransaction} cards={cards} accounts={accounts} isLoading={isLoading} />;
      case AppView.CLIENTS:
        return <Clients clients={clients} accounts={accounts} transactions={transactions} onGeneratePayment={handleClientPayment} onAddClient={handleAddClient} onAddTransaction={addTransaction} isLoading={isLoading} />;
      case AppView.FAMILY_MGT:
        return <FamilyManagement 
                  expenses={familyExpenses} 
                  transactions={transactions} 
                  accounts={accounts} 
                  cards={cards} 
                  onAddExpense={handleAddFamilyExpense} 
                  onPayExpense={handlePayFamilyExpense} 
                  onDeleteExpense={handleDeleteFamilyExpense}
                  isLoading={isLoading}
               />;
      default:
        return <Dashboard transactions={transactions} isLoading={isLoading} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isMobileOpen={isMobileNavOpen}
        setIsMobileOpen={setIsMobileNavOpen}
      />
      
      <main className="flex-1 md:ml-20 lg:ml-20 xl:ml-20 p-4 md:p-8 overflow-y-auto h-screen relative transition-all duration-300">
        
        <div className="md:hidden flex items-center gap-3 mb-6">
            <button onClick={() => setIsMobileNavOpen(true)} className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600">
                <Menu size={24} />
            </button>
            <h1 className="font-bold text-slate-800 text-lg">Gestão360 <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">BETA</span></h1>
        </div>

        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 hidden md:block">
                {currentView === AppView.DASHBOARD && 'Visão Geral'}
                {currentView === AppView.WALLET && 'Minha Carteira'}
                {currentView === AppView.TRANSACTIONS && 'Livro Caixa'}
                {currentView === AppView.CLIENTS && 'Gestão Empresarial'}
                {currentView === AppView.FAMILY_MGT && 'Gestão Familiar'}
            </h1>
            <p className="text-slate-500 text-sm hidden md:block">Controle unificado: Pessoal + MEI 1 + MEI 2</p>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
             <div className="text-right mr-2 hidden md:block">
                <p className="text-xs font-bold text-slate-500 uppercase">Mês Vigente (Ref)</p>
                <p className="text-emerald-600 font-bold">{getFinancialMonth(new Date().toISOString().split('T')[0])}</p>
             </div>

             <div className="relative z-30">
                <button 
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <Bell size={24} />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                     <h4 className="font-bold text-slate-700 mb-2">Notificações</h4>
                     {notifications.length === 0 && <p className="text-sm text-slate-400">Sem notificações.</p>}
                     {notifications.map(n => (
                         <div key={n.id} className="border-b border-slate-50 py-2 last:border-0">
                             <p className="text-xs font-bold text-slate-700">{n.title}</p>
                             <p className="text-xs text-slate-500">{n.message}</p>
                         </div>
                     ))}
                  </div>
                )}
             </div>

             {/* USER SWITCHER */}
             <div className="relative z-30">
               <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 hover:bg-white hover:shadow-sm p-1 pr-3 rounded-full transition-all border border-transparent hover:border-slate-100"
               >
                  <div className={`h-10 w-10 ${currentUser.color} rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-sm`}>
                    {currentUser.initials}
                  </div>
                  <ChevronDown size={14} className="text-slate-400 hidden md:block" />
               </button>

               {isUserMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-2 border-b border-slate-50 mb-1">
                          <p className="text-xs text-slate-400 font-bold uppercase">Usuário Atual</p>
                          <p className="font-bold text-slate-800">{currentUser.name}</p>
                      </div>
                      
                      {USERS.map(user => (
                        <button 
                          key={user.id}
                          onClick={() => {
                            setCurrentUser(user);
                            setIsUserMenuOpen(false);
                            addAppNotification('Usuário Alternado', `Bem-vindo(a), ${user.name}!`, 'info');
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${currentUser.id === user.id ? 'bg-slate-50 text-slate-800' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                        >
                           <div className={`w-6 h-6 rounded-full ${user.color} flex items-center justify-center text-[10px] text-white`}>
                              {user.initials}
                           </div>
                           {user.name}
                        </button>
                      ))}

                      <div className="border-t border-slate-50 mt-1 pt-1">
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-medium transition-colors">
                           <LogOut size={16} /> Sair
                        </button>
                      </div>
                  </div>
               )}
             </div>
          </div>
        </header>

        {renderView()}
      </main>
    </div>
  );
};

export default App;