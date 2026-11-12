export interface GeoCity {
  id: number;
  districtId: number;
  name: string;
}

export interface GeoDistrict {
  id: number;
  regionId: number;
  name: string;
  cities: GeoCity[];
}

export interface GeoRegion {
  id: number;
  name: string;
  districts: GeoDistrict[];
}

export interface User {
  id: string;
  phoneNumber: string;
  email?: string | null;
  fullName: string;
  avatarUrl?: string | null;
  isPhoneVerified: boolean;
  successfulSalesCount: number;
  successfulBuysCount: number;
  unresolvedReportsCount: number;
  isBanned: boolean;
  isAdmin: boolean;
}

export interface ProductDeliveryReach {
  id: number;
  productId: string;
  regionId?: number | null;
  districtId?: number | null;
  cityId?: number | null;
  isEntireRegion: boolean;
  isEntireDistrict: boolean;
  region?: GeoRegion;
  district?: GeoDistrict;
  city?: GeoCity;
}

export interface Product {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  productType: 'ONLINE' | 'PHYSICAL';
  condition?: 'BRAND_NEW' | 'LIKE_NEW' | 'USED_GOOD' | 'USED_FAIR' | 'FOR_PARTS' | null;
  price: number;
  pricingType: 'FIXED' | 'NEGOTIABLE' | 'TRADE_SWAP';
  showPhone: boolean;
  showEmail: boolean;
  itemRegionId?: number | null;
  itemDistrictId?: number | null;
  itemCityId?: number | null;
  itemRegion?: GeoRegion | null;
  itemDistrict?: GeoDistrict | null;
  itemCity?: GeoCity | null;
  deliveryScope: 'WHOLE_COUNTRY' | 'CUSTOM' | 'ONLINE_ONLY';
  deliveryPayer: 'FREE_DELIVERY' | 'BUYER_PAYS' | 'NEGOTIABLE';
  deliveryMethods: string[];
  status: 'AVAILABLE' | 'RESERVED_IN_TRADE' | 'SOLD' | 'ARCHIVED';
  images: string[];
  createdAt: string;
  seller: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    isPhoneVerified: boolean;
    successfulSalesCount: number;
    successfulBuysCount?: number;
    unresolvedReportsCount?: number;
    createdAt?: string;
  };
  deliveryReach?: ProductDeliveryReach[];
}

export interface TradeBannerInfo {
  stage: string;
  color: 'gray' | 'green' | 'blue' | 'yellow' | 'red';
  badgeBg: string;
  badgeText: string;
  title: string;
  message: string;
  canDeposit: boolean;
  canConfirmReceived: boolean;
  canWithdraw: boolean;
  canReport: boolean;
}

export interface ChatMessage {
  id: string;
  tradeSessionId: string;
  senderId: string;
  sender: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  messageText: string;
  isSystemEvent: boolean;
  systemEventType?: string | null;
  createdAt: string;
}

export interface TradeSession {
  id: string;
  productId: string;
  product: Product;
  buyerId: string;
  sellerId: string;
  buyer: User;
  seller: User;
  agreedPrice: number;
  status: 'NEGOTIATING' | 'MONEY_IN_SAFE_HOLD' | 'COMPLETED' | 'CANCELLED_WITHDRAWN' | 'UNDER_INVESTIGATION';
  depositedAt?: string | null;
  completedAt?: string | null;
  withdrawnAt?: string | null;
  disputedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  chatMessages: ChatMessage[];
  banner: TradeBannerInfo;
}

export interface Wallet {
  id: string;
  userId: string;
  availableBalance: number;
  safeHoldBalance: number;
  frozenBalance: number;
}

export interface LedgerEntry {
  id: string;
  tradeSessionId?: string | null;
  amount: number;
  txType: string;
  idempotencyKey: string;
  notes?: string | null;
  createdAt: string;
  isCredit: boolean;
}

export interface Dispute {
  id: string;
  tradeSessionId: string;
  tradeSession: {
    id: string;
    agreedPrice: number;
    product: Product;
    buyer: User;
    seller: User;
  };
  reporterId: string;
  reporter: User;
  accusedId: string;
  accused: User;
  reasonCode: string;
  description: string;
  status: 'OPEN_PENDING' | 'INVESTIGATING' | 'RESOLVED_SELLER_PAID' | 'RESOLVED_BUYER_REFUNDED' | 'DISMISSED';
  adminNotes?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  evidence: Array<{
    id: string;
    fileUrl: string;
    fileType: string;
  }>;
}

