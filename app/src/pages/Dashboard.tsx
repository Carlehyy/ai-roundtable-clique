import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Cpu, 
  Zap, 
  TrendingUp,
  Activity,
  ArrowRight,
  Plus
} from 'lucide-react';
import { statsApi } from '@/services/api';
import type { SystemStats } from '@/types';

type Page = 'dashboard' | 'providers' | 'sessions' | 'chat';

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await statsApi.getSystemStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      title: '总讨论数',
      value: stats?.total_sessions || 0,
      icon: MessageSquare,
      color: 'from-cyan-500 to-blue-500',
      trend: '+12%',
    },
    {
      title: '活跃讨论',
      value: stats?.active_sessions || 0,
      icon: Activity,
      color: 'from-green-500 to-emerald-500',
      trend: '实时',
    },
    {
      title: '总消息数',
      value: stats?.total_messages || 0,
      icon: Zap,
      color: 'from-purple-500 to-pink-500',
      trend: '+28%',
    },
    {
      title: '在线 LLM',
      value: stats?.online_llms || 0,
      icon: Cpu,
      color: 'from-amber-500 to-orange-500',
      trend: `${stats?.total_llms || 0} 总计`,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/20 p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwNmI2ZDQiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            欢迎来到 <span className="gradient-text">SynapseMind</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-6">
            智汇圆桌 - 让多个 AI 助手围绕话题进行头脑风暴，
            各抒己见，逐步达成共识。
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              className="btn-glow bg-gradient-to-r from-cyan-500 to-blue-600"
              size="lg"
              onClick={() => onNavigate('sessions')}
            >
              <Plus className="w-5 h-5 mr-2" />
              发起讨论
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => onNavigate('providers')}
            >
              配置 LLM
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card 
              key={card.title} 
              className="glass-card card-hover overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
                    <p className="text-3xl font-bold">
                      {loading ? (
                        <span className="animate-pulse">--</span>
                      ) : (
                        card.value.toLocaleString()
                      )}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">{card.trend}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              快速开始
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              创建一个新的头脑风暴会话，选择多个 AI 助手参与讨论。
            </p>
            <Button 
              className="w-full btn-glow bg-gradient-to-r from-cyan-500 to-blue-600"
              onClick={() => onNavigate('sessions')}
            >
              创建新讨论
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              LLM 配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              配置和管理多个 LLM 提供商的 API 密钥和状态监控。
            </p>
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => onNavigate('providers')}
            >
              管理提供商
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
