import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

interface KingKongGridProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const CATEGORIES = [
  { id: 'Electronics', label: 'Electronics', icon: 'hardware-chip-outline', color: '#EA580C', bg: '#FFF7ED' },
  { id: 'Computers', label: 'Laptops', icon: 'laptop-outline', color: '#2563EB', bg: '#EFF6FF' },
  { id: 'Gaming & Digital Accounts', label: 'Gaming', icon: 'game-controller-outline', color: '#9333EA', bg: '#FAF5FF' },
  { id: 'Home & Appliances', label: 'Home', icon: 'home-outline', color: '#16A34A', bg: '#F0FDF4' },
  { id: 'Clothing & Accessories', label: 'Fashion', icon: 'shirt-outline', color: '#EA580C', bg: '#FFF7ED' },
  { id: 'Phones & Tablets', label: 'Phones', icon: 'phone-portrait-outline', color: '#0284C7', bg: '#F0F9FF' },
  { id: 'Vehicles & Parts', label: 'Motors', icon: 'car-sport-outline', color: '#D97706', bg: '#FFFBEB' },
  { id: 'Online Only', label: 'Digital', icon: 'cloud-download-outline', color: '#4F46E5', bg: '#EEF2FF' },
  { id: 'All', label: 'All Items', icon: 'grid-outline', color: '#475569', bg: '#F1F5F9' },
];

export const KingKongGrid: React.FC<KingKongGridProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.item}
              onPress={() => onSelectCategory(cat.id === selectedCategory ? 'All' : cat.id)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: cat.bg },
                  isSelected && styles.iconBoxActive,
                ]}
              >
                <Ionicons name={cat.icon as any} size={24} color={isSelected ? THEME.colors.primary : cat.color} />
              </View>
              <Text
                style={[styles.label, isSelected && styles.labelActive]}
                numberOfLines={1}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* View all / chevron indicator */}
        <TouchableOpacity
          style={styles.item}
          onPress={() => onSelectCategory('All')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
            <Ionicons name="chevron-forward" size={20} color={THEME.colors.textSecondary} />
          </View>
          <Text style={styles.label}>More</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.background,
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  item: {
    alignItems: 'center',
    width: 62,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  iconBoxActive: {
    borderColor: THEME.colors.primary,
    borderWidth: 1.5,
    backgroundColor: THEME.colors.primaryTint,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.colors.textDark,
    textAlign: 'center',
  },
  labelActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
});
