import { BookOpen, Clock, Compass, HelpCircle, LogOut } from 'lucide-react';
import type { UserProfile } from '../types/personaLens.ts';

export type NavSection = 'home' | 'new-situation' | 'history' | 'how-it-works';

interface TopNavProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  user: UserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
  authLoading?: boolean;
}

export function TopNav({
  activeSection,
  onNavigate,
  user,
  onSignIn,
  onSignOut,
  authLoading = false,
}: TopNavProps) {
  const navItems: { id: NavSection; label: string; icon: typeof Compass }[] = [
    { id: 'home', label: 'Home', icon: BookOpen },
    { id: 'new-situation', label: 'New Situation', icon: Compass },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'how-it-works', label: 'How This Works', icon: HelpCircle },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FBF9F5]/95 backdrop-blur-sm border-b border-[#E5E0D8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-6">
          {/* Zone 1: Single-line Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="font-serif text-xl font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E3A8A]"
          >
            PersonaLens
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          {user ? (
            <nav
              aria-label="Primary navigation"
              className="hidden md:flex items-center gap-7"
            >
              {navItems.map((item) => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`py-1 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E3A8A] ${
                      active
                        ? 'border-[#1E3A8A] text-[#1C1917]'
                        : 'border-transparent text-[#57534E] hover:text-[#1C1917] hover:border-[#D6CEBE]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          ) : (
            <nav
              aria-label="Public navigation"
              className="hidden md:flex items-center gap-7"
            >
              <button
                type="button"
                onClick={() => onNavigate('home')}
                aria-current={activeSection === 'home' ? 'page' : undefined}
                className={`py-1 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E3A8A] ${
                  activeSection === 'home'
                    ? 'border-[#1E3A8A] text-[#1C1917]'
                    : 'border-transparent text-[#57534E] hover:text-[#1C1917] hover:border-[#D6CEBE]'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => onNavigate('how-it-works')}
                aria-current={activeSection === 'how-it-works' ? 'page' : undefined}
                className={`py-1 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E3A8A] ${
                  activeSection === 'how-it-works'
                    ? 'border-[#1E3A8A] text-[#1C1917]'
                    : 'border-transparent text-[#57534E] hover:text-[#1C1917] hover:border-[#D6CEBE]'
                }`}
              >
                How This Works
              </button>
            </nav>
          )}

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline text-xs text-[#57534E] truncate max-w-[140px]">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#1C1917] bg-white border border-[#E5E0D8] rounded-lg hover:bg-[#F2EFE9] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(activeSection === 'how-it-works' ? 'home' : 'how-it-works')
                  }
                  className="md:hidden px-2 py-2 text-xs font-medium text-[#57534E] hover:text-[#1C1917] whitespace-nowrap shrink-0"
                >
                  {activeSection === 'how-it-works' ? 'Overview' : 'Guide'}
                </button>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={onSignIn}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#1E3A8A] rounded-lg hover:bg-[#1E3A8A]/90 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
                >
                  {authLoading ? 'Signing in...' : 'Sign in with Google'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation (only when signed in, <= 15% mobile viewport height) */}
      {user && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#FBF9F5]/95 backdrop-blur-sm border-t border-[#E5E0D8] px-1.5 py-1"
        >
          <div className="grid grid-cols-4 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium whitespace-nowrap px-1 transition-colors ${
                    active
                      ? 'text-[#1E3A8A] bg-[#1E3A8A]/8'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
