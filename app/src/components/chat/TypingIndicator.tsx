import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TypingIndicatorProps {
  llmName: string;
  brandColor?: string;
}

export function TypingIndicator({ llmName, brandColor }: TypingIndicatorProps) {
  return (
    <div className="flex gap-3 mb-4">
      <Avatar 
        className="w-10 h-10 flex-shrink-0"
        style={brandColor ? {
          boxShadow: `0 0 10px -2px ${brandColor}`
        } : {}}
      >
        <AvatarFallback
          className="text-sm font-bold"
          style={brandColor ? {
            backgroundColor: `${brandColor}30`,
            color: brandColor
          } : {}}
        >
          {llmName.charAt(0)}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col items-start">
        <span className="text-sm font-medium mb-1">{llmName}</span>
        <div className="message-assistant px-4 py-3 flex items-center gap-1">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}
