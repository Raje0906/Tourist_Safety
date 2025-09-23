import React from 'react';

interface SafeVoyageLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const SafeVoyageLogo: React.FC<SafeVoyageLogoProps> = ({ className = "", size = 24, showText = false }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src="/safevoyage.jpg" 
        alt="Safe-Voyage Logo" 
        width={size} 
        height={size}
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
};

export default SafeVoyageLogo;