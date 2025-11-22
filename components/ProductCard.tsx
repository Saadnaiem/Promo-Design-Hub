
import React, { useState, useEffect } from 'react';
import { ProcessedProduct } from '../types';
import { ImageOff } from 'lucide-react';
import ResilientImage from './ResilientImage';

interface ProductCardProps {
  product: ProcessedProduct;
  onRetry: (id: string) => void;
}

// INLINE SVG COMPONENT for Saudi Riyal
const InlineSvg = ({ url, className, color }: { url: string, className?: string, color: string }) => {
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    const fetchSvg = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load SVG');
        let text = await response.text();
        
        // Strip existing attributes to force our color
        text = text.replace(/<\?xml.*?\?>/, '').replace(/<!DOCTYPE.*?>/, '');
        text = text.replace(/style=['"][^'"]*['"]/g, '');
        text = text.replace(/fill=['"][^'"]*['"]/g, '');
        text = text.replace(/stroke=['"][^'"]*['"]/g, '');
        text = text.replace(/<svg/, `<svg fill="${color}"`);
        
        // Aggressive CSS injection to force color on all elements
        const styleBlock = `<style>
          svg, g, path, rect, circle, polygon { 
            fill: ${color} !important; 
            stroke: none !important; 
            stroke-width: 0 !important; 
          }
        </style>`;
        
        text = text.replace(/<\/svg>/, `${styleBlock}</svg>`);
        setSvgContent(text);
      } catch (e) {
        console.error("Error loading SVG", e);
      }
    };

    fetchSvg();
  }, [url, color]);

  if (!svgContent) return <span className={className}></span>;

  return (
    <span 
      className={`${className} inline-block [&>svg]:w-full [&>svg]:h-full`}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

// CUSTOM PROMO ICONS (Raw SVG to guarantee Yellow Color)
const PromoIcon = ({ type }: { type: 'flame' | 'cart' | 'gift' | 'star' }) => {
  // Explicit yellow color hardcoded
  const strokeColor = "#facc15"; 
  const commonProps = {
    xmlns: "http://www.w3.org/2000/svg",
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: strokeColor,
    strokeWidth: "3",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    // Double down with explicit CSS style to survive PDF engine processing
    style: { stroke: '#facc15', color: '#facc15' }
  };

  switch (type) {
    case 'flame':
      return (
        <svg {...commonProps}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    case 'cart':
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      );
    case 'gift':
      return (
        <svg {...commonProps}>
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M12 8v13" />
          <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
          <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
        </svg>
      );
    case 'star':
      return (
        <svg {...commonProps}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
  }
};

const ProductCard: React.FC<ProductCardProps> = ({ product, onRetry }) => {
  const [debugInfo, setDebugInfo] = useState<{input: string, extractedId: string}>({input: '', extractedId: ''});
  const [mainImageError, setMainImageError] = useState(false);

  // Determine colors based on promo intensity
  const badgeBg = 'bg-[#007d40]';
  
  const handleMainFailure = (info: any) => {
     setDebugInfo(info);
     setMainImageError(true); 
  };

  // Calculating savings
  const savings = product.originalPrice - product.finalPrice;
  const hasSavings = savings > 0.5;
  const discountPercent = product.originalPrice > 0 ? (savings / product.originalPrice) * 100 : 0;

  // Helper to determine Badge Type based on mechanics
  const getPromoConfig = (label: string): { iconType: 'flame' | 'cart' | 'gift' | 'star', text: string } => {
    const l = label.toLowerCase();
    
    // 🎁 BUNDLE OFFER
    if (l.includes('2+1') || l.includes('3+1') || l.includes('buy 2') || l.includes('buy 3') || l.includes('bundle') || l.includes('set') || l.includes('pack') || l.includes('pcs')) {
        return { iconType: 'gift', text: 'BUNDLE OFFER' };
    }

    // 🛒 BUY 1 GET 1 FREE
    if (l.includes('1+1') || l.includes('buy 1')) {
        return { iconType: 'cart', text: 'BUY 1 GET 1 FREE' };
    }
    
    // ⭐ PREMIUM PICK
    if (product.finalPrice > 150 || l.includes('premium')) {
        return { iconType: 'star', text: 'PREMIUM PICK' };
    }
    
    // 🔥 HOT OFFER
    return { iconType: 'flame', text: 'HOT OFFER' };
  };

  const promoConfig = getPromoConfig(product.discountLabel);

  // Define the yellow color explicitly
  const ICON_COLOR_HEX = "#facc15";

  // Check if it is BOGO to hide redundant text
  const isBogo = promoConfig.text === 'BUY 1 GET 1 FREE';

  return (
    <div className="group relative h-full bg-white flex flex-col border border-gray-200 shadow-sm overflow-hidden rounded-2xl hover:border-[#007d40] hover:shadow-lg transition-all duration-200 print:break-inside-avoid w-full">
      
      {/* FULL WIDTH PROMO BANNER - Modernized with Icons */}
      <div className={`${badgeBg} py-1.5 shadow-sm z-10 print:bg-[#007d40] flex flex-col items-center justify-center leading-tight min-h-[3.5rem] relative overflow-hidden`}>
        {/* Subtle background pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        
        <div className="z-10 flex items-center gap-1.5 mb-0.5">
            {/* Custom Icons in YELLOW */}
            <PromoIcon type={promoConfig.iconType} />
            
            <span 
                className="font-black text-[10px] uppercase tracking-widest" 
                style={{ color: ICON_COLOR_HEX }}
            >
                {promoConfig.text}
            </span>
            
            <PromoIcon type={promoConfig.iconType} />
        </div>
        
        {/* English Discount Label: Hide if BOGO (redundant), show otherwise */}
        {!isBogo && (
            <h3 className="font-bold text-sm uppercase tracking-wide z-10 px-2 text-center leading-none" style={{ color: '#ffffff' }}>
              {product.discountLabel}
            </h3>
        )}

        {/* Arabic Discount Label: Always show if present */}
        {product.discountLabelAr && (
            <h3 className="font-bold text-[10px] mt-0.5 z-10 font-cairo" style={{ color: '#ffffff' }} dir="rtl" lang="ar">
              {product.discountLabelAr}
            </h3>
        )}
      </div>

      {/* PRODUCT IMAGE AREA - REMOVED PADDING TO FILL SPACE */}
      <div className="relative flex-1 bg-white p-0 flex items-center justify-center min-h-[140px] overflow-hidden">
        
        {/* BRAND LOGO - Top Left Overlay - Rounded Badge */}
        {product.logoUrl && (
           <div className="absolute top-2 left-2 z-20 h-7 max-w-[30%] bg-white rounded-lg shadow-md border border-gray-100 flex items-center justify-center px-1.5 py-0.5 overflow-hidden">
             <ResilientImage 
               src={product.logoUrl} 
               alt="Brand" 
               className="max-h-full w-auto object-contain rounded"
               isLogo={true}
             />
           </div>
        )}

        {/* SAVINGS STICKER - Circular Badge (Top Right) - ORANGE */}
        {hasSavings && (
            <div className="absolute top-2 right-2 z-20 w-12 h-12 bg-orange-600 rounded-full flex flex-col items-center justify-center text-white shadow-md transform rotate-12 border-2 border-white">
                <span className="text-[7px] font-bold uppercase leading-none">Save</span>
                <span className="text-sm font-black leading-none -mt-0.5">{Math.round(savings)}</span>
                {/* Calligraphic Symbol - White Variant - SMALL SIZE */}
                <InlineSvg 
                   url="https://upload.wikimedia.org/wikipedia/commons/9/98/Saudi_Riyal_Symbol.svg" 
                   className="w-2.5 h-2.5 -mt-0.5" 
                   color="#ffffff" 
                />
            </div>
        )}

        {product.imageUrl ? (
            <ResilientImage 
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500"
                onFailure={handleMainFailure}
            />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-300 bg-gray-50 w-full h-full rounded-xl border border-dashed border-gray-200 p-4 text-center overflow-hidden">
             <ImageOff className="w-10 h-10 opacity-20 mb-2" />
             <span className="text-[9px] font-medium opacity-40">No Image</span>
          </div>
        )}
      </div>

      {/* PRODUCT DETAILS & PRICING */}
      <div className="px-3 pb-3 pt-1 flex flex-col gap-0.5 bg-white relative">
        
        {/* Names & SKU Container */}
        <div className="flex flex-col justify-start mb-2">
          {/* English Name */}
          <h3 className="font-bold text-slate-800 text-xs leading-tight line-clamp-2 h-[2.2em]" title={product.name}>
            {product.name}
          </h3>
          
          {/* Arabic Name - STRICTLY Below English Name - BOLD & LARGER - FULL LENGTH (No line clamp) */}
          {product.nameAr && (
             <h3 className="font-black text-xs text-slate-700 leading-tight text-right mt-1 mb-0.5 font-cairo" dir="rtl" lang="ar" title={product.nameAr}>
               {product.nameAr}
             </h3>
          )}

          {/* SKU - Below Arabic Name in DARK BLUE */}
          <p className="text-[9px] text-blue-900 font-bold mt-0.5 font-mono tracking-tight">
            SKU: {product.sku}
          </p>
        </div>

        {/* Pricing Row */}
        <div className="flex items-end justify-between border-t border-gray-100 pt-2 mt-auto">
          
          {/* Left: Regular Price - DARK BLUE LABEL */}
          <div className="flex flex-col">
            {hasSavings ? (
              <>
                <span className="text-[8px] text-blue-900 font-bold uppercase leading-none mb-0.5 tracking-tight">REGULAR PRICE</span>
                <div className="relative inline-block">
                  <span className="text-sm font-bold text-gray-400 line-through decoration-2 decoration-red-500/80">
                    {product.originalPrice.toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-[8px] text-blue-900 font-bold uppercase tracking-tight">REGULAR PRICE</span>
            )}
          </div>

          {/* Right: Now Price */}
          <div className="flex flex-col items-end">
             {hasSavings && (
               <span className="text-[8px] text-red-600 font-black uppercase tracking-widest mb-0.5">
                 NOW
               </span>
             )}
             <div className="flex items-end text-blue-900 leading-none">
                {/* Calligraphic Symbol - Blue Variant (SMALLER SIZE & NO BOLD) */}
                <InlineSvg 
                   url="https://upload.wikimedia.org/wikipedia/commons/9/98/Saudi_Riyal_Symbol.svg" 
                   className="w-3.5 h-3.5 mb-2 mr-1" 
                   color="#1e3a8a" 
                />
                <span className="text-3xl font-black tracking-tighter">
                  {Math.floor(product.finalPrice)}
                </span>
                <span className="text-[10px] font-bold mb-1">
                  .{(product.finalPrice % 1).toFixed(2).substring(2)}
                </span>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductCard;
