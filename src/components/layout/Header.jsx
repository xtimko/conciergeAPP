import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function Header({ isAdmin }) {
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-40 glass-chrome"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)' }}
    >
      <div className="px-4 flex items-center justify-center min-h-[52px] max-w-lg mx-auto relative pb-3">
        <div className="flex items-center gap-2">
          <img
            src="https://media.base44.com/images/public/69bbc4b13118d84816c867de/5ccc028bc_IMG_9731.png"
            alt="Concierge"
            className="h-[22px] w-auto object-contain opacity-[0.92]"
          />
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate('/AdminDashboard')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-2xl text-muted-foreground hover:text-foreground transition-colors active:scale-95"
            aria-label="Admin"
          >
            <Shield className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </header>
  );
}
