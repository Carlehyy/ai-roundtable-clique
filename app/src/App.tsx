import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { BackgroundParticles } from '@/components/BackgroundParticles';
import { Dashboard } from '@/pages/Dashboard';
import { ProvidersPage } from '@/pages/ProvidersPage';
import { SessionsPage } from '@/pages/SessionsPage';
import { ChatRoom } from '@/pages/ChatRoom';
import { Toaster } from '@/components/ui/sonner';

type Page = 'dashboard' | 'providers' | 'sessions' | 'chat';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [chatSessionId, setChatSessionId] = useState<number | null>(null);

  const navigateTo = (page: Page, sessionId?: number) => {
    setCurrentPage(page);
    if (sessionId) {
      setChatSessionId(sessionId);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={navigateTo} />;
      case 'providers':
        return <ProvidersPage />;
      case 'sessions':
        return <SessionsPage onNavigate={navigateTo} />;
      case 'chat':
        return chatSessionId ? <ChatRoom sessionId={chatSessionId} onNavigate={navigateTo} /> : <SessionsPage onNavigate={navigateTo} />;
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Background Effects */}
      <BackgroundParticles />
      
      {/* Navigation */}
      <Navbar currentPage={currentPage} onNavigate={navigateTo} />
      
      {/* Main Content */}
      <main className="relative z-10 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {renderPage()}
        </div>
      </main>
      
      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          },
        }}
      />
    </div>
  );
}

export default App;
