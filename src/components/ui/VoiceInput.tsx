"use client";

import { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
  placeholder?: string;
}

export function VoiceInput({ onTranscript, className = '', placeholder = 'Dictate...' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for browser support
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-GB'; // Default to UK English

        recognitionInstance.onstart = () => {
          setIsListening(true);
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
        };

        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          
          if (event.error === 'not-allowed') {
            toast.error('Microphone access denied. Please enable permissions.');
          } else {
            toast.error('Voice input error. Please try again.');
          }
        };

        recognitionInstance.onresult = (event: any) => {
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            onTranscript(finalTranscript);
          }
        };

        setRecognition(recognitionInstance);
      } else {
        setIsSupported(false);
      }
    }
  }, [onTranscript]);

  const toggleListening = useCallback(() => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
      }
    }
  }, [recognition, isListening]);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`
        relative flex items-center justify-center p-2 rounded-lg transition-all duration-200
        ${isListening 
          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/50' 
          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
        }
        ${className}
      `}
      title={isListening ? "Stop recording" : "Start voice input"}
    >
      {isListening ? (
        <>
          <span className="absolute inset-0 rounded-lg animate-ping bg-red-500/20 opacity-75"></span>
          <Mic className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
        </>
      ) : (
        <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
      )}
    </button>
  );
}
