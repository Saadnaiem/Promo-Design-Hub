import React, { useState } from 'react';
import { ProcessedProduct } from '../types';
import { ImageOff } from 'lucide-react';
import ResilientImage from './ResilientImage';

interface ProductCardProps {
  product: ProcessedProduct;
  onRetry: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onRetry }) => {
  const [debugInfo, setDebugInfo] = useState<{input: string, extractedId: string}>({input: '', extractedId: ''});
  const [mainImageError, setMainImageError] = useState(false);

  // Determine colors based on promo intensity
  const isBigPromo = product.discountLabel.toLowerCase().includes('free') || product.discountLabel.includes('1+1') || product.discountLabel.includes('50%');
  
  // Styles - Retail Flyer Aesthetic - GREEN THEME
  const badgeBg = isBigPromo ? 'bg-green-700' : 'bg-green-600';
  
  // Handle main image failure specifically to show debug UI
  const handleMainFailure = (info: any) => {
     setDebugInfo(info);
     setMainImageError(true); 
  };

  // Calculating savings
  const savings = product.originalPrice - product.finalPrice;
  const hasSavings = savings > 0.5;

  return (
    <div className="group relative h-full bg-white flex flex-col border border-gray-200 shadow-sm overflow-hidden rounded-2xl hover:border-green-400 hover:shadow-lg transition-all duration-200 print:break-inside-avoid w-full">
      
      {/* FULL WIDTH PROMO BANNER - Contains English & Arabic Mechanics ONLY */}
      <div className={`${badgeBg} text-white text-center py-1.5 shadow-sm z-10 print:bg-green-800 flex flex-col justify-center leading-tight min-h-[3rem]`}>
        <h3 className="font-black text-sm uppercase tracking-wider">
          {product.discountLabel}
        </h3>
        {product.discountLabelAr && (
            // REMOVED tracking-wide here to fix Arabic text in PDF
            <h3 className="font-bold text-xs mt-0.5" dir="rtl" lang="ar">
              {product.discountLabelAr}
            </h3>
        )}
      </div>

      {/* PRODUCT IMAGE AREA */}
      <div className="relative flex-1 bg-white p-2 flex items-center justify-center min-h-[140px]">
        
        {/* BRAND LOGO - Top Left Overlay - APPEALING PILL BADGE - NOW WITH OVERFLOW HIDDEN */}
        {product.logoUrl && (
           <div className="absolute top-2 left-2 z-20 h-7 max-w-[30%] bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center px-1.5 py-0.5 overflow-hidden">
             <ResilientImage 
               src={product.logoUrl} 
               alt="Brand" 
               className="max-h-full w-auto object-contain rounded"
               isLogo={true}
             />
           </div>
        )}

        {product.imageUrl ? (
            <ResilientImage 
                src={product.imageUrl}
                alt={product.name}
                // Increased max-h to 260px to allow image to fill taller 3x2 card
                className="w-full h-full object-contain max-h-[260px] transform group-hover:scale-105 transition-transform duration-500"
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
      <div className="px-3 pb-3 pt-1 flex flex-col gap-0.5 bg-white">
        
        {/* Names & SKU Container */}
        <div className="flex flex-col justify-start mb-1">
          {/* English Name */}
          <h3 className="font-bold text-slate-800 text-xs leading-tight line-clamp-2 h-[2.2em]" title={product.name}>
            {product.name}
          </h3>
          
          {/* Arabic Name - STRICTLY Below English Name */}
          {product.nameAr && (
             <h3 className="font-bold text-slate-600 text-[10px] leading-tight text-right mt-0.5 mb-0.5 line-clamp-1" dir="rtl" lang="ar" title={product.nameAr}>
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
                <span className="text-[8px] text-blue-900 font-bold uppercase leading-none mb-0.5 tracking-tight">Regular Price</span>
                <div className="relative inline-block">
                  <span className="text-sm font-bold text-gray-400 line-through decoration-2 decoration-red-500/80">
                    {product.originalPrice.toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-[8px] text-blue-900 font-bold uppercase tracking-tight">Regular Price</span>
            )}
          </div>

          {/* Right: Now Price */}
          <div className="flex flex-col items-end">
             {hasSavings && (
               <span className="text-[8px] text-red-600 font-black uppercase tracking-widest mb-0.5">
                 NOW
               </span>
             )}
             <div className="flex items-start text-blue-900 leading-none">
                <span className="text-[9px] font-bold mt-1 mr-0.5">SAR</span>
                <span className="text-3xl font-black tracking-tighter">
                  {Math.floor(product.finalPrice)}
                </span>
                <span className="text-[10px] font-bold mt-0.5">
                  .{(product.finalPrice % 1).toFixed(2).substring(2)}
                </span>
             </div>
          </div>
        </div>

        {/* Savings Bar */}
        {hasSavings && (
          <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-2 py-0.5 flex items-center justify-center gap-1">
            <span className="text-[9px] font-bold text-red-800 uppercase tracking-wide">Save</span>
            <span className="text-xs font-black text-red-600">{Math.round(savings)} SR</span>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProductCard;