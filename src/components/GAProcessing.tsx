import { useState } from 'react';
import { ChevronLeft, User, Trash2, LogOut, Paperclip, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BarChart3 } from 'lucide-react';

interface GAProcessingProps {
  onBack: () => void;
  onLogout: () => void;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

export function GAProcessing({ onBack, onLogout }: GAProcessingProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      const newMessage: Message = {
        id: Date.now(),
        text: message || `📎 ${attachments.length} file(s) attached`,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...messages, newMessage]);
      setMessage('');
      setAttachments([]);
      
      // Simulate bot response
      setTimeout(() => {
        const botMessage: Message = {
          id: Date.now(),
          text: 'I received your message and I\'m processing it...',
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMessage]);
      }, 1000);
    }
  };

  const handleClearMessages = () => {
    setMessages([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-[#2a3144] bg-[#0f1419]/50 backdrop-blur-md shrink-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-white hover:bg-[#1a1f2e]"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A90F5] to-[#C74AFF] flex items-center justify-center animated-gradient">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white">GA Processing</h1>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-500 text-sm">Status</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#1a1f2e]"
            >
              <User className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#1a1f2e]"
              onClick={handleClearMessages}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={onLogout}
              className="text-white hover:bg-[#1a1f2e] gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 hide-scrollbar">
        <div className="container mx-auto max-w-4xl h-full">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">Start a conversation to begin processing</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-[#4A90F5] to-[#C74AFF] text-white animated-gradient'
                        : 'bg-[#1a1f2e]/80 backdrop-blur-md border border-[#2a3144] text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="border-t border-[#2a3144] bg-[#0f1419]/50 backdrop-blur-md shrink-0">
        <div className="container mx-auto px-4 py-4">
          {/* Attachment Preview */}
          {attachments.length > 0 && (
            <div className="max-w-4xl mx-auto mb-3 flex gap-2 flex-wrap">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="bg-[#1a1f2e]/80 backdrop-blur-md border border-[#2a3144] rounded-lg px-3 py-2 flex items-center gap-2"
                >
                  <Paperclip className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-white truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-gray-400 hover:text-white ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <input
              type="file"
              id="file-input-ga"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => document.getElementById('file-input-ga')?.click()}
              className="text-gray-400 hover:bg-[#1a1f2e] shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-[#1a1f2e] border-[#2a3144] text-white placeholder:text-gray-500"
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() && attachments.length === 0}
              className="shrink-0 bg-gradient-to-r from-[#4A90F5] to-[#C74AFF] hover:opacity-90 text-white animated-gradient disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-gray-600 text-xs text-center mt-3">
            Activer Windows
          </p>
          <p className="text-gray-600 text-xs text-center">
            Accédez aux paramètres pour activer Windows
          </p>
        </div>
      </footer>
    </div>
  );
}
