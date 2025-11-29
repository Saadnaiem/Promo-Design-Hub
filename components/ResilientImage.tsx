
import React, { useState, useEffect, useRef } from 'react';
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
  const [base64Src, setBase64Src] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [useCors, setUseCors] = useState(true); // Try CORS first (needed for PDF)
  const [usingProxy, setUsingProxy] = useState(false); // New state for proxy fallback
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0); // To force re-render
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    setCurrentSrc(src);
    setBase64Src(null);
    setAttempt(0);
    setUseCors(true);
    setUsingProxy(false);
    setError(false);
    setKey(prev => prev + 1);
  }, [src]);

  const convertToBase64 = async (url: string) => {
    try {
      const response = await fetch(url, { 
          mode: 'cors', 
          credentials: 'omit',
          cache: 'no-store' 
      });
      
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (mountedRef.current && reader.result) {
          setBase64Src(reader.result as string);
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.warn("Base64 conversion failed for", url, e);
    }
  };

  const handleLoad = () => {
    // If we loaded successfully via Proxy or Direct, convert to Base64 for ultimate stability
    if (!base64Src && (currentSrc.startsWith('http') || usingProxy)) {
        convertToBase64(currentSrc);
    }
  };

  const handleError = () => {
    // STRATEGY 1: PROXY FALLBACK
    // If direct CORS failed, try routing through weserv.nl to get headers
    if (useCors && !usingProxy) {
        setUsingProxy(true);
        // WeServ requires the protocol to be stripped for some URLs, or just full encoding.
        // Simple encoding works best for most.
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(currentSrc)}&output=jpg`;
        setCurrentSrc(proxyUrl);
        setKey(prev => prev + 1);
        return;
    }

    // STRATEGY 2: DISABLE CORS (Visual Only)
    // If Proxy also failed (or we decided to skip it), try loading without CORS.
    // This makes it visible in browser but INVISIBLE in PDF.
    if (useCors && usingProxy) {
      setUseCors(false);
      // Revert to original URL (without proxy) for non-CORS attempt
      // But wait, we need to know WHICH url strategy we were on.
      // Let's just fall through to the next URL strategy instead, keeping CORS false?
      // No, let's try non-CORS on the CURRENT strategy first.
      
      // Actually, if proxy fails, it usually means the image is dead or 404.
      // So let's move to the next URL strategy immediately.
    }

    // Reset flags for next strategy
    setUseCors(true);
    setUsingProxy(false);

    // STRATEGY 3: ROTATE URL SOURCES
    // Extract ID
    let driveId = '';
    const rawInput = src || '';
    const vacuumMatch = rawInput.match(/([-a-zA-Z0-9_]{25,})/);
    if (vacuumMatch && vacuumMatch[1]) {
      driveId = vacuumMatch[1];
    }

    if (onFailure && !isLogo) {
      onFailure({ input: rawInput, extractedId: driveId });
    }

    const cacheBuster = `&t=${Date.now()}`;

    if (driveId && attempt === 0) {
      // Switch to Thumbnail
      const fallbackUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000${cacheBuster}`;
      setCurrentSrc(fallbackUrl);
      setAttempt(1);
    } else if (driveId && attempt === 1) {
       // Switch to Export
       const fallbackUrl = `https://drive.google.com/uc?export=view&id=${driveId}${cacheBuster}`;
       setCurrentSrc(fallbackUrl);
       setAttempt(2);
    } else if (driveId && attempt === 2) {
       // Switch to CDN
       const fallbackUrl = `https://lh3.googleusercontent.com/d/${driveId}`;
       setCurrentSrc(fallbackUrl);
       setAttempt(3);
    } else {
      // All strategies failed
      setError(true);
    }
    setKey(prev => prev + 1);
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

  const finalSrc = base64Src || currentSrc;

  return (
    <img 
      key={`${currentSrc}-${key}`} 
      src={finalSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      crossOrigin={(!base64Src && useCors) ? "anonymous" : undefined}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
};

export default ResilientImage;
