
import React from 'react';

export const CheckelsIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="50" cy="50" r="48" fill="#FFA500" stroke="#E67E00" strokeWidth="2"/>
    <circle cx="50" cy="50" r="42" fill="#FFD700" stroke="#FFA500" strokeWidth="2"/>
    <circle cx="50" cy="50" r="36" fill="#FFFF00" stroke="#FFD700" strokeWidth="2"/>
    <circle cx="50" cy="50" r="30" fill="#FFA500"/>
    <path 
      d="M35 25 L35 75 M50 15 L50 85 M65 25 L65 75" 
      stroke="#FFD700" 
      strokeWidth="3" 
      strokeLinecap="round"
    />
    <path 
      d="M30 35 Q30 25 40 25 L60 25 Q70 25 70 35 Q70 45 60 45 L40 45 Q30 45 30 35 Z" 
      fill="#FFD700"
    />
    <path 
      d="M30 55 Q30 45 40 45 L60 45 Q70 45 70 55 Q70 65 60 65 L40 65 Q30 65 30 55 Z" 
      fill="#FFD700"
    />
    <text 
      x="50" 
      y="57" 
      textAnchor="middle" 
      fontSize="24" 
      fontWeight="bold" 
      fill="#E67E00"
    >
      ₵
    </text>
  </svg>
);

export const ChipsIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Stack of chips */}
    <ellipse cx="50" cy="85" rx="35" ry="8" fill="#1E40AF" opacity="0.3"/>
    <ellipse cx="50" cy="80" rx="35" ry="8" fill="#3B82F6"/>
    <ellipse cx="50" cy="75" rx="35" ry="8" fill="#60A5FA"/>
    <ellipse cx="50" cy="70" rx="35" ry="8" fill="#3B82F6"/>
    <ellipse cx="50" cy="65" rx="35" ry="8" fill="#60A5FA"/>
    <ellipse cx="50" cy="60" rx="35" ry="8" fill="#3B82F6"/>
    
    {/* Top chip details */}
    <circle cx="50" cy="60" r="30" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2"/>
    <circle cx="50" cy="60" r="25" fill="#60A5FA" stroke="#3B82F6" strokeWidth="1"/>
    <circle cx="50" cy="60" r="20" fill="#3B82F6"/>
    <circle cx="50" cy="60" r="15" fill="#93C5FD"/>
    
    {/* Chip pattern */}
    <circle cx="50" cy="60" r="8" fill="#1E40AF"/>
    <circle cx="35" cy="60" r="3" fill="#1E40AF"/>
    <circle cx="65" cy="60" r="3" fill="#1E40AF"/>
    <circle cx="50" cy="45" r="3" fill="#1E40AF"/>
    <circle cx="50" cy="75" r="3" fill="#1E40AF"/>
    
    {/* Value indicator */}
    <text 
      x="50" 
      y="65" 
      textAnchor="middle" 
      fontSize="12" 
      fontWeight="bold" 
      fill="white"
    >
      100
    </text>
  </svg>
);
