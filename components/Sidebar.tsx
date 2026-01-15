import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  Briefcase, 
  ListOrdered,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Home
} from 'lucide-react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isMobileOpen, setIsMobileOpen }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const primaryNavItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppView.WALLET, label: 'Carteira', icon: Wallet },
    { id: AppView.TRANSACTIONS, label: 'Lançamentos', icon: ListOrdered },
  ];

  const secondaryNavItems = [
    { id: AppView.CLIENTS, label: 'Gestão Empresarial', icon: Briefcase },
    { id: AppView.FAMILY_MGT, label: 'Gestão Familiar', icon: Home },
  ];

  const NavItem = ({ item }: { item: any }) => {
    const isActive = currentView === item.id;
    return (
      <button
        onClick={() => {
          onChangeView(item.id);
          setIsMobileOpen(false); // Close drawer on mobile click
        }}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors duration-200 group relative ${
          isActive 
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' 
            : 'hover:bg-slate-800 hover:text-white text-slate-400'
        }`}
      >
        <div className="min-w-[20px]">
           <item.icon size={20} />
        </div>
        
        {/* Text Label - Hidden if collapsed on desktop */}
        <span className={`font-medium whitespace-nowrap transition-all duration-300 ${
            isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
        } md:block`}>
           {item.label}
        </span>

        {/* Tooltip for Collapsed Mode */}
        {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                {item.label}
            </div>
        )}
      </button>
    );
  };

  const sidebarClasses = `
    bg-slate-900 h-screen fixed left-0 top-0 border-r border-slate-800 flex flex-col transition-all duration-300 z-50
    ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
    ${isCollapsed ? 'md:w-20' : 'md:w-64'}
  `;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={sidebarClasses}>
        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <div className="relative">
                <Wallet className="text-emerald-500 shrink-0" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
            </div>
            <div className="whitespace-nowrap">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    Gestão360 
                    <span className="text-[10px] bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">BETA</span>
                </h1>
                <p className="text-[10px] text-slate-500">v1.0.0 • Ciclo 16-15</p>
            </div>
          </div>
          
          {/* Collapse Toggle (Desktop Only) */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
            {/* Primary Group */}
            <div>
                {!isCollapsed && <p className="px-3 text-xs font-bold text-slate-600 uppercase mb-2 tracking-wider">Principal</p>}
                <div className="space-y-1">
                    {primaryNavItems.map(item => <NavItem key={item.id} item={item} />)}
                </div>
            </div>

            {/* Secondary Group */}
            <div>
                 {!isCollapsed && <p className="px-3 text-xs font-bold text-slate-600 uppercase mb-2 tracking-wider">Gestão</p>}
                 <div className="space-y-1">
                    {secondaryNavItems.map(item => <NavItem key={item.id} item={item} />)}
                </div>
            </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800">
          <button className={`flex items-center gap-3 text-slate-400 hover:text-white transition-colors w-full px-3 py-3 rounded-lg hover:bg-slate-800 ${isCollapsed ? 'justify-center' : ''}`}>
            <LogOut size={18} />
            <span className={`${isCollapsed ? 'hidden' : 'block'}`}>Sair</span>
          </button>
        </div>
      </div>
    </>
  );
};