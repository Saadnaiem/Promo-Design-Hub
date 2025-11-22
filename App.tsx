import React, { useState } from 'react';
import { RawProductRow, ProcessedProduct } from './types';
import FileUpload from './components/FileUpload';
import ProductCard from './components/ProductCard';
import ResilientImage from './components/ResilientImage';
import { processLocalData } from './services/geminiService';
import { Printer, Trash2, Download, BookOpen } from 'lucide-react';

const App: React.FC = () => {
  const [products, setProducts] = useState<ProcessedProduct[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); // Key to force re-render
  const [magazineTitle, setMagazineTitle] = useState("Consumer Offer Plan");
  const [headerLogo, setHeaderLogo] = useState("https://alhabibpharmacy.com/media/logo/stores/3/En-Logo.png");
  
  // Helper to convert Google Drive sharing links to direct image URLs
  const convertGoogleDriveLink = (url: string): string => {
    if (!url || typeof url !== 'string') return '';
    
    let cleanUrl = url.trim();

    // 1. If it's already the working format, return it
    if (cleanUrl.includes('lh3.googleusercontent.com/d/')) return cleanUrl;

    // 2. Safety Check: Is this a generic URL that shouldn't be touched?
    const isUrl = cleanUrl.includes('http') || cleanUrl.includes('www.');
    const isGoogle = cleanUrl.includes('google') || cleanUrl.includes('drive');
    
    if (isUrl && !isGoogle) {
      return cleanUrl;
    }

    // 3. Universal "Vacuum" Regex extraction for ID
    const vacuumMatch = cleanUrl.match(/([-a-zA-Z0-9_]{25,100})/);
    
    let driveId = '';
    if (vacuumMatch && vacuumMatch[1]) {
       const candidate = vacuumMatch[1];
       if (!candidate.includes('google') && !candidate.includes('drive') && !candidate.includes('http') && !candidate.includes('www')) {
          driveId = candidate;
       }
    }

    if (driveId) {
      return `https://lh3.googleusercontent.com/d/${driveId}`;
    }
    
    return cleanUrl;
  };

  const generateCampaignTitle = (monthVal: string | number | undefined): string => {
    if (!monthVal) return "Consumer Offer Plan";

    const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    let monthIndex = -1; // 0-11
    
    const valStr = String(monthVal).trim().toUpperCase();
    const valNum = parseFloat(valStr);

    if (!isNaN(valNum) && valNum >= 1 && valNum <= 12) {
        monthIndex = valNum - 1;
    } 
    else if (!isNaN(valNum) && valNum > 12) {
        const date = new Date((valNum - 25569) * 86400 * 1000);
        if (!isNaN(date.getMonth())) {
            monthIndex = date.getMonth();
        }
    }
    else {
        monthIndex = months.findIndex(m => {
            const shortName = m.substring(0, 3); 
            return valStr.includes(m) || valStr.includes(shortName) || m.startsWith(valStr);
        });
    }

    if (monthIndex !== -1) {
        const monthName = months[monthIndex];
        // Use Title Case for month name (e.g. "May") for display
        const displayMonth = monthName.charAt(0) + monthName.slice(1).toLowerCase();
        const copNumber = monthIndex + 1;    
        // Requested Format: Consumer Offer Plan May (COP-5)
        return `Consumer Offer Plan ${displayMonth} (COP-${copNumber})`;
    }

    if (valStr.length > 2) {
         // Capitalize first letter only
         const formattedVal = valStr.charAt(0) + valStr.slice(1).toLowerCase();
        return `Consumer Offer Plan ${formattedVal}`;
    }

    return "Consumer Offer Plan";
  };

  // Function to color the Month name in the title
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
    
    // Priority 1: Manual Input
    if (manualMonth && manualMonth.trim().length > 0) {
        newTitle = generateCampaignTitle(manualMonth);
    } 
    // Priority 2: Excel Column
    else {
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
  };
  
  const handleLogoFound = (url: string) => {
     const convertedUrl = convertGoogleDriveLink(url);
     if (convertedUrl) {
        setHeaderLogo(convertedUrl);
     }
  };

  const handleRetry = (id: string) => {
    console.log("Retry requested for", id);
  };

  const clearAll = () => {
    setProducts([]);
    setRefreshKey(0);
    setMagazineTitle("Consumer Offer Plan");
    setHeaderLogo("https://alhabibpharmacy.com/media/logo/stores/3/En-Logo.png");
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('magazine-content');
    if (!element) return;

    // @ts-ignore
    const html2pdf = window.html2pdf;
    if (!html2pdf) {
       alert('PDF generator is initializing. Please try again in a moment.');
       return;
    }

    const opt = {
      margin: 0,
      filename: 'PharmaPromo-Magazine.pdf',
      image: { 
        type: 'png',  // Changed to PNG for lossless quality
        quality: 1    // Max quality
      },
      html2canvas: { 
        scale: 4,     // High resolution (High DPI)
        useCORS: true, 
        logging: false,
        letterRendering: true,
        // REMOVED windowWidth/width/scrollX/scrollY to prevent layout shifting
        // Let html2canvas auto-detect the element's natural size
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: false // Disable compression to keep images sharp
      } 
    };

    html2pdf().set(opt).from(element).save();
  };

  // PAGINATION LOGIC
  // A4 is ~297mm high. Screen px approx 1123px.
  // Rows per page: 2. Columns: 3. Items per page: 6.
  const ITEMS_PER_PAGE = 6;
  const chunkProducts = (arr: ProcessedProduct[], size: number) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size)
    );
  };

  const productPages = chunkProducts(products, ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-slate-200 pb-20 print:bg-white print:pb-0 font-inter">
      {/* Application Header (UI Only) */}
      <header className="bg-white border-b border-slate-300 sticky top-0 z-30 print:hidden shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-green-600 p-2 rounded-lg shadow-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-none">Promo Magazine Design Hub</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {products.length > 0 && (
               <>
                <button 
                  onClick={clearAll}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Clear All"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
               </>
             )}
          </div>
        </div>
      </header>

      <main className="w-full mx-auto p-8 print:p-0 print:w-full flex justify-center">
        
        {products.length === 0 ? (
          <div className="mt-10 w-full max-w-[1400px]">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Create Your Promo Magazine</h2>
              <p className="text-slate-500 max-w-xl mx-auto">
                Upload your Excel file to generate an A4 Catalog.<br/>
                <span className="inline-flex flex-wrap justify-center gap-2 mt-2">
                  <code className="bg-white px-2 py-1 rounded border">SKU</code>
                  <code className="bg-white px-2 py-1 rounded border">Name</code>
                  <code className="bg-white px-2 py-1 rounded border">Price</code>
                  <code className="bg-white px-2 py-1 rounded border">Mechanics</code>
                  <code className="bg-white px-2 py-1 rounded border">Image</code>
                  <code className="bg-white px-2 py-1 rounded border">Month</code>
                </span>
              </p>
            </div>

            <FileUpload onDataLoaded={handleDataLoaded} onLogoFound={handleLogoFound} />
            
            {/* Preview */}
            <div className="mt-16 text-center">
              <p className="text-xs text-slate-400 mb-6 uppercase tracking-widest font-bold">A4 Card Preview</p>
              <div className="w-56 mx-auto transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <ProductCard 
                  product={{
                    id: 'demo',
                    sku: '12345',
                    originalMechanics: 'Buy 1 Get 1 Free',
                    name: 'Panadol Extra Advance 48 Tablets',
                    nameAr: 'بنادول اكسترا ادفانس 48 قرص',
                    imageUrl: 'https://lh3.googleusercontent.com/d/1-3CUwCR4jaixY_CIMVY4JLdC927ylumg',
                    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/GSK_logo_2014.svg/2560px-GSK_logo_2014.svg.png', 
                    originalPrice: 24.00,
                    finalPrice: 12.00,
                    discountLabel: '1+1 FREE',
                    discountLabelAr: '١+١ مجاناً',
                    status: 'completed'
                  }} 
                  onRetry={() => {}} 
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            {/* 
                PAGINATION CONTAINER 
                w-fit is critical here so html2canvas captures ONLY the content, not the whole screen width
            */}
            <div id="magazine-content" className="w-fit">
               {productPages.map((pageProducts, pageIndex) => (
                 <div 
                   key={pageIndex}
                   className="bg-white relative shadow-2xl w-[794px] h-[1123px] mb-8 print:mb-0 print:shadow-none print:w-full flex flex-col text-slate-900 overflow-hidden"
                   style={{ pageBreakAfter: 'always' }} 
                 >
                    {/* MAGAZINE HEADER - Reduced Padding, Increased Logo, Rounded Image */}
                    <div className="bg-gradient-to-r from-green-900 via-green-800 to-green-900 text-white py-4 px-8 print:bg-green-900 print:text-white">
                        <div className="flex justify-between items-center border-b border-green-400/30 pb-3 mb-2">
                            {/* LEFT SIDE: Logo + "Monthly Offers" Text */}
                            <div className="flex items-center gap-4">
                            {headerLogo && (
                                <div className="h-20 w-auto relative">
                                <ResilientImage 
                                    src={headerLogo} 
                                    alt="Brand Logo"
                                    className="h-20 w-auto object-contain rounded-2xl" 
                                    isLogo={true}
                                />
                                </div>
                            )}
                            <div className="flex flex-col border-l border-green-400/30 pl-4">
                                <span className="text-sm font-bold uppercase tracking-[0.2em] text-green-100">Monthly Offers</span>
                            </div>
                            </div>
                            <div></div>
                        </div>
                        
                        {/* Dynamic Magazine Title with Colored Month */}
                        <h1 className="text-4xl font-black text-center uppercase tracking-tight leading-none mb-1 font-inter text-white">
                            {renderStylizedTitle(magazineTitle)}
                        </h1>
                    </div>

                    {/* Content Area - 3x2 Grid (6 items) */}
                    <div className="p-6 flex-grow bg-slate-50/50">
                        {/* 
                          Updated Grid: 
                          h-full to fill the remaining vertical space
                          grid-rows-2 to force 2 equal rows
                        */}
                        <div className="grid grid-cols-3 grid-rows-2 gap-6 mx-auto justify-items-center w-full h-full">
                            {pageProducts.map((product) => (
                                <div key={product.id} className="w-full h-full">
                                    <ProductCard product={product} onRetry={handleRetry} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer - Plain Green Bar */}
                    <div className="bg-green-900 text-white h-12 print:bg-green-900 flex items-center justify-between px-8">
                       <span className="text-[10px] text-green-200/50 font-mono">
                          PAGE {pageIndex + 1} OF {productPages.length}
                       </span>
                       <div className="h-1 w-16 bg-green-700 rounded-full"></div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;