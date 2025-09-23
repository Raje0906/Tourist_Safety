import React from 'react';

interface SafeVoyageLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const SafeVoyageLogo: React.FC<SafeVoyageLogoProps> = ({ className = "", size = 24, showText = false }) => {
  const logoSize = showText ? size * 3 : size;
  const compassSize = showText ? size * 1.5 : size;
  
  return (
    <div className={`flex ${showText ? 'flex-col items-center' : 'items-center justify-center'} ${className}`}
         style={{ 
           backgroundColor: 'white', 
           padding: showText ? '6px' : '3px', 
           borderRadius: '6px',
           boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
         }}>
      {/* Compass SVG */}
      <svg 
        width={compassSize} 
        height={compassSize} 
        viewBox="0 0 120 120" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer compass ring */}
        <circle 
          cx="60" 
          cy="60" 
          r="48" 
          fill="none" 
          stroke="#1e3a8a" 
          strokeWidth="3" 
        />
        
        {/* Inner compass ring */}
        <circle 
          cx="60" 
          cy="60" 
          r="38" 
          fill="none" 
          stroke="#1e3a8a" 
          strokeWidth="2" 
        />
        
        {/* Innermost ring */}
        <circle 
          cx="60" 
          cy="60" 
          r="30" 
          fill="none" 
          stroke="#1e3a8a" 
          strokeWidth="1" 
          opacity="0.5" 
        />
        
        {/* Circuit pattern - exactly like your image */}
        <g stroke="#0ea5e9" strokeWidth="1" fill="#0ea5e9">
          {/* Main circuit nodes */}
          <circle cx="60" cy="12" r="1.5" />
          <circle cx="60" cy="108" r="1.5" />
          <circle cx="12" cy="60" r="1.5" />
          <circle cx="108" cy="60" r="1.5" />
          
          {/* Diagonal circuit nodes */}
          <circle cx="83" cy="23" r="1" />
          <circle cx="37" cy="23" r="1" />
          <circle cx="83" cy="97" r="1" />
          <circle cx="37" cy="97" r="1" />
          
          {/* Circuit lines from center outward */}
          <line x1="60" y1="12" x2="60" y2="20" strokeWidth="1" />
          <line x1="60" y1="108" x2="60" y2="100" strokeWidth="1" />
          <line x1="12" y1="60" x2="20" y2="60" strokeWidth="1" />
          <line x1="108" y1="60" x2="100" y2="60" strokeWidth="1" />
          
          {/* Diagonal circuit lines */}
          <line x1="83" y1="23" x2="75" y2="31" strokeWidth="1" />
          <line x1="37" y1="23" x2="45" y2="31" strokeWidth="1" />
          <line x1="83" y1="97" x2="75" y2="89" strokeWidth="1" />
          <line x1="37" y1="97" x2="45" y2="89" strokeWidth="1" />
          
          {/* Additional small circuit nodes */}
          <circle cx="75" cy="31" r="0.8" />
          <circle cx="45" cy="31" r="0.8" />
          <circle cx="75" cy="89" r="0.8" />
          <circle cx="45" cy="89" r="0.8" />
          
          {/* Extended circuit lines */}
          <line x1="75" y1="31" x2="70" y2="36" strokeWidth="0.8" />
          <line x1="45" y1="31" x2="50" y2="36" strokeWidth="0.8" />
          <line x1="75" y1="89" x2="70" y2="84" strokeWidth="0.8" />
          <line x1="45" y1="89" x2="50" y2="84" strokeWidth="0.8" />
        </g>
        
        {/* Main compass star - 4 pointed like your image */}
        <g fill="#0ea5e9">
          {/* North point */}
          <path d="M60 20 L50 50 L60 45 L70 50 Z" />
          
          {/* South point */}
          <path d="M60 100 L50 70 L60 75 L70 70 Z" />
          
          {/* East point */}
          <path d="M100 60 L70 50 L75 60 L70 70 Z" />
          
          {/* West point */}
          <path d="M20 60 L50 50 L45 60 L50 70 Z" />
        </g>
        
        {/* Compass center - white with dark border */}
        <circle cx="60" cy="60" r="6" fill="white" stroke="#1e3a8a" strokeWidth="2" />
        <circle cx="60" cy="60" r="3" fill="#1e3a8a" />
        
        {/* Direction letters */}
        <g fill="#1e3a8a" fontSize="12" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">
          <text x="60" y="15" dominantBaseline="middle">N</text>
          <text x="60" y="110" dominantBaseline="middle">S</text>
          <text x="110" y="65" dominantBaseline="middle">E</text>
          <text x="10" y="65" dominantBaseline="middle">W</text>
        </g>
      </svg>
      
      {/* Safe-Voyage Text */}
      {showText && (
        <div className="text-center">
          <div className="text-2xl font-bold">
            <span style={{ color: '#1e3a8a' }}>Safe-</span>
            <span style={{ color: '#0ea5e9' }}>Voyage</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafeVoyageLogo;