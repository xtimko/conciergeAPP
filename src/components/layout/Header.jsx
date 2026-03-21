import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header({ isAdmin }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 glass-chrome miniapp-header-pt">
      <div className="px-4 flex items-center justify-between min-h-[48px] max-w-lg mx-auto pb-3 gap-2">
        <div className="w-[4.75rem] shrink-0" aria-hidden />
        <div className="flex-1 flex justify-center min-w-0">
          <img
            src="https://media.base44.com/images/public/69bbc4b13118d84816c867de/5ccc028bc_IMG_9731.png"
            alt="Concierge"
            className="h-[22px] w-auto object-contain opacity-[0.92] invert dark:invert-0"
          />
        </div>
        <div className="w-[4.75rem] shrink-0 flex justify-end items-center">
          {isAdmin ? (
            <button
              type="button"
              onClick={() => navigate('/AdminDashboard')}
              className="h-9 min-w-[4.25rem] px-3 rounded-xl text-[11px] font-semibold tracking-wide uppercase bg-foreground/[0.08] hover:bg-foreground/[0.12] border border-border/40 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] text-foreground transition-colors active:scale-[0.98]"
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
