import { ProcessedProduct, RawProductRow } from "../types";

// This service now runs entirely OFFLINE without Gemini API
export const processLocalData = (
  rawItem: RawProductRow
): ProcessedProduct => {
  
  const originalPrice = rawItem.Price || 0;
  const mechanics = rawItem.Mechanics || "";
  let mechanicsAr = rawItem.MechanicsAr || ""; // Get from Excel if available

  let finalPrice = rawItem.FinalPrice;
  let discountLabel = mechanics;

  // If Final Price is not provided in Excel, try to calculate it from Mechanics
  if (!finalPrice || finalPrice === 0) {
    const mechLower = mechanics.toLowerCase();
    
    // Logic 0: 2nd Piece Discounts (e.g., "50% off 2nd piece")
    // PRIORITY: Check this before generic % off, otherwise "50% off 2nd" gets caught as flat 50% off
    if (mechLower.includes('2nd') || mechLower.includes('second')) {
      const percentMatch = mechLower.match(/(\d+)%/);
      const percent = percentMatch ? percentMatch[1] : '50';
      
      // For "2nd piece" deals, the unit price displayed usually remains the Original Price
      // The savings is realized at the register when buying two.
      finalPrice = originalPrice; 
      
      discountLabel = `${percent}% OFF 2nd`;
      // Auto-translate if missing
      if (!mechanicsAr) mechanicsAr = `خصم ${percent}% على القطعة الثانية`;
    }
    // Logic 1: Percentage Off (e.g., "20% Off", "Save 30%")
    else {
      const percentMatch = mechLower.match(/(\d+)%\s*(off|discount|save)/);
      if (percentMatch && percentMatch[1]) {
        const percent = parseInt(percentMatch[1]);
        finalPrice = originalPrice * ((100 - percent) / 100);
        discountLabel = `${percent}% OFF`;
        // Auto-translate if missing
        if (!mechanicsAr) mechanicsAr = `خصم ${percent}%`;
      }
      // Logic 2: Buy 1 Get 1 (Treat as 50% off for single unit or just show promo)
      else if (mechLower.includes('1+1') || mechLower.includes('buy 1 get 1')) {
        finalPrice = originalPrice; 
        discountLabel = "1+1 FREE";
        // Auto-translate if missing
        if (!mechanicsAr) mechanicsAr = "١+١ مجاناً";
      }
      // Logic 3: Buy 2 Get 1
      else if (mechLower.includes('2+1') || mechLower.includes('buy 2 get 1')) {
        finalPrice = originalPrice; 
        discountLabel = "2+1 FREE";
        // Auto-translate if missing
        if (!mechanicsAr) mechanicsAr = "٢+١ مجاناً";
      }
      // Logic 4: Fixed Price ("Now 50", "For 50")
      else {
        const priceMatch = mechLower.match(/(?:now|for|at)\s*(\d+(?:\.\d+)?)/);
        if (priceMatch && priceMatch[1]) {
          finalPrice = parseFloat(priceMatch[1]);
        } else {
          // Fallback: No change in price, just show mechanics text
          finalPrice = originalPrice;
        }
      }
    }
  }

  // If we calculated a price that didn't make sense (e.g. 0), revert
  if (finalPrice <= 0) finalPrice = originalPrice;

  // Format label
  if (discountLabel.length > 15 && !discountLabel.includes('%')) {
    // Try to shorten standard strings
    if (discountLabel.toLowerCase().includes("buy 1 get 1")) discountLabel = "1+1 FREE";
    if (discountLabel.toLowerCase().includes("buy 2 get 1")) discountLabel = "2+1 FREE";
  }

  // Final Auto-translate check if mechanicsAr is still empty
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
    nameAr: rawItem.NameAr, // STRICTLY map to Excel Arabic Name only
    imageUrl: "", // Handled by App.tsx
    logoUrl: "", // Handled by App.tsx
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