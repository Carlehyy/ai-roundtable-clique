import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TestTube, 
  Edit2, 
  Trash2, 
  Loader2,
  Cpu
} from 'lucide-react';
import type { LLMProvider } from '@/types';

interface ProviderCardProps {
  provider: LLMProvider;
  onEdit: (provider: LLMProvider) => void;
  onDelete: (id: number) => void;
  onTest: (id: number) => Promise<void>;
  testingId: number | null;
}

export function ProviderCard({ 
  provider, 
  onEdit, 
  onDelete, 
  onTest,
  testingId 
}: ProviderCardProps) {
  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await onTest(provider.id);
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      case 'testing':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  const quotaPercentage = provider.total_quota
    ? Math.min(100, (provider.used_quota / provider.total_quota) * 100)
    : 0;

  const isLowQuota = quotaPercentage > 80;

  return (
    <Card className="glass-card card-hover overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
              style={{ 
                backgroundColor: `${provider.brand_color}20`,
                color: provider.brand_color,
                boxShadow: `0 0 15px -3px ${provider.brand_color}40`
              }}
            >
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{provider.display_name}</h3>
              <p className="text-sm text-muted-foreground">{provider.model_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1.5 ${
                provider.status === 'online' ? 'border-green-500/50 text-green-400' : ''
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${getStatusColor(provider.status)} ${
                provider.status === 'online' ? 'animate-pulse' : ''
              }`} />
              {provider.status === 'online' ? '在线' : 
               provider.status === 'offline' ? '离线' : 
               provider.status === 'testing' ? '测试中' : '错误'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quota Progress */}
        {provider.total_quota && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">额度使用</span>
              <span className={isLowQuota ? 'text-amber-400' : ''}>
                {quotaPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={quotaPercentage} 
              className={`h-2 ${isLowQuota ? 'bg-amber-500/20' : ''}`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>已用: {provider.used_quota.toLocaleString()}</span>
              <span>总额: {provider.total_quota.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground mb-1">平均响应</p>
            <p className="text-sm font-medium">
              {provider.avg_response_time 
                ? `${provider.avg_response_time.toFixed(0)}ms` 
                : 'N/A'}
            </p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground mb-1">成功率</p>
            <p className="text-sm font-medium">{provider.success_rate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Last Online Time */}
        <div className="bg-secondary/50 rounded-lg p-2.5">
          <p className="text-xs text-muted-foreground mb-1">最近在线时间</p>
          <p className="text-sm font-medium">
            {provider.last_used_at 
              ? new Date(provider.last_used_at).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                }).replace(/\//g, '-')
              : '-'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleTest}
            disabled={isTesting || testingId === provider.id}
          >
            {isTesting || testingId === provider.id ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4 mr-1.5" />
            )}
            测试
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(provider)}
          >
            <Edit2 className="w-4 h-4 mr-1.5" />
            编辑
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="px-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            onClick={() => onDelete(provider.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
