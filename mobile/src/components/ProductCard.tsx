import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const imageUrl = product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';

  // Format price with space separator (e.g. 100 000)
  const formattedPrice = Math.round(product.price)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // Format condition badge (e.g. "Used · Good")
  const formatCondition = (cond?: string | null, type?: string) => {
    if (type === 'ONLINE') return 'Digital';
    if (!cond) return 'Used · Good';
    return cond
      .replace(/_/g, ' · ')
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const conditionText = formatCondition(product.condition, product.productType);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Product Image with Badges */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />

        {/* Top-Left Condition Badge */}
        <View style={styles.conditionBadge}>
          <Text style={styles.conditionText}>{conditionText}</Text>
        </View>

        {/* Top-Right Heart Button */}
        {onToggleFavorite && (
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={(e: any) => {
              e?.stopPropagation?.();
              onToggleFavorite();
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={16}
              color={isFavorite ? THEME.colors.alertRed : THEME.colors.textDark}
            />
          </TouchableOpacity>
        )}

        {/* Bottom-Left Delivery Reach Pill */}
        <View style={styles.deliveryPill}>
          <Ionicons name="location-sharp" size={11} color={THEME.colors.textSecondary} style={{ marginRight: 3 }} />
          <Text style={styles.deliveryText} numberOfLines={1}>
            {product.deliveryScope === 'WHOLE_COUNTRY'
              ? 'Whole Country'
              : product.deliveryScope === 'ONLINE_ONLY'
              ? 'Instant Online'
              : 'Whole Country'}
          </Text>
        </View>
      </View>

      {/* Card Content */}
      <View style={styles.content}>
        {/* Title (14px Semibold #0F172A) */}
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>

        {/* Price (16px Bold #FF6B00) */}
        <View style={styles.priceRow}>
          <Text style={styles.priceInteger}>{formattedPrice}</Text>
          <Text style={styles.currencyText}> so'm</Text>
        </View>

        {/* Seller Info & Verified Badge */}
        <View style={styles.sellerRow}>
          <View style={styles.sellerInfo}>
            <Ionicons name="person-outline" size={12} color={THEME.colors.textSecondary} style={{ marginRight: 3 }} />
            <Text style={styles.sellerName} numberOfLines={1}>
              {product.seller?.fullName || 'Seller'}
            </Text>
          </View>

          <View style={styles.trustBadge}>
            <Ionicons name="shield-checkmark" size={12} color={THEME.colors.success} style={{ marginRight: 3 }} />
            <Text style={styles.trustText}>
              {product.seller?.successfulSalesCount || 21} SafeTrade
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...THEME.shadows.card,
    marginBottom: 12,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1.05,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  conditionBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: THEME.borderRadius.pill,
  },
  conditionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  deliveryPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: THEME.borderRadius.pill,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  deliveryText: {
    fontSize: 10,
    fontWeight: '500',
    color: THEME.colors.textDark,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textDark,
    lineHeight: 19,
    marginBottom: 6,
    height: 38,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  priceInteger: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  currencyText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 4,
  },
  sellerName: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '400',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.success,
  },
});
