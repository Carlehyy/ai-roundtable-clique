import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { useProviders } from '@/hooks/useProviders';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { ProviderForm } from '@/components/providers/ProviderForm';
import type { LLMProvider, LLMProviderCreate, LLMProviderUpdate } from '@/types';

export function ProvidersPage() {
  const { 
    providers, 
    loading, 
    error, 
    refresh, 
    createProvider, 
    updateProvider, 
    deleteProvider,
    testConnection 
  } = useProviders();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('online');

  const handleEdit = (provider: LLMProvider) => {
    setEditingProvider(provider);
    setFormOpen(true);
  };

  const handleCreate = async (data: LLMProviderCreate | LLMProviderUpdate) => {
    await createProvider(data as LLMProviderCreate);
  };

  const handleUpdate = async (data: LLMProviderCreate | LLMProviderUpdate) => {
    if (editingProvider) {
      await updateProvider(editingProvider.id, data as LLMProviderUpdate);
      setEditingProvider(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个 LLM 配置吗？')) {
      await deleteProvider(id);
    }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const result = await testConnection(id);
      if (result.success) {
        const responseTime = result.response_time_ms?.toFixed(0) || 'N/A';
        const message = `连接成功!\n响应时间: ${responseTime}ms\n状态: 在线`;
        setTimeout(() => {
          window.confirm(`✅ ${message}`);
        }, 100);
      } else {
        setTimeout(() => {
          window.confirm(`❌ 连接失败\n\n${result.message || '未知错误'}`);
        }, 100);
      }
      await refresh();
    } catch (error: any) {
      setTimeout(() => {
        window.confirm(`❌ 测试失败\n\n${error.message || '未知错误'}`);
      }, 100);
    } finally {
      setTestingId(null);
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingProvider(null);
  };

  const onlineCount = providers.filter(p => p.status === 'online').length;
  const offlineCount = providers.filter(p => p.status === 'offline').length;

  const filteredProviders = useMemo(() => {
    if (filter === 'online') {
      return providers.filter(p => p.status === 'online');
    } else if (filter === 'offline') {
      return providers.filter(p => p.status === 'offline');
    }
    return providers;
  }, [providers, filter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">LLM 提供商管理</h1>
          <p className="text-muted-foreground">
            配置和管理多个 LLM 的 API 密钥
            <span className="ml-2 text-cyan-400">
              ({onlineCount}/{providers.length} 在线)
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
            onClick={() => setFormOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            添加 LLM
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setFilter('online')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            filter === 'online'
              ? 'text-cyan-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          在线 ({onlineCount})
          {filter === 'online' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
          )}
        </button>
        <button
          onClick={() => setFilter('offline')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            filter === 'offline'
              ? 'text-cyan-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          离线 ({offlineCount})
          {filter === 'offline' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
          )}
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            filter === 'all'
              ? 'text-cyan-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          全部 ({providers.length})
          {filter === 'all' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

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
      ) : filteredProviders.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
            <Plus className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">还没有配置 LLM</h3>
          <p className="text-muted-foreground mb-4">
            添加一个 LLM 提供商来开始头脑风暴
          </p>
          <Button
            className="btn-glow bg-gradient-to-r from-cyan-500 to-blue-600"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            添加第一个 LLM
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProviders.map((provider, index) => (
            <div 
              key={provider.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <ProviderCard
                provider={provider}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTest={handleTest}
                testingId={testingId}
              />
            </div>
          ))}
        </div>
      )}

      <ProviderForm
        provider={editingProvider}
        open={formOpen}
        onOpenChange={handleCloseForm}
        onSubmit={editingProvider ? handleUpdate : handleCreate}
      />
    </div>
  );
}
