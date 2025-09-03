import React from 'react';
import logoSvg from '../../assets/logo.svg';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center justify-center leading-none overflow-hidden ${className}`}>
      <div className="relative group">
        {/* Main logo with hover animations */}
        <img 
          src={logoSvg} 
          className="block w-32 h-32 transition-all duration-300 ease-in-out
                     group-hover:scale-110 group-hover:rotate-6
                     drop-shadow-lg group-hover:drop-shadow-xl
                     filter group-hover:brightness-110"
        />
        
        {/* Animated background glow */}
        <div className="absolute inset-0 -z-10 rounded-full 
                        bg-gradient-to-r from-blue-500/20 to-purple-500/20
                        blur-xl scale-75 opacity-0
                        group-hover:opacity-100 group-hover:scale-100
                        transition-all duration-500 ease-out" />
        
        {/* Pulse animation ring */}
        <div className="absolute inset-0 -z-20 rounded-full
                        border-2 border-blue-400/30 scale-100 opacity-0
                        group-hover:scale-125 group-hover:opacity-100
                        transition-all duration-700 ease-out
                        animate-pulse" />
      </div>
    </div>
  );
}; 