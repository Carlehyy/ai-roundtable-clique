import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, 
  Play, 
  Trash2, 
  Users,
  CheckCircle2,
  Clock
} from 'lucide-react';
import type { Session } from '@/types';

interface SessionCardProps {
  session: Session;
  onEnter: (session: Session) => void;
  onStart: (id: number) => void;
  onDelete: (id: number) => void;
}

export function SessionCard({ session, onEnter, onStart, onDelete }: SessionCardProps) {
  const getStatusBadge = () => {
    if (session.is_completed) {
      return (
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          已完成
        </Badge>
      );
    }
    if (session.is_active) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/50 animate-pulse">
          <Play className="w-3 h-3 mr-1" />
          进行中
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
        <Clock className="w-3 h-3 mr-1" />
        准备就绪
      </Badge>
    );
  };

  return (
    <Card className="glass-card card-hover overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{session.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
              {session.description || session.topic}
            </p>
          </div>
          <div className="ml-3">
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Topic */}
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">讨论话题</p>
          <p className="text-sm line-clamp-2">{session.topic}</p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">讨论进度</span>
            <span>
              第 {session.current_round} / {session.max_rounds} 轮
            </span>
          </div>
          <Progress 
            value={(session.current_round / session.max_rounds) * 100} 
            className="h-2"
          />
        </div>

        {/* LLMs & Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div className="flex -space-x-2">
              {session.llms?.slice(0, 4).map((llm, i) => (
                <div
                  key={llm.id}
                  className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold"
                  style={{ 
                    backgroundColor: `${llm.brand_color}30`,
                    color: llm.brand_color,
                    zIndex: 4 - i
                  }}
                  title={llm.display_name}
                >
                  {llm.display_name.charAt(0)}
                </div>
              ))}
              {session.llms && session.llms.length > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs">
                  +{session.llms.length - 4}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            <span>{session.message_count || 0}</span>
          </div>
        </div>

        {/* Consensus */}
        {session.consensus_percentage > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">共识度:</span>
            <div className="flex-1">
              <Progress 
                value={session.consensus_percentage} 
                className="h-1.5"
              />
            </div>
            <span className="font-medium">{session.consensus_percentage.toFixed(0)}%</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1 btn-glow bg-gradient-to-r from-cyan-500 to-blue-600"
            onClick={() => onEnter(session)}
          >
            <MessageSquare className="w-4 h-4 mr-1.5" />
            进入讨论
          </Button>
          
          {!session.is_active && !session.is_completed && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => onStart(session.id)}
            >
              <Play className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="outline"
            size="icon"
            className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            onClick={() => onDelete(session.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
