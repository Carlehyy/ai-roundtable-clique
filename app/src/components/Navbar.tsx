import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Cpu, 
  MessageSquare, 
  Settings, 
  Menu, 
  X,
  Zap
} from 'lucide-react';

type Page = 'dashboard' | 'providers' | 'sessions' | 'chat';

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems = [
  { label: '控制台', page: 'dashboard' as Page, icon: Zap },
  { label: 'LLM 管理', page: 'providers' as Page, icon: Cpu },
  { label: '讨论室', page: 'sessions' as Page, icon: MessageSquare },
];

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Glass background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border/50" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-cyan-500/30 transition-shadow">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg gradient-text">SynapseMind</h1>
              <p className="text-xs text-muted-foreground -mt-0.5">智汇圆桌</p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentPage === item.page;
              const Icon = item.icon;
              return (
                <button
                  key={item.page}
                  onClick={() => onNavigate(item.page)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : ''}`} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex"
            >
              <Settings className="w-5 h-5" />
            </Button>
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border/50 animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = currentPage === item.page;
              const Icon = item.icon;
              return (
                <button
                  key={item.page}
                  onClick={() => {
                    onNavigate(item.page);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all w-full ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : ''}`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
