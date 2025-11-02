import { useState, useEffect, useRef } from "react";
import { Mic, X, Send, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Bujji = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log('Recognized:', transcript);
        
        // Emergency detection
        if (transcript.includes('emergency') || transcript.includes('urgent help')) {
          setIsOpen(true);
          const emergencyMsg = "🚨 EMERGENCY DETECTED! Stay calm naa! I'm here to help. What do you need?";
          setMessages(prev => [...prev, 
            { role: 'user', content: transcript },
            { role: 'assistant', content: emergencyMsg }
          ]);
          speak(emergencyMsg);
          toast({
            title: "🚨 Emergency Mode Active",
            description: "Bujji is ready to help immediately",
            variant: "destructive"
          });
          return;
        }
        
        // Wake word detection
        if (transcript.includes('hey bujji') || transcript.includes('hai bujji')) {
          if (!isOpen) {
            setIsOpen(true);
            speak("Hi naa! Nenu ikkadane unna. Ela unnav?");
          }
        } else if (isListening && isOpen) {
          // Process command
          setMessage(transcript);
          handleSendMessage(transcript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const userName = session.user.email?.split('@')[0] || 'there';
        const welcomeMsg = `Welcome back, ${userName}! I'm Bujji, your AI assistant. How can I help you today?`;
        setMessages([{
          role: 'assistant',
          content: welcomeMsg
        }]);
        setIsOpen(true);
        speak(welcomeMsg);
        setTimeout(() => setIsOpen(false), 5000);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const speak = (text: string) => {
    if (synthRef.current) {
      synthRef.current.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      synthRef.current.speak(utterance);
    }
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      toast({
        title: "Stopped listening",
        description: "Voice input disabled",
      });
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Say 'Hey Bujji' or speak your command",
      });
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || message.trim();
    if (!messageText) return;
    
    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('bujji-chat', {
        body: { messages: [...messages, userMessage] }
      });

      if (error) throw error;

      const assistantMessage = { role: 'assistant', content: data.reply };
      setMessages(prev => [...prev, assistantMessage]);
      speak(data.reply);
    } catch (error) {
      console.error('Error calling Bujji:', error);
      const errorMsg = "Sorry, I'm having trouble connecting. Please try again!";
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      speak(errorMsg);
      toast({
        title: "Connection error",
        description: "Could not reach Bujji AI",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Bujji Orb */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-16 h-16 rounded-full bg-gradient-cosmic shadow-glow-primary hover:shadow-glow-secondary transition-all duration-300 flex items-center justify-center ${
            isListening ? "animate-pulse" : ""
          }`}
        >
          <Mic className="w-8 h-8 text-primary-foreground" />
        </button>
      </div>

      {/* Bujji Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-28 right-8 w-80 h-96 bg-card border border-border/30 rounded-lg shadow-glow-primary backdrop-blur-lg z-50 flex flex-col">
          <div className="p-4 border-b border-border/30 flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
              Bujji AI Assistant
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg p-3 text-sm ${
                    msg.role === 'assistant'
                      ? 'bg-muted/30 text-muted-foreground'
                      : 'bg-primary/10 text-foreground ml-8'
                  }`}
                >
                  <p>{msg.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-border/30">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleVoiceInput}
                className={isListening ? "bg-accent animate-pulse" : ""}
              >
                {isListening ? (
                  <Mic className="w-4 h-4 text-accent-foreground" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
              </Button>
              <Input
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
                disabled={isLoading}
              />
              <Button 
                size="icon" 
                onClick={() => handleSendMessage()} 
                disabled={isLoading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Bujji;
