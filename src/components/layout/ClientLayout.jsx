import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';

export default function ClientLayout({ isAdmin }) {
  return (
    <div className="min-h-[100dvh] bg-background font-inter text-foreground selection:bg-foreground/10">
      <Header isAdmin={isAdmin} />
      <main className="max-w-lg mx-auto miniapp-safe-main">
        <Outlet />
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
