import React from 'react';
import { Loader2 } from 'lucide-react';

export const Loading: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center animate-in fade-in duration-500">
       <div className="relative">
         <div className="absolute inset-0 bg-emerald-100 rounded-full scale-150 animate-pulse opacity-50"></div>
         <div className="bg-white p-4 rounded-full shadow-lg relative z-10">
            <Loader2 size={32} className="text-emerald-600 animate-spin" />
         </div>
       </div>
       <p className="text-slate-400 text-sm font-medium mt-6 animate-pulse tracking-wide">
         Sincronizando dados...
       </p>
    </div>
  );
};