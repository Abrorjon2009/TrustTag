import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { useLocation } from '../context/LocationContext';
import { GeoRegion, GeoDistrict, GeoCity } from '../types';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({ visible, onClose }) => {
  const { regions, selectedRegion, selectedDistrict, selectedCity, setLocation, clearLocation } = useLocation();

  const [activeRegion, setActiveRegion] = useState<GeoRegion | null>(selectedRegion || (regions[0] || null));
  const [activeDistrict, setActiveDistrict] = useState<GeoDistrict | null>(selectedDistrict || null);

  const handleSelectEverywhere = () => {
    clearLocation();
    onClose();
  };

  const handleSelectEntireRegion = (region: GeoRegion) => {
    setLocation(region, null, null);
    onClose();
  };

  const handleSelectEntireDistrict = (region: GeoRegion, district: GeoDistrict) => {
    setLocation(region, district, null);
    onClose();
  };

  const handleSelectCity = (region: GeoRegion, district: GeoDistrict, city: GeoCity) => {
    setLocation(region, district, city);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>📍 Filter by Your Location</Text>
              <Text style={styles.subtitle}>
                Show products available in your city or with seller delivery to your area:
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={THEME.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Quick Clear Shortcut */}
          <TouchableOpacity style={styles.allLocationsBanner} onPress={handleSelectEverywhere}>
            <Ionicons name="globe-outline" size={18} color={THEME.colors.primary} />
            <Text style={styles.allLocationsText}>Show All Locations (Nationwide + Online)</Text>
            <Ionicons name="chevron-forward" size={16} color={THEME.colors.primary} />
          </TouchableOpacity>

          {/* Hierarchy 3-Column / Stepper View */}
          <View style={styles.pickerBody}>
            {/* 1. Regions Column */}
            <View style={styles.column}>
              <Text style={styles.colHeader}>1. Region</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {regions.map((reg) => {
                  const isRegActive = activeRegion?.id === reg.id;
                  return (
                    <TouchableOpacity
                      key={reg.id}
                      style={[styles.itemPill, isRegActive && styles.itemPillActive]}
                      onPress={() => {
                        setActiveRegion(reg);
                        setActiveDistrict(reg.districts?.[0] || null);
                      }}
                    >
                      <Text style={[styles.itemText, isRegActive && styles.itemTextActive]}>
                        {reg.name}
                      </Text>
                      {isRegActive && <Ionicons name="chevron-forward" size={14} color={THEME.colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 2. Districts Column */}
            <View style={styles.column}>
              <Text style={styles.colHeader}>2. District</Text>
              {activeRegion && (
                <TouchableOpacity
                  style={styles.shortcutBtn}
                  onPress={() => handleSelectEntireRegion(activeRegion)}
                >
                  <Ionicons name="checkmark-done" size={14} color="#FFF" />
                  <Text style={styles.shortcutBtnText}>Entire Region</Text>
                </TouchableOpacity>
              )}
              <ScrollView showsVerticalScrollIndicator={false}>
                {activeRegion?.districts?.map((dist) => {
                  const isDistActive = activeDistrict?.id === dist.id;
                  return (
                    <TouchableOpacity
                      key={dist.id}
                      style={[styles.itemPill, isDistActive && styles.itemPillActive]}
                      onPress={() => setActiveDistrict(dist)}
                    >
                      <Text style={[styles.itemText, isDistActive && styles.itemTextActive]} numberOfLines={1}>
                        {dist.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 3. Cities Column */}
            <View style={styles.column}>
              <Text style={styles.colHeader}>3. City / Area</Text>
              {activeRegion && activeDistrict && (
                <TouchableOpacity
                  style={styles.shortcutBtn}
                  onPress={() => handleSelectEntireDistrict(activeRegion, activeDistrict)}
                >
                  <Ionicons name="checkmark-done" size={14} color="#FFF" />
                  <Text style={styles.shortcutBtnText}>Entire District</Text>
                </TouchableOpacity>
              )}
              <ScrollView showsVerticalScrollIndicator={false}>
                {activeDistrict?.cities?.map((city) => {
                  const isSelected = selectedCity?.id === city.id;
                  return (
                    <TouchableOpacity
                      key={city.id}
                      style={[styles.itemPill, isSelected && styles.itemPillActive]}
                      onPress={() => handleSelectCity(activeRegion!, activeDistrict!, city)}
                    >
                      <Text style={[styles.itemText, isSelected && styles.itemTextActive]} numberOfLines={1}>
                        {city.name}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={14} color={THEME.colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    height: '75%',
    padding: 16,
    ...THEME.shadows.float,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  allLocationsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.primaryTint,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 14,
  },
  allLocationsText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  pickerBody: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    borderRadius: THEME.borderRadius.md,
    overflow: 'hidden',
  },
  column: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: THEME.colors.borderSubtle,
    padding: 8,
    backgroundColor: '#FAFAFA',
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.safeGreen,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.xs,
    marginBottom: 8,
    gap: 4,
  },
  shortcutBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  itemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: THEME.borderRadius.xs,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  itemPillActive: {
    backgroundColor: THEME.colors.primaryTint,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
  },
  itemText: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
  },
  itemTextActive: {
    fontWeight: '700',
    color: THEME.colors.primary,
  },
});

