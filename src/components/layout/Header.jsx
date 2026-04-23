import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header({ isAdmin }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 glass-chrome miniapp-header-pt">
      <div className="px-4 flex items-center justify-between min-h-[48px] max-w-lg mx-auto pb-3 gap-2">
        <div className="w-[4.75rem] shrink-0" aria-hidden />
        <div className="flex-1 flex justify-center min-w-0">
          <span
            className="text-[13px] font-semibold tracking-[0.22em] uppercase text-foreground/90 select-none"
            aria-label="Concierge"
          >
            Concierge
          </span>
        </div>
        <div className="w-[4.75rem] shrink-0 flex justify-end items-center">
          {isAdmin ? (
            <button
              type="button"
              onClick={() => navigate('/AdminDashboard')}
              className="h-9 min-w-[4.25rem] px-3 rounded-xl text-[11px] font-medium tracking-wide uppercase bg-muted/25 hover:bg-muted/40 border border-border/20 text-muted-foreground hover:text-foreground/90 backdrop-blur-sm transition-colors active:scale-[0.98]"
              aria-label="Админ-панель"
            >
              Админ
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
