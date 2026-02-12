import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [showThinking, setShowThinking] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="message-system px-4 py-3 max-w-[80%]">
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} mb-4`}>
      {/* Avatar */}
      <Avatar 
        className="w-10 h-10 flex-shrink-0"
        style={!isUser && message.llm_brand_color ? {
          boxShadow: `0 0 10px -2px ${message.llm_brand_color}`
        } : {}}
      >
        <AvatarFallback
          className="text-sm font-bold"
          style={!isUser && message.llm_brand_color ? {
            backgroundColor: `${message.llm_brand_color}30`,
            color: message.llm_brand_color
          } : isUser ? {
            backgroundColor: 'hsl(var(--cyan))',
            color: 'white'
          } : {}}
        >
          {isUser ? 'U' : message.llm_name?.charAt(0) || 'AI'}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {isUser ? '我' : message.llm_name || 'AI'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString('zh-CN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          {message.response_time_ms && (
            <span className="text-xs text-muted-foreground">
              ({message.response_time_ms.toFixed(0)}ms)
            </span>
          )}
        </div>

        {/* Message Body */}
        <div className={`relative group ${isUser ? 'message-user' : 'message-assistant'} p-4`}>
          {/* Content */}
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>

          {/* Thinking Content (for assistants) */}
          {!isUser && message.thinking_content && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showThinking ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                思考过程
              </button>
              {showThinking && (
                <div className="mt-2 p-3 rounded bg-black/30 text-sm text-muted-foreground font-mono whitespace-pre-wrap">
                  {message.thinking_content}
                </div>
              )}
            </div>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-white/10"
            title="复制内容"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Token Usage */}
        {message.tokens_used && (
          <span className="text-xs text-muted-foreground mt-1">
            {message.tokens_used.toLocaleString()} tokens
          </span>
        )}
      </div>
    </div>
  );
}
