import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  isLogo?: boolean;
  onFailure?: (debugInfo: any) => void;
}

const ResilientImage: React.FC<ResilientImageProps> = ({ src, alt, className, isLogo, onFailure }) => {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [attempt, setAttempt] = useState(0);
  const [useCors, setUseCors] = useState(true); // Try CORS first (needed for PDF)
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0); // To force re-render on CORS change

  useEffect(() => {
    setCurrentSrc(src);
    setAttempt(0);
    setUseCors(true);
    setError(false);
    setKey(prev => prev + 1);
  }, [src]);

  const handleError = () => {
    // 1. CORS Fallback: If we failed with CORS, try without CORS for the SAME URL first.
    // This ensures the image appears on screen (browser) even if it might fail in PDF generation.
    if (useCors) {
      setUseCors(false);
      setKey(prev => prev + 1); // Force img tag recreation
      return;
    }

    // 2. URL Strategy Fallback: If we failed without CORS, this URL is dead. Move to next strategy.
    // Robust ID Extraction
    let driveId = '';
    const cleanUrl = src || '';
    
    // Universal "Vacuum" Regex for ID (25+ alphanumeric chars)
    const vacuumMatch = cleanUrl.match(/([-a-zA-Z0-9_]{25,})/);
    if (vacuumMatch && vacuumMatch[1]) {
      driveId = vacuumMatch[1];
    }

    if (onFailure && !isLogo) {
      onFailure({ input: cleanUrl, extractedId: driveId });
    }

    // Reset CORS to true for the next URL attempt (we always want to try CORS first)
    setUseCors(true);
    const cacheBuster = `&t=${Date.now()}`;

    if (driveId && attempt === 0) {
      // 1. Thumbnail API (Most permissive, bypasses virus scan pages)
      const fallbackUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000${cacheBuster}`;
      setCurrentSrc(fallbackUrl);
      setAttempt(1);
    } else if (driveId && attempt === 1) {
       // 2. Export Link (Standard download)
       const fallbackUrl = `https://drive.google.com/uc?export=view&id=${driveId}${cacheBuster}`;
       setCurrentSrc(fallbackUrl);
       setAttempt(2);
    } else if (driveId && attempt === 2) {
       // 3. Content CDN (Fastest, but sometimes restricted)
       const fallbackUrl = `https://lh3.googleusercontent.com/d/${driveId}`;
       setCurrentSrc(fallbackUrl);
       setAttempt(3);
    } else {
      setError(true);
    }
  };

  if (error) {
    return isLogo ? (
      <div className="flex items-center justify-center w-full h-full bg-gray-50/50 text-gray-400 rounded text-[8px] border border-white/20">
        <span className="font-bold tracking-tighter">LOGO</span>
      </div>
    ) : (
        <div className="flex flex-col items-center justify-center text-gray-300 bg-gray-50 w-full h-full p-4 text-center">
           <ImageOff className="w-8 h-8 opacity-20 mb-2" />
           <span className="text-[9px] font-medium opacity-40">No Image</span>
        </div>
    );
  }

  return (
    <img 
      key={`${currentSrc}-${key}`} // Force remount when attributes change
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      crossOrigin={useCors ? "anonymous" : undefined}
      className={className}
      onError={handleError}
    />
  );
};

export default ResilientImage;