import { useState, useEffect, useRef } from 'react';
import { Send, LogOut, User as UserIcon, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import logo from 'figma:asset/220dab80c3731b3a44f7ce1394443acd5caffa99.png';

interface ChatInterfaceProps {
  onBack: () => void;
  onLogout: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

export function ChatInterface({ onBack, onLogout }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session and load data from localStorage
  useEffect(() => {
    // Get or create sessionId
    let storedSessionId = localStorage.getItem('chatSessionId');
    if (!storedSessionId) {
      storedSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('chatSessionId', storedSessionId);
    }
    setSessionId(storedSessionId);

    // Get username from user data
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUsername(user.username || 'User');
      } catch (error) {
        console.error('Failed to parse user data:', error);
        setUsername('User');
      }
    }

    // Load chat history from localStorage
    const storedMessages = localStorage.getItem('chatHistory');
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch (error) {
        console.error('Failed to parse chat history:', error);
      }
    }

    // Get n8n webhook URL from localStorage or environment variable
    const storedWebhookUrl = localStorage.getItem('n8nWebhookUrl') ||
                              import.meta.env.VITE_N8N_WEBHOOK_URL || '';
    setN8nWebhookUrl(storedWebhookUrl);

    return () => {
      // Cleanup polling on unmount
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Start polling for updates
  useEffect(() => {
    if (!sessionId) return;

    // Poll every 1 second
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/get-updates?sessionId=${sessionId}`);
        const data = await response.json();

        if (data.success && data.messages && data.messages.length > 0) {
          console.log(`Received ${data.messages.length} new messages from n8n`);

          // Add new messages from n8n
          const newMessages = data.messages.map((msg: { reply: string; timestamp: number }) => ({
            id: `ai_${msg.timestamp}_${Math.random().toString(36).substring(7)}`,
            text: msg.reply,
            sender: 'ai' as const,
            timestamp: msg.timestamp
          }));

          setMessages(prev => [...prev, ...newMessages]);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000); // Poll every 1 second

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [sessionId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    if (!n8nWebhookUrl) {
      alert('Please set your n8n webhook URL first. You can set it in localStorage with key "n8nWebhookUrl"');
      return;
    }

    // Add user message to chat
    const userMessage: Message = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      text: inputValue,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Send message to n8n webhook
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: inputValue,
          username
        })
      });

      if (!response.ok) {
        throw new Error(`n8n webhook failed: ${response.status}`);
      }

      console.log('Message sent to n8n successfully');

      // Note: Responses will come through polling (get-updates endpoint)
      // The n8n workflow will send multiple async responses to /api/receive-response
      // which will be picked up by the polling mechanism

    } catch (error) {
      console.error('Error sending message to n8n:', error);
      setIsLoading(false);

      // Add error message
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        text: 'Sorry, there was an error sending your message. Please check your n8n webhook URL and try again.',
        sender: 'ai',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    if (confirm('Are you sure you want to clear all chat history?')) {
      setMessages([]);
      localStorage.removeItem('chatHistory');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[#2a3144] bg-[#0f1419]/50 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Retaam Solutions" className="h-10" />
            <div className="flex items-center gap-2 text-white">
              <MessageCircle className="w-5 h-5 text-[#4A90F5]" />
              <span className="font-semibold">AI Chat Assistant</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white">
              <UserIcon className="w-5 h-5" />
              <span className="text-sm">{username}</span>
            </div>
            <Button
              variant="ghost"
              onClick={clearChat}
              className="text-white hover:bg-[#1a1f2e] h-9 px-3"
            >
              Clear Chat
            </Button>
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-white hover:bg-[#1a1f2e] h-9 px-3"
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={onLogout}
              className="text-white hover:bg-[#1a1f2e] gap-2 h-9 px-3"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 container mx-auto px-6 py-6 flex flex-col max-w-4xl">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Start a conversation with the AI assistant</p>
                <p className="text-sm mt-2">Your chat history is stored locally in your browser</p>
                {!n8nWebhookUrl && (
                  <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg max-w-md mx-auto">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ n8n webhook URL not set. Set it in localStorage with key "n8nWebhookUrl"
                    </p>
                  </div>
                )}
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-br from-[#4A90F5] to-[#5EA3F7] text-white'
                      : 'bg-[#1a1f2e]/80 backdrop-blur-sm border border-[#2a3144] text-white'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                  <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#1a1f2e]/80 backdrop-blur-sm border border-[#2a3144] rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="pt-4 border-t border-[#2a3144]">
          <div className="flex gap-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 bg-[#1a1f2e]/80 border-[#2a3144] text-white placeholder:text-gray-500"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-gradient-to-br from-[#4A90F5] to-[#5EA3F7] hover:from-[#5EA3F7] hover:to-[#4A90F5] text-white px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Session Info */}
          <div className="mt-3 text-xs text-gray-500">
            <p>Session ID: {sessionId}</p>
            <p>Messages are stored locally in your browser only</p>
          </div>
        </div>
      </div>

      {/* Signature */}
      <div className="border-t border-[#2a3144] py-4">
        <div className="container mx-auto px-6 flex items-center justify-end gap-4">
          <div className="h-0.5 w-64 bg-gradient-to-r from-[#4A90F5] to-[#C74AFF] animated-gradient"></div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">PAA--Solutions Tool</p>
            <p className="text-gray-500 text-xs">WWW.PAA-Solutions.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
