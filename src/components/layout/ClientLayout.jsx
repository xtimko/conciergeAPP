import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';

export default function ClientLayout({ isAdmin }) {
  return (
    <div className="min-h-screen bg-background font-inter">
      <Header isAdmin={isAdmin} />
      <main className="pb-20 max-w-lg mx-auto">
        <Outlet />
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}