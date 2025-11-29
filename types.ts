
export interface RawProductRow {
  SKU: string | number;
  Mechanics: string;
  MechanicsAr?: string; // Added: Arabic Mechanics from Excel
  Image?: string;
  Logo?: string;      
  Name: string;       
  NameAr?: string;    
  Price: number;      
  FinalPrice?: number; 
  Month?: string | number; // Added: Month for dynamic title
  ProductPage?: string; // Added: Direct link to product page
}

export interface ProcessedProduct {
  id: string;
  sku: string;
  originalMechanics: string;
  name: string;
  nameAr?: string;
  imageUrl: string;
  logoUrl?: string;   
  productPageUrl?: string; // Added: Direct link to product page
  originalPrice: number;
  finalPrice: number;
  discountLabel: string; // e.g., "50% OFF"
  discountLabelAr?: string; // Added: Arabic Label e.g., "خصم 50%"
  status: 'pending' | 'loading' | 'completed' | 'error';
  error?: string;
}

export enum PromoType {
  DISCOUNT = 'DISCOUNT',
  BOGO = 'BOGO',
  BUNDLE = 'BUNDLE',
  OTHER = 'OTHER'
}
