
import { ProcessedProduct, RawProductRow } from "../types";

// This service now runs entirely OFFLINE without Gemini API
export const processLocalData = (
  rawItem: RawProductRow
): ProcessedProduct => {
  
  const originalPrice = rawItem.Price || 0;
  const mechanics = rawItem.Mechanics || "";
  let mechanicsAr = rawItem.MechanicsAr || ""; 

  let finalPrice = rawItem.FinalPrice;
  let discountLabel = mechanics;

  if (!finalPrice || finalPrice === 0) {
    const mechLower = mechanics.toLowerCase();
    
    // Logic 0: 2nd Piece Discounts 
    if (mechLower.includes('2nd') || mechLower.includes('second')) {
      const percentMatch = mechLower.match(/(\d+)%/);
      const percent = percentMatch ? percentMatch[1] : '50';
      
      finalPrice = originalPrice; 
      
      // UPDATED LABEL FORMAT
      discountLabel = `${percent}% OFF ON 2ND ITEM`;
      
      if (!mechanicsAr) mechanicsAr = `خصم ${percent}% على القطعة الثانية`;
    }
    // Logic 1: Percentage Off (VAT CALCULATION UPDATE)
    else {
      const percentMatch = mechLower.match(/(\d+)%\s*(off|discount|save)/);
      if (percentMatch && percentMatch[1]) {
        const percent = parseInt(percentMatch[1]);
        
        // VAT CALCULATION LOGIC:
        // 1. Calculate Price Before VAT (VAT is 15% in SA)
        const vatRate = 1.15;
        const priceBeforeVat = originalPrice / vatRate;
        
        // 2. Calculate Discount on Pre-VAT Price
        const discountMultiplier = (100 - percent) / 100;
        const priceAfterDiscountBeforeVat = priceBeforeVat * discountMultiplier;
        
        // 3. Add VAT (15%) back to find Final Price
        finalPrice = priceAfterDiscountBeforeVat * vatRate;

        discountLabel = `${percent}% OFF`;
        if (!mechanicsAr) mechanicsAr = `خصم ${percent}%`;
      }
      // Logic 2: Buy 1 Get 1 
      else if (mechLower.includes('1+1') || mechLower.includes('buy 1 get 1')) {
        finalPrice = originalPrice; 
        discountLabel = "1+1 FREE";
        if (!mechanicsAr) mechanicsAr = "١+١ مجاناً";
      }
      // Logic 3: Buy 2 Get 1
      else if (mechLower.includes('2+1') || mechLower.includes('buy 2 get 1')) {
        finalPrice = originalPrice; 
        discountLabel = "2+1 FREE";
        if (!mechanicsAr) mechanicsAr = "٢+١ مجاناً";
      }
      // Logic 4: Fixed Price
      else {
        const priceMatch = mechLower.match(/(?:now|for|at)\s*(\d+(?:\.\d+)?)/);
        if (priceMatch && priceMatch[1]) {
          finalPrice = parseFloat(priceMatch[1]);
        } else {
          finalPrice = originalPrice;
        }
      }
    }
  }

  if (finalPrice <= 0) finalPrice = originalPrice;

  if (discountLabel.length > 15 && !discountLabel.includes('%')) {
    if (discountLabel.toLowerCase().includes("buy 1 get 1")) discountLabel = "1+1 FREE";
    if (discountLabel.toLowerCase().includes("buy 2 get 1")) discountLabel = "2+1 FREE";
  }

  if (!mechanicsAr && discountLabel) {
    if (discountLabel.toUpperCase().includes("FREE")) {
        mechanicsAr = discountLabel.replace("FREE", "مجاناً");
    } else if (discountLabel.includes("OFF")) {
        mechanicsAr = discountLabel.replace("OFF", "خصم");
    }
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    sku: String(rawItem.SKU),
    originalMechanics: mechanics,
    name: rawItem.Name,
    nameAr: rawItem.NameAr,
    imageUrl: "", 
    logoUrl: "", 
    productPageUrl: rawItem.ProductPage, // Map direct product link
    originalPrice: originalPrice,
    finalPrice: finalPrice,
    discountLabel: discountLabel.toUpperCase(),
    discountLabelAr: mechanicsAr, 
    status: 'completed'
  };
};

export const enrichProductData = async (sku: string, mechanics: string) => {
  return {};
};
