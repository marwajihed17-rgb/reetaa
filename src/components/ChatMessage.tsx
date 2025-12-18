'use client';

import { memo, useMemo } from 'react';
import { Chat, Attachment } from '@/types';
import { parseMessageToSegments } from '@/lib/url-processing';
import { formatFileSize } from '@/lib/file-handling';

interface ChatMessageProps {
  chat: Chat;
  isLast?: boolean;
}

/**
 * Get file icon SVG based on MIME type
 */
const getFileIconSvg = (mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    );
  }
  
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
};

/**
 * Message content with URL processing
 */
const MessageContent = memo(({ text, isUser }: { text: string; isUser: boolean }) => {
  const segments = useMemo(() => parseMessageToSegments(text), [text]);
  
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'link') {
          return (
            <a
              key={index}
              href={segment.href}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className={`${isUser ? 'text-blue-200 hover:text-blue-100' : 'text-blue-400 hover:text-blue-300'} hover:underline transition-colors`}
            >
              {segment.content}
            </a>
          );
        }
        
        const lines = segment.content.split('\n');
        return (
          <span key={index}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
              </span>
            ))}
          </span>
        );
      })}
    </>
  );
});
MessageContent.displayName = 'MessageContent';

/**
 * File attachment component
 */
const FileAttachment = memo(({ attachment, isUserMessage }: { attachment: Attachment; isUserMessage: boolean }) => {
  const fileSize = useMemo(() => formatFileSize(attachment.size), [attachment.size]);
  
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="nofollow noopener noreferrer"
      className={`
        flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.02]
        ${isUserMessage 
          ? 'bg-white/10 hover:bg-white/20' 
          : 'bg-[#242938] hover:bg-[#2a3144]'
        }
      `}
    >
      <div className={isUserMessage ? 'text-white' : 'text-gray-300'}>
        {getFileIconSvg(attachment.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isUserMessage ? 'text-white' : 'text-gray-200'}`}>
          {attachment.name}
        </p>
        <p className={`text-xs ${isUserMessage ? 'text-white/70' : 'text-gray-400'}`}>
          {fileSize}
        </p>
      </div>
      
      <svg 
        className={`w-4 h-4 shrink-0 ${isUserMessage ? 'text-white/80' : 'text-gray-400'}`}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        strokeWidth={2}
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
      </svg>
    </a>
  );
});
FileAttachment.displayName = 'FileAttachment';

/**
 * Main ChatMessage component
 */
const ChatMessage = memo(({ chat, isLast }: ChatMessageProps) => {
  const isUser = chat.sender === 'user';
  
  const time = useMemo(() => {
    return new Date(chat.created_at).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, [chat.created_at]);

  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${isLast ? 'animate-slide-up' : ''}`}
    >
      {isUser ? (
        // User message - compact rounded bubble
        <div className="max-w-[70%]">
          <div className="bg-gradient-to-r from-[#4A90F5] to-[#C74AFF] rounded-2xl px-4 py-3 shadow-lg">
            {chat.message && (
              <p className="text-white text-[15px] leading-relaxed break-words">
                <MessageContent text={chat.message} isUser={true} />
              </p>
            )}
            
            {chat.attachments && chat.attachments.length > 0 && (
              <div className={`space-y-2 ${chat.message ? 'mt-2' : ''}`}>
                {chat.attachments.map((attachment, index) => (
                  <FileAttachment 
                    key={index} 
                    attachment={attachment} 
                    isUserMessage={true}
                  />
                ))}
              </div>
            )}
            
            <p className="text-white/70 text-xs mt-2">{time}</p>
          </div>
        </div>
      ) : (
        // Bot message - dark bubble with border
        <div className="max-w-[70%]">
          <div className="bg-[#1a1f2e]/90 border border-[#2a3144] rounded-2xl px-4 py-3">
            {chat.message && (
              <p className="text-gray-100 text-[15px] leading-relaxed break-words">
                <MessageContent text={chat.message} isUser={false} />
              </p>
            )}
            
            {chat.attachments && chat.attachments.length > 0 && (
              <div className={`space-y-2 ${chat.message ? 'mt-2' : ''}`}>
                {chat.attachments.map((attachment, index) => (
                  <FileAttachment 
                    key={index} 
                    attachment={attachment} 
                    isUserMessage={false}
                  />
                ))}
              </div>
            )}
            
            <p className="text-gray-500 text-xs mt-2">{time}</p>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.message === nextProps.chat.message &&
    prevProps.isLast === nextProps.isLast
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
