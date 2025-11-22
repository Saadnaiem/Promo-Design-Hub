
import React, { useState, useEffect, useRef } from 'react';
import { RawProductRow, ProcessedProduct } from './types';
import FileUpload from './components/FileUpload';
import ProductCard from './components/ProductCard';
import ResilientImage from './components/ResilientImage';
import { processLocalData } from './services/geminiService';
import { Trash2, Download, BookOpen, Link as LinkIcon, Check, ExternalLink } from 'lucide-react';
import LZString from 'lz-string';

const App: React.FC = () => {
  const [products, setProducts] = useState<ProcessedProduct[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); 
  const [magazineTitle, setMagazineTitle] = useState("Consumer Offer Plan");
  const [headerLogo, setHeaderLogo] = useState("https://alhabibpharmacy.com/media/logo/stores/3/En-Logo.png");
  
  // Viewer Mode State
  const [isViewerMode, setIsViewerMode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  // Responsive Scaling State
  const [zoomScale, setZoomScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- RESPONSIVE SCALING LOGIC ---
  const handleResize = () => {
    if (containerRef.current) {
      // Available width minus padding (32px total for p-4)
      const availableWidth = window.innerWidth - 32;
      const targetWidth = 794; // A4 Pixel Width
      
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

  // --- INITIALIZATION: CHECK URL FOR SHARED DATA ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const compressedData = params.get('data');
    
    if (compressedData) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(compressedData);
        if (decompressed) {
          const parsed = JSON.parse(decompressed);
          if (parsed.products && Array.isArray(parsed.products)) {
            setProducts(parsed.products);
            setMagazineTitle(parsed.title || "Consumer Offer Plan");
            setHeaderLogo(parsed.logo || "https://alhabibpharmacy.com/media/logo/stores/3/En-Logo.png");
            setIsViewerMode(true); // Enable Viewer Mode (Hides editor tools)
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
    setIsViewerMode(false); // If uploading new data, exit viewer mode
    setGeneratedUrl(null); // Reset link
  };
  
  const handleLogoFound = (url: string) => {
     const convertedUrl = convertGoogleDriveLink(url);
     if (convertedUrl) setHeaderLogo(convertedUrl);
  };

  const handleRetry = (id: string) => { console.log("Retry requested for", id); };
  
  const clearAll = () => {
    setProducts([]);
    setRefreshKey(0);
    setMagazineTitle("Consumer Offer Plan");
    setHeaderLogo("https://alhabibpharmacy.com/media/logo/stores/3/En-Logo.png");
    setIsViewerMode(false);
    setGeneratedUrl(null);
    // Clear URL param
    window.history.pushState({}, document.title, window.location.pathname);
  };

  // --- GENERATE SHAREABLE LINK ---
  const handleGenerateLink = () => {
    const payload = {
      title: magazineTitle,
      logo: headerLogo,
      products: products
    };
    
    try {
      const jsonString = JSON.stringify(payload);
      const compressed = LZString.compressToEncodedURIComponent(jsonString);
      const shareUrl = `${window.location.origin}${window.location.pathname}?data=${compressed}`;
      
      // Check for URL length limits
      if (shareUrl.length > 8000) {
        alert("The magazine data is too large to generate a direct link (exceeds 8kb). Please reduce the number of products or download the PDF instead.");
        return;
      }

      setGeneratedUrl(shareUrl);
      navigator.clipboard.writeText(shareUrl).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
      });
    } catch (e) {
      console.error("Compression failed", e);
      alert("Failed to generate link.");
    }
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('magazine-content');
    if (!element) return;
    
    // CRITICAL: Temporarily reset scale to 1 for full resolution capture
    const currentScale = zoomScale;
    setZoomScale(1);

    // Wait for render cycle to update scale
    setTimeout(() => {
        // @ts-ignore
        const html2pdf = window.html2pdf;
        if (!html2pdf) { 
            alert('PDF generator initializing...'); 
            setZoomScale(currentScale); // Restore scale if failing
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
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0 }, 
        jsPDF: { unit: 'px', format: [794, 1122], orientation: 'portrait', compress: true } 
        };
        
        html2pdf().set(opt).from(element).save().then(() => {
            // Restore responsive scale after download
            setZoomScale(currentScale);
        });
    }, 100);
  };

  const ITEMS_PER_PAGE = 6;
  const chunkProducts = (arr: ProcessedProduct[], size: number) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size)
    );
  };
  const productPages = chunkProducts(products, ITEMS_PER_PAGE);

  // --- CUSTOM ICONS FOR BACK COVER (Raw SVG to force Yellow) ---
  const PhoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#facc15">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
  const GlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#facc15">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
  const MailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#facc15">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
  const FacebookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#facc15">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
  const InstagramIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#facc15">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
  const TwitterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#facc15">
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-12.7 12.5S.2 12.9 1.8 10.1c2-1.3 5.8-1.5 6.7-.2-3.5.3-4.7-2.6-4.5-5.3 1 .8 2.9 1.2 4 .6C3.1 5 4.3 1 8.7 3c3.5 1.6 6.2 4.5 7.4 6.1 0-.9 0-2.2-.5-3.1 1.3.3 2.5 1.1 3.8 2 0-.6-.5-1.4-1-2 1 .3 2 1.2 3 1.9z" />
    </svg>
  );

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-200 pb-20 print:bg-white print:pb-0 font-inter overflow-x-hidden">
      <header className="bg-white border-b border-slate-300 sticky top-0 z-30 print:hidden shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:h-16 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
          <div className="flex items-center gap-2">
            <div className="bg-[#007d40] p-2 rounded-lg shadow-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800 leading-none text-center md:text-left">
                {isViewerMode ? "Al Habib Pharmacy Promo Magazine" : "Promo Magazine Design Hub"}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
             {products.length > 0 && (
               <>
                {/* SHARE LINK BUTTONS - ONLY IN EDITOR MODE */}
                {!isViewerMode && (
                  <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200">
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
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all shadow-sm border text-sm ${isCopied ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                      >
                         {isCopied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                         <span>{isCopied ? 'Copied!' : 'Link'}</span>
                      </button>
                  </div>
                )}

                {/* Show Clear Button only if NOT in Viewer Mode */}
                {!isViewerMode && (
                  <button onClick={clearAll} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Clear All">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors shadow-sm text-sm">
                  <Download className="w-4 h-4" />
                  <span>PDF</span>
                </button>
               </>
             )}
          </div>
        </div>
      </header>

      <main className="w-full mx-auto p-4 md:p-8 print:p-0 print:w-full flex justify-center">
        {products.length === 0 ? (
          <div className="mt-6 md:mt-10 w-full max-w-[1400px]">
            <div className="text-center mb-8 md:mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">Create Your Promo Magazine</h2>
              <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base">
                Upload your Excel file to generate an A4 Catalog.<br/>
                <span className="inline-flex flex-wrap justify-center gap-2 mt-2">
                  <code className="bg-white px-2 py-1 rounded border">SKU</code>
                  <code className="bg-white px-2 py-1 rounded border">Name</code>
                  <code className="bg-white px-2 py-1 rounded border">Price</code>
                  <code className="bg-white px-2 py-1 rounded border">Mechanics</code>
                  <code className="bg-white px-2 py-1 rounded border">Image</code>
                </span>
              </p>
            </div>
            <FileUpload onDataLoaded={handleDataLoaded} onLogoFound={handleLogoFound} />
            <div className="mt-20 text-center text-slate-400 text-sm font-medium">
               © Dr.Saad Naiem Ali
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
             {/* 
                MAGAZINE PREVIEW CONTAINER 
                Scales down on small screens to fit viewport, but maintains strict 794px width internally 
             */}
             <div 
                style={{ 
                  transform: `scale(${zoomScale})`, 
                  transformOrigin: 'top center',
                  // Adjust margin bottom to account for the whitespace created by scaling down
                  marginBottom: `-${(1 - zoomScale) * 1122}px` 
                }}
                className="transition-transform duration-300 ease-out"
             >
                <div id="magazine-content" className="w-[794px] mx-auto shadow-2xl print:shadow-none bg-slate-300 print:bg-white gap-8 flex flex-col print:block">
                  
                  {/* --- FRONT COVER PAGE --- */}
                  <div className="bg-[#007d40] relative w-[794px] h-[1122px] flex flex-col items-center justify-center text-white overflow-hidden shrink-0 mx-auto print:mb-0 mb-8 shadow-lg print:shadow-none">
                      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                      <div className="z-10 flex flex-col items-center gap-8">
                          {headerLogo && (
                              <div className="h-40 w-auto mb-4">
                                  <ResilientImage src={headerLogo} alt="Brand Logo" className="h-full w-auto object-contain rounded-2xl drop-shadow-xl" isLogo={true} />
                              </div>
                          )}
                          <div className="h-1 w-32 bg-white mb-4"></div>
                          <h1 className="text-6xl font-black text-center uppercase tracking-tight leading-tight font-inter max-w-[680px] drop-shadow-lg">
                              {renderStylizedTitle(magazineTitle)}
                          </h1>
                          <div className="mt-8 px-6 py-2 border-2 border-green-400/50 rounded-full">
                              <span className="text-sm font-bold uppercase tracking-[0.4em] text-green-100">Monthly Offers</span>
                          </div>
                      </div>
                      
                      <div className="absolute bottom-20 text-white text-3xl font-black uppercase tracking-widest drop-shadow-lg z-10 text-center w-full">
                        Valid Until Stocks Last
                      </div>
                  </div>

                  {/* --- PRODUCT PAGES --- */}
                  {productPages.map((pageProducts, pageIndex) => (
                    <div key={pageIndex} className="bg-white relative w-[794px] h-[1115px] flex flex-col text-slate-900 overflow-hidden shrink-0 mx-auto print:mb-0 mb-8 shadow-lg print:shadow-none">
                        <div className="px-10 pt-12 pb-6 flex-grow bg-slate-50/50">
                            <div className="grid grid-cols-3 grid-rows-2 gap-4 mx-auto justify-items-center w-full h-full content-start">
                                {pageProducts.map((product) => (
                                    <div key={product.id} className="w-full h-full">
                                        <ProductCard product={product} onRetry={handleRetry} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white text-slate-400 h-12 print:bg-white flex items-center justify-center px-8 border-t border-slate-100">
                          <span className="text-[10px] font-mono">- {pageIndex + 1} -</span>
                        </div>
                    </div>
                  ))}

                  {/* --- BACK COVER PAGE --- */}
                  <div className="bg-[#007d40] relative w-[794px] h-[1122px] flex flex-col items-center justify-center text-white overflow-hidden shrink-0 mx-auto print:mb-0 mb-8 shadow-lg print:shadow-none">
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
                                  <div><p className="text-xs text-green-200 uppercase font-bold tracking-wider">Visit our Website</p><p className="text-lg font-bold">www.alhabibpharmacy.com</p></div>
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
