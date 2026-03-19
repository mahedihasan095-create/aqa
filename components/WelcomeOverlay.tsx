
import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { WelcomeConfig } from '../types';

interface WelcomeOverlayProps {
  config: WelcomeConfig;
}

const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ config }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!config.isEnabled) return;

    // Fireworks effect
    const duration = config.duration * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        setIsVisible(false);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, [config]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Background Dimming */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in pointer-events-auto" onClick={() => setIsVisible(false)}></div>
      
      {/* Balloons Container */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div 
            key={i} 
            className="absolute bottom-[-100px] animate-balloon"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${6 + Math.random() * 4}s`,
              backgroundColor: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'][Math.floor(Math.random() * 5)],
              width: '40px',
              height: '50px',
              borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
              boxShadow: 'inset -5px -5px 10px rgba(0,0,0,0.1)'
            }}
          >
            <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0.5 h-10 bg-gray-400/50"></div>
          </div>
        ))}
      </div>

      {/* Message Box */}
      <div className="relative z-[1001] bg-white/90 dark:bg-gray-800/90 p-10 rounded-[40px] shadow-2xl border-4 border-indigo-500/30 text-center max-w-2xl mx-4 animate-scale-in pointer-events-auto">
        <div className="mb-6">
          <i className="fas fa-gift text-6xl text-indigo-600 animate-bounce"></i>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-indigo-900 dark:text-indigo-300 leading-tight">
          {config.message || 'স্বাগতম!'}
        </h1>
        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => setIsVisible(false)}
            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>

      <style>{`
        @keyframes balloon {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-120vh) rotate(20deg); opacity: 0; }
        }
        .animate-balloon {
          animation-name: balloon;
          animation-timing-function: ease-in;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
};

export default WelcomeOverlay;
