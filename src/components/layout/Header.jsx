// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Premium header.
 * - Тонкий glass-chrome без жёсткого ободка
 * - При скролле — глубже тень и выше непрозрачность (как у iOS large title)
 */
export default function Header({ isAdmin }) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 glass-chrome miniapp-header-pt transition-shadow duration-300',
        scrolled && 'shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)]',
      )}
    >
      <div className="px-4 flex items-center justify-between min-h-[48px] max-w-lg mx-auto pb-3 gap-2">
        <div className="w-[4.75rem] shrink-0" aria-hidden />
        <div className="flex-1 flex justify-center min-w-0">
          <span
            className="text-[13px] font-light tracking-[0.32em] uppercase text-foreground/95 select-none lg-display"
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
              className={cn(
                'h-9 min-w-[4.25rem] px-3.5 rounded-full text-[10px] font-medium tracking-[0.16em] uppercase',
                'lg-subtle text-muted-foreground hover:text-foreground/95',
                'transition-all duration-200 active:scale-[0.97]',
              )}
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
