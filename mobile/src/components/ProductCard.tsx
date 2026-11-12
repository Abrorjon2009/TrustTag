import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const imageUrl = product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';

  // Format price into integer and decimal parts for Taobao price stack
  const priceParts = product.price.toFixed(2).split('.');
  const integerPart = priceParts[0];
  const decimalPart = priceParts[1];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Image Container with Top-Left Badge */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        
        {/* Type / Condition Badge */}
        <View style={styles.badgeOverlay}>
          {product.productType === 'ONLINE' ? (
            <View style={[styles.badge, styles.badgeOnline]}>
              <Ionicons name="cloud-outline" size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
              <Text style={styles.badgeOnlineText}>Online</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgePhysical]}>
              <Text style={styles.badgePhysicalText}>
                {product.condition ? product.condition.replace('_', ' ') : 'Physical'}
              </Text>
            </View>
          )}
        </View>

        {/* Delivery Reach Pill */}
        <View style={styles.deliveryPill}>
          <Text style={styles.deliveryText} numberOfLines={1}>
            {product.deliveryScope === 'WHOLE_COUNTRY'
              ? '🚀 Whole Country'
              : product.deliveryScope === 'ONLINE_ONLY'
              ? '⚡ Instant Delivery'
              : '📍 Custom Reach'}
          </Text>
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {/* 2-line title */}
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>

        {/* Pricing Tags */}
        <View style={styles.tagRow}>
          {product.pricingType === 'NEGOTIABLE' && (
            <View style={styles.tagNegotiable}>
              <Text style={styles.tagNegotiableText}>Negotiable</Text>
            </View>
          )}
          {product.pricingType === 'TRADE_SWAP' && (
            <View style={styles.tagSwap}>
              <Text style={styles.tagSwapText}>Swap Allowed</Text>
            </View>
          )}
          <View style={styles.tagPayer}>
            <Text style={styles.tagPayerText}>
              {product.deliveryPayer === 'FREE_DELIVERY' ? 'Free Delivery' : 'Buyer Pays'}
            </Text>
          </View>
        </View>

        {/* Taobao Signature 3-Tier Price Stack */}
        <View style={styles.priceRow}>
          <View style={styles.priceStack}>
            <Text style={styles.currencySymbol}>$</Text>
            <Text style={styles.priceInteger}>{integerPart}</Text>
            <Text style={styles.priceDecimal}>.{decimalPart}</Text>
          </View>

          {/* Quick Chat Pill */}
          <View style={styles.quickChatPill}>
            <Ionicons name="chatbubble-ellipses" size={12} color={THEME.colors.primary} />
          </View>
        </View>

        {/* Seller Trust Bar */}
        <View style={styles.sellerRow}>
          <Text style={styles.sellerName} numberOfLines={1}>
            {product.seller.fullName}
          </Text>
          <View style={styles.trustBadge}>
            <Ionicons name="shield-checkmark" size={10} color={THEME.colors.safeGreen} />
            <Text style={styles.trustText}>
              {product.seller.successfulSalesCount} Safe Trades
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    ...THEME.shadows.card,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.xs,
  },
  badgeOnline: {
    backgroundColor: '#2563EB',
  },
  badgeOnlineText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  badgePhysical: {
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  badgePhysicalText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  deliveryPill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.xs,
  },
  deliveryText: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  content: {
    padding: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  tagNegotiable: {
    backgroundColor: THEME.colors.primaryTint,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  tagNegotiableText: {
    color: THEME.colors.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  tagSwap: {
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  tagSwapText: {
    color: '#9333EA',
    fontSize: 9,
    fontWeight: '700',
  },
  tagPayer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  tagPayerText: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  priceStack: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginRight: 1,
  },
  priceInteger: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: -0.5,
  },
  priceDecimal: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  quickChatPill: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: THEME.colors.primaryTint,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: THEME.colors.borderSubtle,
    paddingTop: 4,
  },
  sellerName: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    maxWidth: 70,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trustText: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.colors.safeGreen,
  },
});

