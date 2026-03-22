import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Users, ArrowLeft, Wallet } from 'lucide-react';

const tabs = [
  { path: '/AdminDashboard', icon: LayoutDashboard, label: 'Дашборд' },
  { path: '/AdminOrders', icon: ClipboardList, label: 'Заказы' },
  { path: '/AdminClients', icon: Users, label: 'Клиенты' },
  { path: '/AdminFinance', icon: Wallet, label: 'Финансы' },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background font-inter text-foreground">
      <header className="sticky top-0 z-40 glass-chrome miniapp-header-pt">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center h-11 px-4 gap-3">
            <Link
              to="/Home"
              className="p-2 -ml-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            </Link>
            <h1 className="text-[11px] font-medium tracking-[0.28em] uppercase text-foreground/90">
              Concierge ID
            </h1>
          </div>
          <div
            className="flex flex-nowrap gap-1.5 px-3 pb-3 pt-0.5 overflow-x-auto overscroll-x-contain snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex shrink-0 snap-start items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium tracking-wide transition-all rounded-xl whitespace-nowrap ${
                    isActive
                      ? 'text-foreground bg-white/[0.07] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                      : 'text-muted-foreground hover:text-foreground/85 hover:bg-white/[0.03]'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-4 pb-10">
        <Outlet />
      </main>
    </div>
  );
}
