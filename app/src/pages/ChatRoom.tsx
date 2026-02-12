import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Send, 
  Play, 
  Square, 
  Users,
  Target,
  Loader2
} from 'lucide-react';
import { sessionApi, messageApi } from '@/services/api';
import { wsService } from '@/services/websocket';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ConsensusPanel } from '@/components/chat/ConsensusPanel';
import type { Session, Message, WSMessageType } from '@/types';

type Page = 'dashboard' | 'providers' | 'sessions' | 'chat';

interface ChatRoomProps {
  sessionId: number;
  onNavigate: (page: Page) => void;
}

export function ChatRoom({ sessionId, onNavigate }: ChatRoomProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [typingLLM, setTypingLLM] = useState<{ id: number; name: string } | null>(null);
  const [consensusData, setConsensusData] = useState({
    percentage: 0,
    currentRound: 0,
  });

  // Load session and messages
  useEffect(() => {
    const loadData = async () => {
      try {
        const [sessionData, messagesData] = await Promise.all([
          sessionApi.getById(sessionId),
          messageApi.getBySession(sessionId),
        ]);
        setSession(sessionData);
        setMessages(messagesData);
        setConsensusData(prev => ({
          ...prev,
          currentRound: sessionData.current_round,
          percentage: sessionData.consensus_percentage,
        }));
      } catch (error) {
        console.error('Failed to load session:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sessionId]);

  // WebSocket connection
  useEffect(() => {
    if (!sessionId) return;

    const connectWebSocket = async () => {
      try {
        await wsService.connect(sessionId);
        setWsConnected(true);

        // Subscribe to events
        wsService.on('new_message' as WSMessageType, (data) => {
          setMessages(prev => [...prev, data as Message]);
        });

        wsService.on('llm_typing' as WSMessageType, (data) => {
          setTypingLLM({ id: data.llm_id, name: data.llm_name });
        });

        wsService.on('llm_stopped_typing' as WSMessageType, () => {
          setTypingLLM(null);
        });

        wsService.on('consensus_update' as WSMessageType, (data) => {
          setConsensusData(prev => ({
            ...prev,
            percentage: data.consensus_percentage,
          }));
        });

        wsService.on('round_update' as WSMessageType, (data) => {
          setConsensusData(prev => ({
            ...prev,
            currentRound: data.current_round,
          }));
        });

        wsService.on('session_completed' as WSMessageType, () => {
          setSession(prev => prev ? { ...prev, is_completed: true } : null);
        });

      } catch (error) {
        console.error('WebSocket connection failed:', error);
        setWsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      wsService.disconnect();
    };
  }, [sessionId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingLLM]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Send via WebSocket
    wsService.send('send_message' as WSMessageType, {
      content: inputMessage,
    });

    // Optimistically add message
    const tempMessage: Message = {
      id: Date.now(),
      session_id: sessionId,
      role: 'user',
      content: inputMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMessage]);
    setInputMessage('');
  };

  const handleStartBrainstorm = async () => {
    try {
      await sessionApi.startBrainstorm(sessionId);
      setSession(prev => prev ? { ...prev, is_active: true } : null);
    } catch (error) {
      console.error('Failed to start brainstorm:', error);
    }
  };

  const handleStopBrainstorm = async () => {
    try {
      await sessionApi.stopBrainstorm(sessionId);
      setSession(prev => prev ? { ...prev, is_active: false } : null);
    } catch (error) {
      console.error('Failed to stop brainstorm:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground mb-4">会话不存在</p>
        <Button onClick={() => onNavigate('sessions')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回讨论室
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4 animate-fade-in">
      {/* Left Sidebar - Session Info */}
      <div className="w-64 hidden lg:block flex-shrink-0">
        <Card className="glass-card h-full">
          <CardHeader className="pb-3">
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2"
              onClick={() => onNavigate('sessions')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <CardTitle className="text-lg line-clamp-2">{session.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Topic */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">话题</p>
              <p className="text-sm line-clamp-4">{session.topic}</p>
            </div>

            {/* Status */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">状态</p>
              <div className="flex items-center gap-2">
                {session.is_completed ? (
                  <Badge className="bg-purple-500/20 text-purple-400">
                    已完成
                  </Badge>
                ) : session.is_active ? (
                  <Badge className="bg-green-500/20 text-green-400 animate-pulse">
                    进行中
                  </Badge>
                ) : (
                  <Badge variant="outline">准备就绪</Badge>
                )}
                {wsConnected && (
                  <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                    实时
                  </Badge>
                )}
              </div>
            </div>

            {/* LLMs */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" />
                参与的 AI
              </p>
              <div className="space-y-2">
                {session.llms?.map((llm) => (
                  <div
                    key={llm.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: `${llm.brand_color}30`,
                        color: llm.brand_color,
                      }}
                    >
                      {llm.display_name.charAt(0)}
                    </div>
                    <span className="text-sm truncate">{llm.display_name}</span>
                    {typingLLM?.id === llm.id && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Control Buttons */}
            {!session.is_completed && (
              <div className="pt-2">
                {session.is_active ? (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleStopBrainstorm}
                  >
                    <Square className="w-4 h-4 mr-2" />
                    停止讨论
                  </Button>
                ) : (
                  <Button
                    className="w-full btn-glow bg-gradient-to-r from-cyan-500 to-blue-600"
                    onClick={handleStartBrainstorm}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    开始讨论
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Card className="glass-card flex-1 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => onNavigate('sessions')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="font-semibold line-clamp-1">{session.title}</h2>
                <p className="text-xs text-muted-foreground">
                  第 {consensusData.currentRound} / {session.max_rounds} 轮
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="w-4 h-4" />
                <span>共识: {consensusData.percentage.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              
              {typingLLM && (
                <TypingIndicator 
                  llmName={typingLLM.name}
                  brandColor={session.llms?.find(l => l.id === typingLLM.id)?.brand_color}
                />
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          {!session.is_completed && (
            <div className="p-4 border-t border-border/50">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息参与讨论..."
                  className="input-glow flex-1"
                  disabled={!session.is_active}
                />
                <Button
                  className="btn-glow bg-gradient-to-r from-cyan-500 to-blue-600"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || !session.is_active}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {!session.is_active && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  点击左侧"开始讨论"按钮启动 AI 讨论
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Right Sidebar - Consensus Panel */}
      <div className="w-72 hidden xl:block flex-shrink-0">
        <ConsensusPanel
          consensusPercentage={consensusData.percentage}
          currentRound={consensusData.currentRound}
          maxRounds={session.max_rounds}
          totalMessages={messages.length}
          llmCount={session.llms?.length || 0}
        />
      </div>
    </div>
  );
}
