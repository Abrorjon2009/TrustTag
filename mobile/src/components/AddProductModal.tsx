import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { api } from '../api/client';

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  onProductCreated: () => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  visible,
  onClose,
  onProductCreated,
}) => {
  const { currentUser } = useAuth();
  const { regions } = useLocation();

  // Basic Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [subcategory, setSubcategory] = useState('Phones & Tablets');
  const [price, setPrice] = useState('');
  const [pricingType, setPricingType] = useState<'FIXED' | 'NEGOTIABLE' | 'TRADE_SWAP'>('FIXED');
  const [showPhone, setShowPhone] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600',
  ]);

  // Product Type
  const [productType, setProductType] = useState<'PHYSICAL' | 'ONLINE'>('PHYSICAL');
  const [condition, setCondition] = useState<'BRAND_NEW' | 'LIKE_NEW' | 'USED_GOOD' | 'USED_FAIR'>('LIKE_NEW');

  // Item Current Location
  const [itemRegionId, setItemRegionId] = useState<number>(regions[0]?.id || 1);
  const [itemDistrictId, setItemDistrictId] = useState<number>(regions[0]?.districts?.[0]?.id || 1);
  const [itemCityId, setItemCityId] = useState<number>(regions[0]?.districts?.[0]?.cities?.[0]?.id || 1);

  // Delivery Reach
  const [isWholeCountry, setIsWholeCountry] = useState(true);
  const [selectedReachRegionIds, setSelectedReachRegionIds] = useState<number[]>([1]);
  const [deliveryPayer, setDeliveryPayer] = useState<'FREE_DELIVERY' | 'BUYER_PAYS' | 'NEGOTIABLE'>('BUYER_PAYS');
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>(['IN_PERSON_MEETUP', 'COURIER']);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleMethod = (method: string) => {
    if (deliveryMethods.includes(method)) {
      setDeliveryMethods(deliveryMethods.filter((m) => m !== method));
    } else {
      setDeliveryMethods([...deliveryMethods, method]);
    }
  };

  const toggleReachRegion = (regId: number) => {
    if (selectedReachRegionIds.includes(regId)) {
      setSelectedReachRegionIds(selectedReachRegionIds.filter((id) => id !== regId));
    } else {
      setSelectedReachRegionIds([...selectedReachRegionIds, regId]);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim() || !price) {
      alert('Please fill out Title, Description, and Price.');
      return;
    }

    if (!currentUser) {
      alert('Please select an active user first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        sellerId: currentUser.id,
        title: title.trim(),
        description: description.trim(),
        category,
        subcategory,
        productType,
        condition: productType === 'PHYSICAL' ? condition : null,
        price: parseFloat(price),
        pricingType,
        showPhone,
        showEmail,
        images,
        deliveryPayer,
        deliveryMethods: productType === 'ONLINE' ? ['ONLINE_DELIVERY'] : deliveryMethods,
      };

      if (productType === 'ONLINE') {
        payload.deliveryScope = 'ONLINE_ONLY';
      } else {
        if (isWholeCountry) {
          payload.deliveryScope = 'WHOLE_COUNTRY';
        } else {
          payload.deliveryScope = 'CUSTOM';
          payload.customReach = selectedReachRegionIds.map((regId) => ({
            regionId: regId,
            isEntireRegion: true,
          }));
        }
        payload.itemRegionId = itemRegionId;
        payload.itemDistrictId = itemDistrictId;
        payload.itemCityId = itemCityId;
      }

      await api.createProduct(payload);
      alert('Product listed successfully!');
      onProductCreated();
      onClose();
    } catch (err: any) {
      alert(`Error creating listing: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post New Listing</Text>
          <TouchableOpacity
            style={[styles.postButton, isSubmitting && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.postButtonText}>Publish</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {/* Product Type Switcher */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. What kind of item are you listing?</Text>
            <View style={styles.typeSwitcher}>
              <TouchableOpacity
                style={[styles.typeBtn, productType === 'PHYSICAL' && styles.typeBtnActive]}
                onPress={() => setProductType('PHYSICAL')}
              >
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color={productType === 'PHYSICAL' ? THEME.colors.primary : THEME.colors.textSecondary}
                />
                <Text style={[styles.typeBtnText, productType === 'PHYSICAL' && styles.typeBtnTextActive]}>
                  Physical Product
                </Text>
                <Text style={styles.typeBtnSub}>Phones, Gear, Laptops</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, productType === 'ONLINE' && styles.typeBtnActive]}
                onPress={() => setProductType('ONLINE')}
              >
                <Ionicons
                  name="cloud-outline"
                  size={20}
                  color={productType === 'ONLINE' ? THEME.colors.primary : THEME.colors.textSecondary}
                />
                <Text style={[styles.typeBtnText, productType === 'ONLINE' && styles.typeBtnTextActive]}>
                  Online / Digital
                </Text>
                <Text style={styles.typeBtnSub}>Game Accts, Keys, Codes</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Basic Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Item Details</Text>
            <Text style={styles.inputLabel}>Product Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sony PlayStation 5 with 2 Controllers"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.catRow}>
              {['Electronics', 'Computers', 'Gaming & Digital Accounts', 'Clothing & Accessories'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, category === cat && styles.catChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Price ($) *</Text>
            <View style={styles.priceRow}>
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="250.00"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
              <View style={styles.pricingTypeGroup}>
                {(['FIXED', 'NEGOTIABLE', 'TRADE_SWAP'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.pricingTypeChip, pricingType === type && styles.pricingTypeChipActive]}
                    onPress={() => setPricingType(type)}
                  >
                    <Text
                      style={[
                        styles.pricingTypeChipText,
                        pricingType === type && styles.pricingTypeChipTextActive,
                      ]}
                    >
                      {type === 'FIXED' ? 'Fixed' : type === 'NEGOTIABLE' ? 'Negotiable' : 'Swap'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {productType === 'PHYSICAL' && (
              <>
                <Text style={styles.inputLabel}>Item Condition</Text>
                <View style={styles.conditionRow}>
                  {(['BRAND_NEW', 'LIKE_NEW', 'USED_GOOD', 'USED_FAIR'] as const).map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.conditionChip, condition === c && styles.conditionChipActive]}
                      onPress={() => setCondition(c)}
                    >
                      <Text style={[styles.conditionText, condition === c && styles.conditionTextActive]}>
                        {c.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe condition, history, included accessories, or reasons for selling..."
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Location & Delivery Reach (for Physical products) */}
          {productType === 'PHYSICAL' ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Smart Location & Delivery Reach</Text>

              {/* Where item is right now */}
              <Text style={styles.inputLabel}>Where is the item right now? (For Meetups)</Text>
              <View style={styles.locationSelectorRow}>
                {regions.map((reg) => (
                  <TouchableOpacity
                    key={reg.id}
                    style={[styles.locationChip, itemRegionId === reg.id && styles.locationChipActive]}
                    onPress={() => {
                      setItemRegionId(reg.id);
                      if (reg.districts?.[0]) {
                        setItemDistrictId(reg.districts[0].id);
                        if (reg.districts[0].cities?.[0]) {
                          setItemCityId(reg.districts[0].cities[0].id);
                        }
                      }
                    }}
                  >
                    <Text
                      style={[styles.locationChipText, itemRegionId === reg.id && styles.locationChipTextActive]}
                    >
                      {reg.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Delivery Reach Mode */}
              <Text style={styles.inputLabel}>Where can you deliver or send this item?</Text>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Deliver to Whole Country</Text>
                  <Text style={styles.switchSub}>You can ship or courier anywhere nationwide</Text>
                </View>
                <Switch
                  value={isWholeCountry}
                  onValueChange={setIsWholeCountry}
                  trackColor={{ false: '#D1D5DB', true: THEME.colors.primary }}
                />
              </View>

              {!isWholeCountry && (
                <View style={styles.customReachBox}>
                  <Text style={styles.customReachTitle}>Select Regions you deliver to:</Text>
                  <View style={styles.catRow}>
                    {regions.map((reg) => {
                      const isSelected = selectedReachRegionIds.includes(reg.id);
                      return (
                        <TouchableOpacity
                          key={reg.id}
                          style={[styles.catChip, isSelected && styles.catChipActive]}
                          onPress={() => toggleReachRegion(reg.id)}
                        >
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={14}
                            color={isSelected ? THEME.colors.primary : THEME.colors.textSecondary}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                            {reg.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Handover Methods */}
              <Text style={styles.inputLabel}>Handover Methods</Text>
              <View style={styles.catRow}>
                {[
                  { id: 'IN_PERSON_MEETUP', label: '🤝 In-Person Meetup' },
                  { id: 'COURIER', label: '🚚 Local Courier' },
                  { id: 'POST_MAIL', label: '📦 Post / Mail' },
                ].map((m) => {
                  const isChecked = deliveryMethods.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.catChip, isChecked && styles.catChipActive]}
                      onPress={() => toggleMethod(m.id)}
                    >
                      <Text style={[styles.catChipText, isChecked && styles.catChipTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Who pays delivery */}
              <Text style={styles.inputLabel}>Who pays for delivery?</Text>
              <View style={styles.catRow}>
                {[
                  { id: 'FREE_DELIVERY', label: 'Free Delivery' },
                  { id: 'BUYER_PAYS', label: 'Buyer Pays' },
                  { id: 'NEGOTIABLE', label: 'Negotiable' },
                ].map((dp) => (
                  <TouchableOpacity
                    key={dp.id}
                    style={[styles.catChip, deliveryPayer === dp.id && styles.catChipActive]}
                    onPress={() => setDeliveryPayer(dp.id as any)}
                  >
                    <Text style={[styles.catChipText, deliveryPayer === dp.id && styles.catChipTextActive]}>
                      {dp.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Online Delivery Setup</Text>
              <View style={styles.onlineInfoBox}>
                <Ionicons name="flash-outline" size={24} color={THEME.colors.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.onlineInfoTitle}>Automatic Everywhere Reach</Text>
                  <Text style={styles.onlineInfoText}>
                    Online products (accounts, digital keys, files) are automatically available to all buyers
                    nationwide. You will deliver credentials directly in the Safe Trade In-App Chat.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Contact Visibility */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Contact Info Visibility</Text>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Show Phone Number</Text>
                <Text style={styles.switchSub}>Allow customers to call or SMS you directly</Text>
              </View>
              <Switch value={showPhone} onValueChange={setShowPhone} />
            </View>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Show Email Address</Text>
                <Text style={styles.switchSub}>Allow customers to send emails</Text>
              </View>
              <Switch value={showEmail} onValueChange={setShowEmail} />
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.canvasBg,
  },
  header: {
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
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  postButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.pill,
  },
  postButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  body: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 10,
    ...THEME.shadows.card,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 12,
  },
  typeSwitcher: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: THEME.colors.borderSubtle,
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  typeBtnActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryTint,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 6,
  },
  typeBtnTextActive: {
    color: THEME.colors.primary,
  },
  typeBtnSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.borderMedium,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.colors.textPrimary,
    backgroundColor: '#FFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderMedium,
    backgroundColor: '#FFF',
  },
  catChipActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryTint,
  },
  catChipText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  pricingTypeGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  pricingTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.canvasBg,
  },
  pricingTypeChipActive: {
    backgroundColor: THEME.colors.primary,
  },
  pricingTypeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  pricingTypeChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  conditionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.xs,
    backgroundColor: THEME.colors.canvasBg,
  },
  conditionChipActive: {
    backgroundColor: THEME.colors.primaryTint,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
  },
  conditionText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  conditionTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  locationSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  locationChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.canvasBg,
  },
  locationChipActive: {
    backgroundColor: THEME.colors.primaryTint,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
  },
  locationChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  locationChipTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  switchSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  customReachBox: {
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
    marginVertical: 10,
  },
  customReachTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  onlineInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryTint,
    padding: 14,
    borderRadius: THEME.borderRadius.md,
  },
  onlineInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  onlineInfoText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});

