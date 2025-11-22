
import React, { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Calendar } from 'lucide-react';
import { RawProductRow } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: RawProductRow[], manualMonth?: string) => void;
  onLogoFound?: (url: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, onLogoFound }) => {
  const [monthInput, setMonthInput] = useState('');
  
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      
      // Convert to JSON array of arrays to handle headers manually
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      if (!data || data.length === 0) {
        alert("File appears empty or unreadable.");
        return;
      }

      // 1. Smart Header Detection: Scan first 20 rows to find the row containing "SKU"
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(data.length, 20); i++) {
        const rowString = JSON.stringify(data[i]).toLowerCase();
        // Check for common variations of SKU
        if (rowString.includes("sku") || rowString.includes("item code") || rowString.includes("article")) {
          headerRowIndex = i;
          break;
        }
      }

      // Default to row 0 if no SKU found (fallback)
      if (headerRowIndex === -1) headerRowIndex = 0;

      // Get the header row and clean it
      const headers = data[headerRowIndex].map(h => String(h || '').trim());
      
      // 2. Find Column Indices (Flexible Matching with Exclusion)
      const findColIndex = (keywords: string[], excludeKeywords: string[] = []) => 
        headers.findIndex(h => {
          const headerLower = h.toLowerCase();
          // Must match at least one keyword
          const matchesKeyword = keywords.some(k => 
            headerLower === k.toLowerCase() || headerLower.includes(k.toLowerCase())
          );
          // Must NOT match any exclude keyword
          const isExcluded = excludeKeywords.some(e => headerLower.includes(e.toLowerCase()));
          
          return matchesKeyword && !isExcluded;
        });

      const skuIndex = findColIndex(['SKU', 'Item Code', 'Code', 'Article No']);
      // English Mechanics
      const mechanicIndex = findColIndex(['Mechanics', 'Promo', 'Offer', 'Promotion', 'Details'], ['Arabic', 'Ar', 'Name']);
      
      // Arabic Mechanics - Prioritize "Ar Mechanics"
      const mechanicArIndex = findColIndex(
        ['Ar Mechanics', 'Mechanics Ar', 'Arabic Mechanics', 'Promo Ar', 'Arabic Promo', 'Offer Ar'], 
        ['Name'] // Exclude "Name" to avoid confusion
      );
      
      // STRICTLY exclude 'Logo' and 'Brand' from Image detection
      const imageIndex = findColIndex(
        ['Image', 'Images', 'Img', 'Picture', 'Photo', 'URL', 'Link', 'Web', 'Drive'], 
        ['Logo', 'Brand', 'Icon'] 
      );
      
      const logoIndex = findColIndex(['Logo', 'Brand', 'Brand Logo', 'Icon']); 
      
      // Name Columns
      const nameIndex = findColIndex(['Name', 'Product Name', 'Description', 'Title', 'Item Name', 'English Name', 'Name En']);
      
      // Arabic Name - CRITICAL FIX: Exclude "Mechanics", "Promo" to prevent conflict with "Ar Mechanics"
      const nameArIndex = findColIndex(
        ['Arabic Name', 'Name Arabic', 'Name Ar', 'Ar Name', 'Arabic'], 
        ['Mechanics', 'Promo', 'Offer', 'Details'] 
      );

      const priceIndex = findColIndex(['Price', 'Original Price', 'Regular Price', 'RRP', 'Old Price']);
      const finalPriceIndex = findColIndex(['Final Price', 'Sale Price', 'New Price', 'Discounted Price']);

      // Month Column
      const monthIndex = findColIndex(['Month', 'Campaign Month', 'Period', 'Date', 'Time', 'Campaign']);

      // Validation
      const missingCols = [];
      if (skuIndex === -1) missingCols.push("SKU");
      if (nameIndex === -1) missingCols.push("Name");
      if (priceIndex === -1) missingCols.push("Price");

      if (missingCols.length > 0) {
        alert(`Could not find required columns: ${missingCols.join(', ')}.\n\nPlease ensure your Excel file has headers like 'SKU', 'Name', and 'Price'.`);
        return;
      }

      const parsedData: RawProductRow[] = [];

      // Iterate rows after the header
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        const skuVal = String(row[skuIndex] || '').trim();
        
        // --- LOGO EXTRACTION LOGIC ---
        // If this row is the "Logo" configuration row (SKU == 'Logo')
        if (skuVal.toLowerCase() === 'logo') {
           // If we have an image column, extract the URL and send it up
           if (imageIndex !== -1 && row[imageIndex]) {
              const logoUrl = String(row[imageIndex]).trim();
              if (onLogoFound && logoUrl) {
                 // Clean possible multi-link issues
                 const cleanLogoUrl = logoUrl.split(/[,\n\s]+/)[0].trim();
                 onLogoFound(cleanLogoUrl);
              }
           }
           continue; // Skip adding this row to products
        }
        
        // Basic validity check: Must have SKU and Name to be useful
        if (!skuVal || !row[nameIndex]) continue;

        const rawItem: RawProductRow = {
          SKU: skuVal,
          Name: row[nameIndex],
          NameAr: nameArIndex !== -1 ? row[nameArIndex] : undefined,
          Price: parseFloat(String(row[priceIndex]).replace(/[^0-9.]/g, '')) || 0,
          FinalPrice: finalPriceIndex !== -1 ? parseFloat(String(row[finalPriceIndex]).replace(/[^0-9.]/g, '')) : undefined,
          Mechanics: mechanicIndex !== -1 ? row[mechanicIndex] : '',
          MechanicsAr: mechanicArIndex !== -1 ? row[mechanicArIndex] : undefined,
          Image: imageIndex !== -1 ? row[imageIndex] : undefined,
          Logo: logoIndex !== -1 ? row[logoIndex] : undefined,
          Month: monthIndex !== -1 ? row[monthIndex] : undefined,
        };

        parsedData.push(rawItem);
      }

      if (parsedData.length === 0) {
        alert("No valid product rows found in the file.");
        return;
      }

      // Pass the parsed data AND the manual month input
      onDataLoaded(parsedData, monthInput);
    };
    
    reader.readAsBinaryString(file);
  }, [onDataLoaded, onLogoFound, monthInput]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Manual Month Input */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <label htmlFor="month-input" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Campaign Month (Optional)
        </label>
        <input
          id="month-input"
          type="text"
          placeholder="e.g., May, June, July..."
          value={monthInput}
          onChange={(e) => setMonthInput(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Enter a month name here to override the Excel file's Month column.
        </p>
      </div>

      <label 
        htmlFor="file-upload" 
        className="flex flex-col items-center justify-center w-full h-56 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-blue-400 transition-all group"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
             <Upload className="w-8 h-8 text-blue-500" />
          </div>
          <p className="mb-2 text-sm text-slate-600 font-medium">
            <span className="font-bold text-slate-800">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-slate-400">
            Excel files only (.xlsx, .xls)
          </p>
          
          <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-200">
            <FileSpreadsheet className="w-3 h-3" />
            <span>Supports smart header detection</span>
          </div>
        </div>
        <input 
          id="file-upload" 
          type="file" 
          accept=".xlsx, .xls" 
          className="hidden" 
          onChange={handleFileUpload}
        />
      </label>
    </div>
  );
};

export default FileUpload;
