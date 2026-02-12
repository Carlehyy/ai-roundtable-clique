import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { useSessions } from '@/hooks/useSessions';
import { useProviders } from '@/hooks/useProviders';
import { SessionCard } from '@/components/sessions/SessionCard';
import { CreateSessionModal } from '@/components/sessions/CreateSessionModal';
import type { SessionCreate } from '@/types';

type Page = 'dashboard' | 'providers' | 'sessions' | 'chat';

interface SessionsPageProps {
  onNavigate: (page: Page, sessionId?: number) => void;
}

export function SessionsPage({ onNavigate }: SessionsPageProps) {
  const { 
    sessions, 
    loading, 
    error, 
    refresh, 
    createSession, 
    deleteSession,
    startBrainstorm 
  } = useSessions();
  
  const { providers } = useProviders();
  
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleCreate = async (data: SessionCreate) => {
    const session = await createSession(data);
    if (session) {
      // Start the brainstorm
      await startBrainstorm(session.id);
      // Navigate to the chat room
      onNavigate('chat', session.id);
    }
  };

  const handleEnter = (session: { id: number }) => {
    onNavigate('chat', session.id);
  };

  const handleStart = async (id: number) => {
    await startBrainstorm(id);
    onNavigate('chat', id);
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个讨论会话吗？')) {
      await deleteSession(id);
    }
  };

  const activeSessions = sessions.filter(s => s.is_active && !s.is_completed);
  const completedSessions = sessions.filter(s => s.is_completed);
  const pendingSessions = sessions.filter(s => !s.is_active && !s.is_completed);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">讨论室</h1>
          <p className="text-muted-foreground">
            管理和参与多 AI 头脑风暴讨论
            <span className="ml-2 text-cyan-400">
              ({activeSessions.length} 进行中)
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            className="btn-glow bg-gradient-to-r from-cyan-500 to-blue-600"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            发起讨论
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {/* Sessions List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-20 bg-secondary/50 rounded-lg mb-4" />
              <div className="h-4 bg-secondary/50 rounded w-3/4 mb-2" />
              <div className="h-4 bg-secondary/50 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
            <Plus className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">还没有讨论会话</h3>
          <p className="text-muted-foreground mb-4">
            创建一个新的头脑风暴会话来开始
          </p>
          <Button
            className="btn-glow bg-gradient-to-r from-cyan-500 to-blue-600"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            发起讨论
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Sessions */}
          {activeSessions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                进行中
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onEnter={handleEnter}
                    onStart={handleStart}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending Sessions */}
          {pendingSessions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                准备就绪
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onEnter={handleEnter}
                    onStart={handleStart}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Sessions */}
          {completedSessions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                已完成
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onEnter={handleEnter}
                    onStart={handleStart}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Session Modal */}
      <CreateSessionModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        providers={providers}
        onSubmit={handleCreate}
      />
    </div>
  );
}
