import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

interface KingKongGridProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const CATEGORIES = [
  { id: 'Electronics', label: 'Electronics', icon: 'hardware-chip-outline', color: '#FF5000', bg: '#FFF1EB' },
  { id: 'Computers', label: 'Laptops', icon: 'laptop-outline', color: '#2563EB', bg: '#EFF6FF' },
  { id: 'Gaming & Digital Accounts', label: 'Gaming/Accts', icon: 'game-controller-outline', color: '#9333EA', bg: '#FAF5FF' },
  { id: 'Home & Appliances', label: 'Home', icon: 'home-outline', color: '#059669', bg: '#ECFDF5' },
  { id: 'Clothing & Accessories', label: 'Fashion', icon: 'shirt-outline', color: '#EA580C', bg: '#FFF7ED' },
  { id: 'Vehicles & Parts', label: 'Motors', icon: 'car-sport-outline', color: '#D97706', bg: '#FFFBEB' },
  { id: 'Phones & Tablets', label: 'Phones', icon: 'phone-portrait-outline', color: '#0284C7', bg: '#F0F9FF' },
  { id: 'Online Only', label: 'Digital', icon: 'cloud-download-outline', color: '#4F46E5', bg: '#EEF2FF' },
  { id: 'Negotiable Only', label: 'Negotiable', icon: 'swap-horizontal-outline', color: '#E11D48', bg: '#FFF1F2' },
  { id: 'All', label: 'All Items', icon: 'grid-outline', color: '#475569', bg: '#F1F5F9' },
];

export const KingKongGrid: React.FC<KingKongGridProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.item, isSelected && styles.itemActive]}
              onPress={() => onSelectCategory(cat.id === selectedCategory ? 'All' : cat.id)}
            >
              <View style={[styles.iconCircle, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon as any} size={22} color={cat.color} />
              </View>
              <Text style={[styles.label, isSelected && styles.labelActive]} numberOfLines={1}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  item: {
    width: '20%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemActive: {
    transform: [{ scale: 1.05 }],
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  labelActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
});

