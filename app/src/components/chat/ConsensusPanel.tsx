import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, Users, Target } from 'lucide-react';

interface ConsensusPanelProps {
  consensusPercentage: number;
  currentRound: number;
  maxRounds: number;
  totalMessages: number;
  llmCount: number;
}

export function ConsensusPanel({
  consensusPercentage,
  currentRound,
  maxRounds,
  totalMessages,
  llmCount,
}: ConsensusPanelProps) {
  const getConsensusColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getConsensusLabel = (percentage: number) => {
    if (percentage >= 80) return '高度共识';
    if (percentage >= 50) return '初步共识';
    return '讨论中';
  };

  // Calculate circle progress
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (consensusPercentage / 100) * circumference;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          共识进度
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Consensus Circle */}
        <div className="flex justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full progress-ring" viewBox="0 0 120 120">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="progress-ring-circle"
              />
              {/* Gradient definition */}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--cyan))" />
                  <stop offset="100%" stopColor="hsl(var(--blue))" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${getConsensusColor(consensusPercentage)}`}>
                {consensusPercentage.toFixed(0)}%
              </span>
              <span className="text-xs text-muted-foreground">
                {getConsensusLabel(consensusPercentage)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">参与 AI</span>
            </div>
            <p className="text-lg font-semibold">{llmCount}</p>
          </div>
          
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs">消息数</span>
            </div>
            <p className="text-lg font-semibold">{totalMessages}</p>
          </div>
        </div>

        {/* Round Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">讨论轮次</span>
            <span>{currentRound} / {maxRounds}</span>
          </div>
          <Progress 
            value={(currentRound / maxRounds) * 100} 
            className="h-2"
          />
        </div>

        {/* Status */}
        <div className={`p-3 rounded-lg border ${
          consensusPercentage >= 80 
            ? 'bg-green-500/10 border-green-500/30' 
            : consensusPercentage >= 50
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-cyan-500/10 border-cyan-500/30'
        }`}>
          <div className="flex items-start gap-2">
            {consensusPercentage >= 80 ? (
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-medium">
                {consensusPercentage >= 80 
                  ? '已达成共识' 
                  : consensusPercentage >= 50
                  ? '接近共识'
                  : '正在讨论'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {consensusPercentage >= 80 
                  ? '各位AI助手已就主要观点达成一致' 
                  : consensusPercentage >= 50
                  ? '观点正在趋同，继续讨论以深化共识'
                  : '各方正在充分表达不同观点'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
