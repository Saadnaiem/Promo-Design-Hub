
import React, { useState, useEffect, useRef } from 'react';
import { RawProductRow, ProcessedProduct } from './types';
import FileUpload from './components/FileUpload';
import ProductCard from './components/ProductCard';
import ResilientImage from './components/ResilientImage';
import { processLocalData } from './services/geminiService';
import { Trash2, Download, Link as LinkIcon, Check, ExternalLink, Loader2, BookOpen } from 'lucide-react';
import LZString from 'lz-string';

const App: React.FC = () => {
  const [products, setProducts] = useState<ProcessedProduct[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); 
  const [magazineTitle, setMagazineTitle] = useState("Consumer Offer Plan");
  const [headerLogo, setHeaderLogo] = useState("https://alhabibpharmacy.com/media/logo/stores/3/En-Logo.png");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  
  // Viewer Mode State
  const [isViewerMode, setIsViewerMode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Responsive Scaling State
  const [zoomScale, setZoomScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // PDF Generation State
  const [isDownloading, setIsDownloading] = useState(false);

  const ITEMS_PER_PAGE = 6;
  const chunkProducts = (arr: ProcessedProduct[], size: number) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size)
    );
  };
  const productPages = chunkProducts(products, ITEMS_PER_PAGE);

  // --- RESPONSIVE SCALING LOGIC ---
  const handleResize = () => {
    if (containerRef.current) {
      // Available width minus padding (32px total for p-4 on desktop, 16px on mobile)
      const padding = window.innerWidth < 768 ? 16 : 32;
      const availableWidth = window.innerWidth - padding;
      const targetWidth = 794; // Exact pixel width of A4 at 96 DPI
      
      // Calculate scale: if screen is smaller than A4, shrink it. Max scale is 1.
      const newScale = Math.min(1, availableWidth / targetWidth);
      setZoomScale(newScale);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate total height for negative margin correction on mobile
  // Total Pages = Front + Back + Product Pages
  // Page Height = 1115px (Reduced for safety) + Margin
  // A4 Stride = 1123px
  const totalPages = products.length > 0 ? 2 + productPages.length : 0;
  const pageHeight = 1115; 
  const gapHeight = isDownloading ? 8 : 32; // 8px gap during download to hit 1123px stride (1115+8)
  const totalContentHeight = (totalPages * pageHeight) + (Math.max(0, totalPages - 1) * gapHeight);

  // --- DATA OPTIMIZATION (MINIFICATION) ---
  const minifyData = (products: ProcessedProduct[]) => {
    return products.map(p => [
        p.sku,                  // 0
        p.name,                 // 1
        p.nameAr || '',         // 2
        p.originalPrice,        // 3
        p.originalMechanics,    // 4
        p.discountLabelAr || '',// 5
        p.imageUrl,             // 6
        p.logoUrl || '',        // 7
        p.productPageUrl || ''  // 8
    ]);
  };

  const restoreFromMinified = (minifiedProducts: any[]) => {
    return minifiedProducts.map(m => {
        const raw: RawProductRow = {
            SKU: m[0],
            Name: m[1],
            NameAr: m[2],
            Price: m[3],
            Mechanics: m[4],
            MechanicsAr: m[5],
            Image: m[6],
            Logo: m[7],
            ProductPage: m[8]
        };
        const processed = processLocalData(raw);
        processed.imageUrl = m[6];
        processed.logoUrl = m[7];
        processed.productPageUrl = m[8];
        return processed;
    });
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const compressedData = params.get('data');
    
    if (compressedData) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(compressedData);
        if (decompressed) {
          const parsed = JSON.parse(decompressed);
          let loadedProducts: ProcessedProduct[] = [];

          if (parsed.minified && Array.isArray(parsed.minified)) {
             loadedProducts = restoreFromMinified(parsed.minified);
          } else if (parsed.products && Array.isArray(parsed.products)) {
             loadedProducts = parsed.products;
          }

          if (loadedProducts.length > 0) {
            setProducts(loadedProducts);
            setMagazineTitle(parsed.title || "Consumer Offer Plan");
            setHeaderLogo(parsed.logo || "https://alhabibpharmacy.com/media/logo/stores/3/En-Logo.png");
            if (parsed.cover) setCoverImage(parsed.cover);
            setIsViewerMode(true);
          }
        }
      } catch (e) {
        console.error("Failed to load shared magazine data", e);
      }
    }
  }, []);

  const convertGoogleDriveLink = (url: string): string => {
    if (!url || typeof url !== 'string') return '';
    let cleanUrl = url.trim();
    if (cleanUrl.includes('lh3.googleusercontent.com/d/')) return cleanUrl;
    const isUrl = cleanUrl.includes('http') || cleanUrl.includes('www.');
    const isGoogle = cleanUrl.includes('google') || cleanUrl.includes('drive');
    if (isUrl && !isGoogle) return cleanUrl;
    const vacuumMatch = cleanUrl.match(/([-a-zA-Z0-9_]{25,100})/);
    let driveId = '';
    if (vacuumMatch && vacuumMatch[1]) {
       const candidate = vacuumMatch[1];
       if (!candidate.includes('google') && !candidate.includes('drive') && !candidate.includes('http') && !candidate.includes('www')) {
          driveId = candidate;
       }
    }
    if (driveId) return `https://lh3.googleusercontent.com/d/${driveId}`;
    return cleanUrl;
  };

  const generateCampaignTitle = (monthVal: string | number | undefined): string => {
    if (!monthVal) return "Consumer Offer Plan";
    const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    let monthIndex = -1; 
    const valStr = String(monthVal).trim().toUpperCase();
    const valNum = parseFloat(valStr);
    if (!isNaN(valNum) && valNum >= 1 && valNum <= 12) {
        monthIndex = valNum - 1;
    } else if (!isNaN(valNum) && valNum > 12) {
        const date = new Date((valNum - 25569) * 86400 * 1000);
        if (!isNaN(date.getMonth())) monthIndex = date.getMonth();
    } else {
        monthIndex = months.findIndex(m => {
            const shortName = m.substring(0, 3); 
            return valStr.includes(m) || valStr.includes(shortName) || m.startsWith(valStr);
        });
    }
    if (monthIndex !== -1) {
        const monthName = months[monthIndex];
        const displayMonth = monthName.charAt(0) + monthName.slice(1).toLowerCase();
        const copNumber = monthIndex + 1;    
        return `Consumer Offer Plan ${displayMonth} (COP-${copNumber})`;
    }
    if (valStr.length > 2) {
         const formattedVal = valStr.charAt(0) + valStr.slice(1).toLowerCase();
        return `Consumer Offer Plan ${formattedVal}`;
    }
    return "Consumer Offer Plan";
  };

  const renderStylizedTitle = (title: string) => {
    const monthsRegex = /(January|February|March|April|May|June|July|August|September|October|November|December)/i;
    const parts = title.split(monthsRegex);
    if (parts.length <= 1) return title;
    return (
      <>
        {parts.map((part, index) => {
          if (monthsRegex.test(part)) {
            return <span key={index} className="text-yellow-400">{part}</span>;
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  const handleDataLoaded = (rawData: RawProductRow[], manualMonth?: string) => {
    let newTitle = "Consumer Offer Plan";
    if (manualMonth && manualMonth.trim().length > 0) {
        newTitle = generateCampaignTitle(manualMonth);
    } else {
        const rowWithMonth = rawData.find(r => r.Month !== undefined && r.Month !== null && String(r.Month).trim() !== '');
        if (rowWithMonth && rowWithMonth.Month) {
            newTitle = generateCampaignTitle(rowWithMonth.Month);
        }
    }
    setMagazineTitle(newTitle);
    const processed = rawData.map(row => {
      const item = processLocalData(row);
      item.imageUrl = convertGoogleDriveLink(row.Image || '');
      item.logoUrl = convertGoogleDriveLink(row.Logo || '');
      return item;
    });
    setProducts(prev => [...prev, ...processed]);
    setRefreshKey(prev => prev + 1);
    setIsViewerMode(false); 
    setGeneratedUrl(null);
  };
  
  const handleLogoFound = (url: string) => {
     const convertedUrl = convertGoogleDriveLink(url);
     if (convertedUrl) setHeaderLogo(convertedUrl);
  };
  
  const handleCoverFound = (url: string) => {
     const convertedUrl = convertGoogleDriveLink(url);
     if (convertedUrl) setCoverImage(convertedUrl);
  };

  const handleRetry = (id: string) => { console.log("Retry requested for", id); };
  
  const clearAll = () => {
    setProducts([]);
    setRefreshKey(0);
    setMagazineTitle("Consumer Offer Plan");
    setHeaderLogo("https://alhabibpharmacy.com/media/logo/stores/3/En-Logo.png");
    setCoverImage(null);
    setIsViewerMode(false);
    setGeneratedUrl(null);
    window.history.pushState({}, document.title, window.location.pathname);
  };

  const handleGenerateLink = async () => {
    setIsGeneratingLink(true);
    setGeneratedUrl(null);

    const minifiedProducts = minifyData(products);
    const payload = {
      title: magazineTitle,
      logo: headerLogo,
      cover: coverImage,
      minified: minifiedProducts 
    };
    
    try {
      const jsonString = JSON.stringify(payload);
      const compressed = LZString.compressToEncodedURIComponent(jsonString);
      const longUrl = `${window.location.origin}${window.location.pathname}?data=${compressed}`;
      
      try {
        const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
        if (response.ok) {
            const shortUrl = await response.text();
            setGeneratedUrl(shortUrl);
            navigator.clipboard.writeText(shortUrl);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 3000);
            setIsGeneratingLink(false);
            return;
        }
      } catch (apiError) {
        console.warn("TinyURL API failed, falling back to long URL");
      }

      setGeneratedUrl(longUrl);
      navigator.clipboard.writeText(longUrl).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
      });
    } catch (e) {
      console.error("Compression failed", e);
      alert("Failed to generate link.");
    } finally {
        setIsGeneratingLink(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('magazine-content');
    if (!element) return;
    
    // CRITICAL: Restore exact scale for PDF generation
    const currentScale = zoomScale;
    setZoomScale(1);
    setIsDownloading(true);

    // Increase timeout to allow images to convert to base64 and proxies to load
    setTimeout(() => {
        // Link injection logic
        const linksToInject: { page: number, x: number, y: number, w: number, h: number, url: string }[] = [];
        const contentRect = element.getBoundingClientRect();
        const anchors = element.getElementsByTagName('a');
        
        // Exact stride of A4 in PDF engine
        const pageStride = 1123; 

        for (let i = 0; i < anchors.length; i++) {
            const a = anchors[i];
            const rect = a.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const top = rect.top - contentRect.top;
                const left = rect.left - contentRect.left;
                
                // Calculate which page this link falls on
                const pageNum = Math.floor(top / pageStride) + 1;
                const yOnPage = top % pageStride;
                
                if (a.href) {
                    linksToInject.push({
                        page: pageNum,
                        x: left,
                        y: yOnPage,
                        w: rect.width,
                        h: rect.height,
                        url: a.href
                    });
                }
            }
        }

        // @ts-ignore
        const html2pdf = window.html2pdf;
        if (!html2pdf) { 
            alert('PDF generator initializing...'); 
            setZoomScale(currentScale);
            setIsDownloading(false);
            return; 
        }
        
        let filename = 'Promo Magazine.pdf';
        const copMatch = magazineTitle.match(/\(COP-(\d+)\)/);
        if (copMatch && copMatch[1]) {
            filename = `Promo Magazine COP-${copMatch[1]}.pdf`;
        }

        const opt = {
          margin: 0,
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
              scale: 2, 
              useCORS: true, 
              logging: false, 
              scrollY: 0,
              x: 0,
              windowWidth: 794, // FORCE DESKTOP WIDTH
              width: 794,       // LOCK WIDTH
              imageTimeout: 15000, // Wait for images
          }, 
          jsPDF: { 
              unit: 'px',  
              format: [794, 1123], // STRICT A4 PIXELS
              orientation: 'portrait', 
              compress: true 
          },
          pagebreak: { mode: ['css', 'legacy'] } 
        };
        
        html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf: any) => {
            linksToInject.forEach(link => {
                pdf.setPage(link.page);
                pdf.link(link.x, link.y, link.w, link.h, { url: link.url });
            });
        }).save().then(() => {
            setZoomScale(currentScale);
            setIsDownloading(false);
        });
    }, 3500); // 3.5 second delay for Proxy/Base64 conversion
  };

  const BackCoverIconProps = {
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#facc15",
    strokeWidth: "2",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { color: '#facc15', stroke: '#facc15 !important' } as React.CSSProperties
  };

  const PhoneIcon = () => (
    <svg {...BackCoverIconProps}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
  );
  const GlobeIcon = () => (
    <svg {...BackCoverIconProps}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z" /></svg>
  );
  const MailIcon = () => (
    <svg {...BackCoverIconProps}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
  );
  const FacebookIcon = () => (
    <svg {...BackCoverIconProps}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
  );
  const InstagramIcon = () => (
    <svg {...BackCoverIconProps}><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
  );
  const TwitterIcon = () => (
    <svg {...BackCoverIconProps}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-12.7 12.5S.2 12.9 1.8 10.1c2-1.3 5.8-1.5 6.7-.2-3.5.3-4.7-2.6-4.5-5.3 1 .8 2.9 1.2 4 .6C3.1 5 4.3 1 8.7 3c3.5 1.6 6.2 4.5 7.4 6.1 0-.9 0-2.2-.5-3.1 1.3.3 2.5 1.1 3.8 2 0-.6-.5-1.4-1-2 1 .3 2 1.2 3 1.9z" /></svg>
  );

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-200 pb-20 print:bg-white print:pb-0 font-inter overflow-x-hidden">
      <header className="bg-white border-b border-slate-300 sticky top-0 z-30 print:hidden shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:h-16 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
                    <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                <h1 className="text-lg md:text-xl font-bold text-slate-800 leading-none text-left">
                    {isViewerMode ? "Al Habib Pharmacy Promo Magazine" : "Promo Magazine Design Hub"}
                </h1>
                </div>
            </div>
            {products.length > 0 && (
                <button onClick={handleDownloadPDF} className="flex md:hidden items-center justify-center p-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors shadow-sm">
                    <Download className="w-5 h-5" />
                </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 w-full md:w-auto">
             {products.length > 0 && (
               <>
                {!isViewerMode && (
                  <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200 w-full md:w-auto justify-center">
                      {generatedUrl && (
                          <a 
                            href={generatedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-2 md:px-3 py-2 rounded-md font-medium text-slate-600 hover:text-blue-600 hover:bg-white transition-all"
                            title="Open Link"
                          >
                              <ExternalLink className="w-4 h-4" />
                              <span className="text-xs hidden sm:inline">Test Link</span>
                          </a>
                      )}
                      <button 
                        onClick={handleGenerateLink} 
                        disabled={isGeneratingLink}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all shadow-sm border text-sm flex-1 md:flex-none justify-center ${isCopied ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                      >
                         {isGeneratingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : (isCopied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />)}
                         <span>{isGeneratingLink ? 'Shortening...' : (isCopied ? 'Copied!' : 'Short Link')}</span>
                      </button>
                  </div>
                )}
                {!isViewerMode && (
                  <button onClick={clearAll} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Clear All">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={handleDownloadPDF} className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors shadow-sm text-sm">
                  <Download className="w-4 h-4" />
                  <span>PDF</span>
                </button>
               </>
             )}
          </div>
        </div>
      </header>

      <main className="w-full mx-auto p-2 md:p-8 print:p-0 print:w-full flex justify-center">
        {products.length === 0 ? (
          <div className="mt-8 md:mt-16 w-full max-w-[1400px] flex flex-col items-center">
            {/* HERO SECTION */}
            <div className="text-center mb-10 px-4 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-400/10 blur-3xl rounded-full -z-10"></div>
              <h2 className="text-3xl md:text-5xl font-black text-slate-800 mb-3 tracking-tight">
                Promo Magazine <span className="text-blue-600">Design Hub</span>
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto text-base md:text-lg font-medium leading-relaxed">
                Transform your Excel sheets into professional promotional catalogs.
              </p>
            </div>

            {/* UPLOAD COMPONENT WRAPPER */}
            <div className="w-full max-w-2xl transform hover:scale-[1.005] transition-transform duration-500">
               <FileUpload onDataLoaded={handleDataLoaded} onLogoFound={handleLogoFound} onCoverFound={handleCoverFound} />
            </div>
            
            {/* PROMINENT COPYRIGHT FOOTER */}
            <div className="mt-20 text-center">
               <div className="inline-block px-8 py-4 rounded-2xl bg-white shadow-sm border border-slate-100">
                  <p className="text-xl font-black tracking-wide bg-gradient-to-r from-blue-700 via-blue-600 to-green-600 bg-clip-text text-transparent">
                    © 2025 Dr. Saad Naiem Ali
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <div className="h-[1px] w-4 bg-slate-200"></div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                       All Rights Reserved
                    </p>
                    <div className="h-[1px] w-4 bg-slate-200"></div>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center overflow-hidden">
             <div 
                style={{ 
                  transform: `scale(${zoomScale})`, 
                  transformOrigin: 'top center',
                  marginBottom: `-${(1 - zoomScale) * totalContentHeight}px` 
                }}
                className="transition-transform duration-300 ease-out"
             >
                <div id="magazine-content" className={`w-[794px] mx-auto shadow-2xl print:shadow-none bg-slate-300 print:bg-white flex flex-col print:block ${isDownloading ? 'gap-0' : 'gap-8'}`}>
                  
                  {/* FRONT COVER */}
                  <div className={`bg-[#007d40] relative w-[794px] h-[1115px] flex flex-col items-center justify-center text-white overflow-hidden shrink-0 mx-auto print:mb-0 shadow-lg print:shadow-none ${isDownloading ? 'mb-[8px]' : 'mb-8'}`}>
                      {coverImage ? (
                          <>
                             <div className="absolute inset-0 z-0">
                                <ResilientImage src={coverImage} alt="Cover Background" className="w-full h-full object-cover" />
                             </div>
                             <div className="absolute inset-0 z-0 bg-black/10"></div>
                          </>
                      ) : (
                          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                      )}

                      <div className="z-10 flex flex-col items-center gap-8">
                          {headerLogo && (
                              <div className="h-40 w-auto mb-4">
                                  <ResilientImage src={headerLogo} alt="Brand Logo" className="h-full w-auto object-contain rounded-2xl drop-shadow-xl" isLogo={true} />
                              </div>
                          )}
                          <div className="h-1 w-32 bg-white mb-4"></div>
                          <h1 className="text-6xl font-black text-center uppercase tracking-tight leading-tight font-inter max-w-[700px] drop-shadow-lg">
                              {renderStylizedTitle(magazineTitle)}
                          </h1>
                          <div className="mt-12 text-center flex flex-col items-center gap-2">
                              <span className="text-5xl font-black uppercase tracking-widest text-yellow-400 drop-shadow-2xl">
                                Monthly Offers
                              </span>
                              <span className="text-4xl font-black font-cairo text-yellow-400 drop-shadow-xl">
                                العروض الشهرية
                              </span>
                          </div>
                      </div>
                      
                      <div className="absolute bottom-20 text-white text-3xl font-black uppercase tracking-widest drop-shadow-lg z-10 text-center w-full">
                        Valid Until Stocks Last
                      </div>
                  </div>

                  {/* PRODUCT PAGES */}
                  {productPages.map((pageProducts, pageIndex) => (
                    <div key={pageIndex} className={`bg-white relative w-[794px] h-[1115px] flex flex-col text-slate-900 overflow-hidden shrink-0 mx-auto print:mb-0 shadow-lg print:shadow-none ${isDownloading ? 'mb-[8px]' : 'mb-8'}`}>
                        <div className="px-10 pt-6 pb-4 flex-grow bg-slate-50/50">
                            <div className="grid grid-cols-3 grid-rows-2 gap-4 mx-auto justify-items-center w-full h-full content-start">
                                {pageProducts.map((product) => (
                                    <div key={product.id} className="w-full h-full">
                                        <ProductCard product={product} onRetry={handleRetry} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white text-blue-900 h-8 print:bg-white flex items-center justify-center px-8 border-t border-slate-100 shrink-0 z-10 font-bold text-sm">
                          <span>- {pageIndex + 1} -</span>
                        </div>
                    </div>
                  ))}

                  {/* BACK COVER */}
                  <div className={`bg-[#007d40] relative w-[794px] h-[1115px] flex flex-col items-center justify-center text-white overflow-hidden shrink-0 mx-auto print:mb-0 shadow-lg print:shadow-none ${isDownloading ? 'mb-0' : 'mb-8'}`}>
                      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                      <div className="z-10 w-full max-w-lg flex flex-col items-center gap-10">
                          <div className="text-center">
                              <h2 className="text-3xl font-bold mb-2">Contact Us</h2>
                              <div className="h-1 w-20 bg-white mx-auto rounded-full"></div>
                          </div>
                          <div className="space-y-6 w-full">
                              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
                                  <div className="p-2 rounded-full border border-white/20"><PhoneIcon /></div>
                                  <div><p className="text-xs text-green-200 uppercase font-bold tracking-wider">Customer Service</p><p className="text-lg font-bold">+966 12 345 6789</p></div>
                              </div>
                              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
                                  <div className="p-2 rounded-full border border-white/20"><GlobeIcon /></div>
                                  <div><p className="text-xs text-green-200 uppercase font-bold tracking-wider">Visit our Website</p><a href="https://www.alhabibpharmacy.com" target="_blank" rel="noopener noreferrer" className="text-lg font-bold hover:underline">www.alhabibpharmacy.com</a></div>
                              </div>
                              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
                                  <div className="p-2 rounded-full border border-white/20"><MailIcon /></div>
                                  <div><p className="text-xs text-green-200 uppercase font-bold tracking-wider">Email Us</p><p className="text-lg font-bold">care@alhabib.com</p></div>
                              </div>
                          </div>
                          <div className="flex gap-6 mt-4">
                              <div className="p-3 bg-white/10 rounded-full hover:bg-white/20 cursor-pointer transition-colors"><FacebookIcon /></div>
                              <div className="p-3 bg-white/10 rounded-full hover:bg-white/20 cursor-pointer transition-colors"><InstagramIcon /></div>
                              <div className="p-3 bg-white/10 rounded-full hover:bg-white/20 cursor-pointer transition-colors"><TwitterIcon /></div>
                          </div>
                          <div className="mt-8 flex flex-col items-center gap-3">
                              <a href="https://alhabibpharmacy.com/ar-sa/category/offers" target="_blank" rel="noopener noreferrer" className="bg-white p-4 rounded-2xl shadow-lg hover:scale-105 transition-transform cursor-pointer group">
                                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://alhabibpharmacy.com/ar-sa/category/offers" alt="Scan for Latest Offers" className="w-32 h-32 object-contain" />
                              </a>
                              <p className="text-sm font-bold text-green-200 text-center uppercase tracking-wide mt-1">
                                  Scan OR Click for Latest Offers
                              </p>
                          </div>
                      </div>
                  </div>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
