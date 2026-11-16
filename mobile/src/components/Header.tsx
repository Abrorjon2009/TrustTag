import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { api } from '../api/client';

interface HeaderProps {
  onOpenLocationPicker: () => void;
  onOpenWallet: () => void;
  onOpenAdmin: () => void;
  onOpenNotifications: () => void;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenLocationPicker,
  onOpenWallet,
  onOpenAdmin,
  onOpenNotifications,
  onOpenAuth,
}) => {
  const { currentUser, users, switchUser } = useAuth();
  const { displayLocationName } = useLocation();
  const [userDropdownVisible, setUserDropdownVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (currentUser) {
      api.getNotifications(currentUser.id)
        .then((res) => setUnreadCount(res.unreadCount || 0))
        .catch(() => {});
    }
  }, [currentUser]);

  return (
    <View style={styles.container}>
      {/* Top Row: Brand & User Switcher & Location */}
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandTitle}>SafeTrade</Text>
            <Text style={styles.brandSubtitle}>Central Safe-Hold</Text>
          </View>
        </View>

        {/* Location Selector Pill */}
        <TouchableOpacity style={styles.locationPill} onPress={onOpenLocationPicker}>
          <Ionicons name="location" size={14} color={THEME.colors.primary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {displayLocationName}
          </Text>
          <Ionicons name="chevron-down" size={12} color={THEME.colors.textSecondary} />
        </TouchableOpacity>

        {/* Right Action Icons: Wallet, Notifications & User Switcher */}
        <View style={styles.actionsRight}>
          <TouchableOpacity style={styles.iconButton} onPress={onOpenNotifications}>
            <Ionicons name="notifications-outline" size={20} color={THEME.colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={onOpenWallet}>
            <Ionicons name="wallet-outline" size={20} color={THEME.colors.textPrimary} />
          </TouchableOpacity>

          {currentUser?.isAdmin && (
            <TouchableOpacity style={styles.adminBadge} onPress={onOpenAdmin}>
              <Ionicons name="shield-outline" size={14} color="#FFF" />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </TouchableOpacity>
          )}

          {/* User Switcher Pill */}
          <TouchableOpacity
            style={styles.userSwitcherPill}
            onPress={() => setUserDropdownVisible(true)}
          >
            {currentUser?.avatarUrl ? (
              <Image source={{ uri: currentUser.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{currentUser?.fullName?.charAt(0) || 'U'}</Text>
              </View>
            )}
            <Text style={styles.userName} numberOfLines={1}>
              {currentUser?.fullName?.split(' ')[0] || 'User'}
            </Text>
            <Ionicons name="swap-vertical" size={12} color={THEME.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* User Switcher Modal */}
      <Modal
        visible={userDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUserDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setUserDropdownVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Switch Active Role / User</Text>
            <TouchableOpacity
              style={styles.smsAuthBtn}
              onPress={() => {
                setUserDropdownVisible(false);
                onOpenAuth?.();
              }}
            >
              <Ionicons name="phone-portrait" size={18} color="#FFFFFF" />
              <Text style={styles.smsAuthBtnText}>Telefon Raqam orqali Kirish (SMS OTP)</Text>
            </TouchableOpacity>

            <Text style={styles.dropdownSubtitle}>
              Yoki sinov rollari orasida almashing:
            </Text>
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = item.id === currentUser?.id;
                return (
                  <TouchableOpacity
                    style={[styles.userOption, isSelected && styles.userOptionSelected]}
                    onPress={() => {
                      switchUser(item.id);
                      setUserDropdownVisible(false);
                    }}
                  >
                    <Image
                      source={{
                        uri:
                          item.avatarUrl ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
                      }}
                      style={styles.optionAvatar}
                    />
                    <View style={styles.optionInfo}>
                      <Text style={styles.optionName}>{item.fullName}</Text>
                      <Text style={styles.optionRole}>
                        {item.isAdmin
                          ? '🛡️ Platform Admin'
                          : item.successfulSalesCount > 5
                          ? `⭐ Verified Seller (${item.successfulSalesCount} Sales)`
                          : `🛒 Customer (${item.successfulBuysCount} Buys)`}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={THEME.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryTint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.pill,
    maxWidth: 150,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.primary,
    marginHorizontal: 4,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.canvasBg,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: THEME.colors.alertRed,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  bellBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.alertRed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.pill,
    gap: 3,
  },
  adminBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  userSwitcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.canvasBg,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.pill,
    gap: 5,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    maxWidth: 55,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    ...THEME.shadows.float,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  smsAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  smsAuthBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 16,
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 8,
    backgroundColor: THEME.colors.canvasBg,
  },
  userOptionSelected: {
    backgroundColor: THEME.colors.primaryTint,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
  },
  optionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  optionRole: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
});

