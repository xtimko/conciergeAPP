import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Users, ArrowLeft } from 'lucide-react';

const tabs = [
{ path: '/AdminDashboard', icon: LayoutDashboard, label: 'Dashboard' },
{ path: '/AdminOrders', icon: ClipboardList, label: 'Orders' },
{ path: '/AdminClients', icon: Users, label: 'Clients' }];


export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background font-inter">
      <header className="sticky top-0 z-40 glass glass-thin border-b border-border/20">
        <div className="mt-12 ml-2 px-24 flex items-center h-14 max-w-4xl glass-thin">
          <Link to="/Home" className="mr-4 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-sm font-semibold tracking-[0.2em] uppercase">Concierge ID</h1>
        </div>
      </header>
      <nav className="glass glass-thin border-b border-border/10">
        <div className="flex gap-1 max-w-4xl mx-auto px-4">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium tracking-wide transition-all border-b-2 ${
                isActive ?
                'border-foreground text-foreground' :
                'border-transparent text-muted-foreground hover:text-foreground'}`
                }>
                
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </Link>);

          })}
        </div>
      </nav>
      <main className="max-w-4xl mx-auto p-4">
        <Outlet />
      </main>
    </div>);

}