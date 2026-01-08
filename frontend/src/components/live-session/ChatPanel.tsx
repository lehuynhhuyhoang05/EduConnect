import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Reply,
  Pin,
  Trash2,
  X,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/Dropdown';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date;
  isPinned?: boolean;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  attachments?: {
    type: 'image' | 'file';
    name: string;
    url: string;
  }[];
}

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content: string, replyTo?: string) => void;
  onPinMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  className?: string;
}

const ChatPanel = ({
  messages,
  currentUserId,
  onSendMessage,
  onPinMessage,
  onDeleteMessage,
  className,
}: ChatPanelProps) => {
  const [message, setMessage] = React.useState('');
  const [replyingTo, setReplyingTo] = React.useState<ChatMessage | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message, replyingTo?.id);
      setMessage('');
      setReplyingTo(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const pinnedMessages = messages.filter((m) => m.isPinned);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Pinned messages */}
      <AnimatePresence>
        {pinnedMessages.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-neutral-200 dark:border-neutral-800 p-3 space-y-2"
          >
            <p className="text-xs font-semibold text-neutral-500 uppercase">
              Tin nhắn ghim
            </p>
            {pinnedMessages.slice(0, 2).map((msg) => (
              <div
                key={msg.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20"
              >
                <Pin className="h-3 w-3 text-primary-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-primary-600">{msg.senderName}</span>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((msg, index) => {
          const isOwn = msg.senderId === currentUserId;
          const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;
          const showSenderName = true;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex gap-2',
                isOwn && 'flex-row-reverse'
              )}
            >
              {/* Avatar - show for both own and others when showAvatar */}
              {showAvatar ? (
                <Avatar name={msg.senderName} src={msg.senderAvatar} size="sm" />
              ) : (
                <div className="w-8" />
              )}

              {/* Message content */}
              <div className={cn('flex flex-col gap-1 max-w-[75%]', isOwn && 'items-end')}>
                {showSenderName && (
                  <span className={cn(
                    "text-xs font-medium",
                    isOwn 
                      ? "text-primary-400 dark:text-primary-300" 
                      : "text-neutral-600 dark:text-neutral-400"
                  )}>
                    {isOwn ? 'Bạn' : msg.senderName}
                  </span>
                )}

                {/* Reply preview */}
                {msg.replyTo && (
                  <div
                    className={cn(
                      'text-xs p-2 rounded-lg border-l-2',
                      'bg-neutral-100 dark:bg-neutral-800',
                      'border-neutral-400'
                    )}
                  >
                    <span className="font-medium">{msg.replyTo.senderName}</span>
                    <p className="text-neutral-500 truncate">{msg.replyTo.content}</p>
                  </div>
                )}

                <div className="group relative">
                  <div
                    className={cn(
                      'px-3 py-2 rounded-2xl',
                      isOwn
                        ? 'bg-primary-600 text-white rounded-tr-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-tl-sm'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {msg.attachments.map((attachment, i) => (
                        <a
                          key={i}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            'flex items-center gap-2 p-2 rounded-lg',
                            'bg-neutral-100 dark:bg-neutral-800',
                            'hover:bg-neutral-200 dark:hover:bg-neutral-700',
                            'transition-colors'
                          )}
                        >
                          {attachment.type === 'image' ? (
                            <ImageIcon className="h-4 w-4 text-primary-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-primary-500" />
                          )}
                          <span className="text-xs truncate">{attachment.name}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Message actions */}
                  <div
                    className={cn(
                      'absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity',
                      isOwn ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'
                    )}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side={isOwn ? 'left' : 'right'}>
                        <DropdownMenuItem onClick={() => setReplyingTo(msg)}>
                          <Reply className="h-4 w-4 mr-2" />
                          Trả lời
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPinMessage?.(msg.id)}>
                          <Pin className="h-4 w-4 mr-2" />
                          {msg.isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
                        </DropdownMenuItem>
                        {isOwn && (
                          <DropdownMenuItem
                            onClick={() => onDeleteMessage?.(msg.id)}
                            destructive
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Xóa
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <span className="text-xs text-neutral-500">
                  {msg.timestamp.toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-800"
          >
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary-600">
                  Trả lời {replyingTo.senderName}
                </p>
                <p className="text-xs text-neutral-500 truncate">{replyingTo.content}</p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setReplyingTo(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon-sm">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm">
            <Smile className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl',
                'bg-neutral-100 dark:bg-neutral-800',
                'text-sm text-neutral-900 dark:text-neutral-100',
                'placeholder:text-neutral-500',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/50'
              )}
            />
          </div>
          <Button
            variant="primary"
            size="icon"
            onClick={handleSend}
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export { ChatPanel };
export type { ChatMessage };
