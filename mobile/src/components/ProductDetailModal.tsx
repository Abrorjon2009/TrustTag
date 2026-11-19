import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Image, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { formatPrice } from '../utils/formatters';

interface ProductDetailModalProps {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  onStartTrade: (product: Product, agreedPrice: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  visible,
  onClose,
  onStartTrade,
}) => {
  const { currentUser } = useAuth();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showPriceNegotiateModal, setShowPriceNegotiateModal] = useState(false);
  const [negotiatedPriceInput, setNegotiatedPriceInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (visible && product && currentUser) {
      api.getFavorites(currentUser.id)
        .then((favs) => {
          setIsFavorite(favs.some((f: any) => f.id === product.id));
        })
        .catch(() => {});
    }
  }, [visible, product, currentUser]);

  const handleToggleFavorite = async () => {
    if (!currentUser || !product) return;
    try {
      const res = await api.toggleFavorite(currentUser.id, product.id);
      setIsFavorite(res.isFavorite);
    } catch (err: any) {
      console.error('Favorite toggle error:', err);
    }
  };

  if (!product) return null;

  const images = product.images?.length > 0 ? product.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'];
  const priceParts = product.price.toFixed(2).split('.');

  const handleStartTradeClick = () => {
    if (currentUser?.id === product.sellerId) {
      Alert.alert('Eslatma', 'Bu sizning o\'z e\'loningiz.');
      return;
    }
    setNegotiatedPriceInput(product.price.toString());
    setShowPriceNegotiateModal(true);
  };

  const handleConfirmStartTrade = () => {
    const finalPrice = parseFloat(negotiatedPriceInput) || product.price;
    setShowPriceNegotiateModal(false);
    onStartTrade(product, finalPrice);
  };

  const handleCallSeller = () => {
    if (product.seller.phoneNumber) {
      Linking.openURL(`tel:${product.seller.phoneNumber}`).catch(() => {
        Alert.alert('Sotuvchi Telefoni', product.seller.phoneNumber || '');
      });
    } else {
      Alert.alert('Maxfiy', 'Sotuvchi telefon raqamini yashirgan. Iltimos, xavfsiz chat orqali yozishing.');
    }
  };

  const handleEmailSeller = () => {
    if (product.seller.email) {
      Linking.openURL(`mailto:${product.seller.email}?subject=Question about ${product.title}`).catch(() => {
        Alert.alert('Sotuvchi Emaili', product.seller.email || '');
      });
    } else {
      Alert.alert('Maxfiy', 'Sotuvchi email manzilini yashirgan. Iltimos, xavfsiz chat orqali yozishing.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Navbar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={onClose} style={styles.navButton}>
            <Ionicons name="arrow-back" size={24} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            {product.category}
          </Text>
          <TouchableOpacity onPress={handleToggleFavorite} style={styles.navButton}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? THEME.colors.alertRed : THEME.colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          {/* Main Photo Gallery */}
          <View style={styles.imageGallery}>
            <Image source={{ uri: images[selectedPhotoIndex] }} style={styles.mainImage} resizeMode="cover" />
            <View style={styles.photoPagingBadge}>
              <Text style={styles.photoPagingText}>
                {selectedPhotoIndex + 1} / {images.length}
              </Text>
            </View>
          </View>

          {/* Photo Thumbnails */}
          {images.length > 1 && (
            <ScrollView horizontal style={styles.thumbStrip} showsHorizontalScrollIndicator={false}>
              {images.map((img, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedPhotoIndex(idx)}
                  style={[styles.thumbBox, selectedPhotoIndex === idx && styles.thumbBoxActive]}
                >
                  <Image source={{ uri: img }} style={styles.thumbImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Price & Title Card */}
          <View style={styles.detailsCard}>
            <View style={styles.priceContainer}>
              <View style={styles.priceStack}>
                <Text style={styles.priceInteger}>{formatPrice(product.price)}</Text>
              </View>
              <View style={styles.pricingTag}>
                <Text style={styles.pricingTagText}>
                  {product.pricingType === 'NEGOTIABLE'
                    ? 'Negotiable Price'
                    : product.pricingType === 'TRADE_SWAP'
                    ? 'Trade / Swap Allowed'
                    : 'Fixed Price'}
                </Text>
              </View>
            </View>

            <Text style={styles.title}>{product.title}</Text>

            {/* Condition & Product Type Pills */}
            <View style={styles.badgeRow}>
              {product.productType === 'ONLINE' ? (
                <View style={[styles.pill, styles.pillOnline]}>
                  <Ionicons name="cloud-outline" size={12} color="#2563EB" />
                  <Text style={styles.pillOnlineText}>Online Product / Digital Delivery</Text>
                </View>
              ) : (
                <View style={[styles.pill, styles.pillPhysical]}>
                  <Ionicons name="cube-outline" size={12} color={THEME.colors.primary} />
                  <Text style={styles.pillPhysicalText}>
                    Condition: {product.condition ? product.condition.replace('_', ' ') : 'Used'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Seller Trust Profile */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionHeading}>Seller Trust & Verification</Text>
            <View style={styles.sellerHeader}>
              <Image
                source={{
                  uri:
                    product.seller.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
                }}
                style={styles.sellerAvatar}
              />
              <View style={styles.sellerInfo}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName}>{product.seller.fullName}</Text>
                  {product.seller.isPhoneVerified && (
                    <View style={styles.verifiedBadge}>
                      <Image
                        source={require('../../assets/logo-mark.png')}
                        style={{ width: 12, height: 15, marginRight: 4 }}
                        resizeMode="contain"
                      />
                      <Text style={styles.verifiedText}>Trusttag Verified</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sellerStats}>
                  🛡️ {product.seller.successfulSalesCount} Muvaffaqiyatli Trusttag Savdolar
                </Text>
              </View>
            </View>
          </View>

          {/* Delivery & Reach Breakdown */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionHeading}>Delivery Coverage & Handover</Text>
            <View style={styles.deliveryBlock}>
              <View style={styles.deliveryRow}>
                <Ionicons name="location-outline" size={18} color={THEME.colors.primary} />
                <View style={styles.deliveryTextCol}>
                  <Text style={styles.deliverySublabel}>Delivery Reach</Text>
                  <Text style={styles.deliveryMainText}>
                    {product.deliveryScope === 'WHOLE_COUNTRY'
                      ? '🚀 Delivers to Whole Country'
                      : product.deliveryScope === 'ONLINE_ONLY'
                      ? '⚡ Digital Good: Available Everywhere'
                      : '📍 Delivers to custom regions and cities'}
                  </Text>
                </View>
              </View>

              <View style={styles.deliveryRow}>
                <Ionicons name="car-outline" size={18} color={THEME.colors.primary} />
                <View style={styles.deliveryTextCol}>
                  <Text style={styles.deliverySublabel}>Handover Method</Text>
                  <Text style={styles.deliveryMainText}>
                    {product.deliveryMethods?.join(' • ') || 'In-Person Meetup / Courier'}
                  </Text>
                </View>
              </View>

              <View style={styles.deliveryRow}>
                <Ionicons name="wallet-outline" size={18} color={THEME.colors.primary} />
                <View style={styles.deliveryTextCol}>
                  <Text style={styles.deliverySublabel}>Delivery Fee</Text>
                  <Text style={styles.deliveryMainText}>
                    {product.deliveryPayer === 'FREE_DELIVERY'
                      ? 'Free Delivery by Seller'
                      : product.deliveryPayer === 'BUYER_PAYS'
                      ? 'Buyer Pays Delivery'
                      : 'Negotiable in Chat'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionHeading}>Product Description</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Contact & Safe Trade Action Dock */}
        <View style={styles.bottomDock}>
          <View style={styles.directContactActions}>
            <TouchableOpacity style={styles.contactIconBtn} onPress={handleCallSeller}>
              <Ionicons name="call-outline" size={20} color={THEME.colors.textPrimary} />
              <Text style={styles.contactBtnLabel}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactIconBtn} onPress={handleEmailSeller}>
              <Ionicons name="mail-outline" size={20} color={THEME.colors.textPrimary} />
              <Text style={styles.contactBtnLabel}>Email</Text>
            </TouchableOpacity>
          </View>

          {/* Start Safe Trade Button */}
          <TouchableOpacity style={styles.startTradeBtn} onPress={handleStartTradeClick}>
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.startTradeTitle}>Chat & Start Safe Trade</Text>
              <Text style={styles.startTradeSubtitle}>Central Bank Protected</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Negotiated Price Confirmation Modal */}
        <Modal
          visible={showPriceNegotiateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPriceNegotiateModal(false)}
        >
          <View style={styles.priceModalOverlay}>
            <View style={styles.priceModalBox}>
              <Text style={styles.priceModalTitle}>Start Safe Trade Session</Text>
              <Text style={styles.priceModalDesc}>
                Enter the final agreed price for this trade (you can negotiate with the seller first in chat):
              </Text>

              <View style={styles.priceInputBox}>
                <Text style={styles.priceInputCurrency}>$</Text>
                <Text style={styles.priceInputVal}>{negotiatedPriceInput || product.price}</Text>
              </View>

              <View style={styles.priceModalBtns}>
                <TouchableOpacity
                  style={styles.priceCancelBtn}
                  onPress={() => setShowPriceNegotiateModal(false)}
                >
                  <Text style={styles.priceCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.priceConfirmBtn}
                  onPress={handleConfirmStartTrade}
                >
                  <Text style={styles.priceConfirmText}>Enter Safe Trade</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.canvasBg,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  navButton: {
    padding: 6,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  scrollArea: {
    flex: 1,
  },
  imageGallery: {
    width: '100%',
    height: 340,
    backgroundColor: '#000',
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  photoPagingBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.pill,
  },
  photoPagingText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  thumbStrip: {
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  thumbBox: {
    width: 60,
    height: 60,
    borderRadius: THEME.borderRadius.sm,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbBoxActive: {
    borderColor: THEME.colors.primary,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 10,
    ...THEME.shadows.card,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceStack: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginRight: 2,
  },
  priceInteger: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: -0.5,
  },
  priceDecimal: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  pricingTag: {
    backgroundColor: THEME.colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.xs,
  },
  pricingTagText: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    lineHeight: 24,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.xs,
    gap: 4,
  },
  pillOnline: {
    backgroundColor: '#EFF6FF',
  },
  pillOnlineText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '600',
  },
  pillPhysical: {
    backgroundColor: THEME.colors.primaryTint,
  },
  pillPhysicalText: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 12,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.safeGreenLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.xs,
    gap: 2,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.safeGreen,
  },
  sellerStats: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  deliveryBlock: {
    gap: 12,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deliveryTextCol: {
    flex: 1,
  },
  deliverySublabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  deliveryMainText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  descriptionText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 22,
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...THEME.shadows.float,
  },
  directContactActions: {
    flexDirection: 'row',
    gap: 12,
  },
  contactIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  contactBtnLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  startTradeBtn: {
    flex: 1,
    height: 48,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startTradeTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  startTradeSubtitle: {
    color: '#FFE2D6',
    fontSize: 10,
    fontWeight: '600',
  },
  priceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  priceModalBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    ...THEME.shadows.float,
  },
  priceModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  priceModalDesc: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  priceInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.canvasBg,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 14,
    marginBottom: 20,
  },
  priceInputCurrency: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginRight: 4,
  },
  priceInputVal: {
    fontSize: 32,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  priceModalBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  priceCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.canvasBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceCancelText: {
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },
  priceConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

