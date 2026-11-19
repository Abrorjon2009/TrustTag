import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { api } from '../api/client';

interface HeaderProps {
  onOpenLocationPicker: () => void;
  onOpenWallet?: () => void;
  onOpenAdmin: () => void;
  onOpenNotifications: () => void;
  onOpenChats?: () => void;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenLocationPicker,
  onOpenWallet,
  onOpenAdmin,
  onOpenNotifications,
  onOpenChats,
  onOpenAuth,
}) => {
  const { currentUser, users, switchUser, logout } = useAuth();
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

  const shortLocation = displayLocationName
    ? displayLocationName.split('•')[0].trim().replace(/ City| Viloyati| Viloyat/g, '')
    : 'Tashkent';

  return (
    <View style={styles.container}>
      {/* Top Row: Brand & Action Controls */}
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandTitle}>SafeTrade</Text>
            <Text style={styles.brandSubtitle}>Central Asia's Marketplace</Text>
          </View>
        </View>

        {/* Right Action Icons: Location Pill, Notification Bell, Wallet, User Account */}
        <View style={styles.actionsRight}>
          {/* Location Selector Pill */}
          <TouchableOpacity style={styles.locationPill} onPress={onOpenLocationPicker}>
            <Ionicons name="location" size={13} color={THEME.colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {shortLocation}
            </Text>
            <Ionicons name="chevron-down" size={11} color={THEME.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={onOpenNotifications}>
            <Ionicons name="notifications-outline" size={20} color={THEME.colors.textDark} />
            {unreadCount > 0 && <View style={styles.bellBadge} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={onOpenWallet}>
            <Ionicons name="wallet-outline" size={20} color={THEME.colors.textDark} />
          </TouchableOpacity>

          {currentUser?.isAdmin && (
            <TouchableOpacity style={styles.adminBadge} onPress={onOpenAdmin}>
              <Ionicons name="shield-outline" size={11} color="#FFF" />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </TouchableOpacity>
          )}

          {/* User Account / Login Button */}
          {currentUser ? (
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => setUserDropdownVisible(true)}
              activeOpacity={0.8}
            >
              {currentUser.avatarUrl ? (
                <Image source={{ uri: currentUser.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{currentUser.fullName?.charAt(0) || 'U'}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginPill}
              onPress={onOpenAuth}
              activeOpacity={0.8}
            >
              <Text style={styles.loginPillText}>Kirish</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* User Switcher / Auth Modal Drawer */}
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
            <View style={styles.dropdownHeaderRow}>
              <Text style={styles.dropdownTitle}>Profil & Akkauntlar</Text>
              <TouchableOpacity onPress={() => setUserDropdownVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Current Active Account Preview */}
            {currentUser && (
              <View style={styles.currentUserPreview}>
                <Image
                  source={{
                    uri: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
                  }}
                  style={styles.previewAvatar}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.previewName}>{currentUser.fullName}</Text>
                  <Text style={styles.previewProvider}>
                    {currentUser.authProvider
                      ? `Kirilgan: ${currentUser.authProvider}`
                      : currentUser.phoneNumber || 'Faol akkaunt'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.logoutMiniBtn}
                  onPress={() => {
                    logout();
                    setUserDropdownVisible(false);
                  }}
                >
                  <Ionicons name="log-out-outline" size={15} color={THEME.colors.alertRed} />
                  <Text style={styles.logoutMiniText}>Chiqish</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Big Action: Open Auth Modal (Google, Telegram, Email, Phone) */}
            <TouchableOpacity
              style={styles.newAccountBtn}
              onPress={() => {
                setUserDropdownVisible(false);
                onOpenAuth?.();
              }}
            >
              <View style={styles.newAccountIconCircle}>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.newAccountBtnText}>Yangi Akkaunt / Kirish</Text>
                <Text style={styles.newAccountBtnSub}>Google, Telegram, Email yoki SMS</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.dropdownSubtitle}>
              Yoki mavjud sinov rollariga o'ting:
            </Text>
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 220 }}
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
                          ? `⭐ Sotuvchi (${item.successfulSalesCount} savdo)`
                          : `🛒 Xaridor (${item.successfulBuysCount} xarid)`}
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.textDark,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME.colors.textSecondary,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.pill,
    gap: 3,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textDark,
    maxWidth: 75,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.alertRed,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.alertRed,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
    gap: 3,
  },
  adminBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  avatarButton: {
    padding: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: THEME.colors.borderSubtle,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
  userSwitcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.canvasBg,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.pill,
    gap: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    maxWidth: 55,
  },
  loginPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  loginPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dropdownContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...THEME.shadows.float,
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dropdownTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  currentUserPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  previewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  previewName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  previewProvider: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  logoutMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    gap: 4,
  },
  logoutMiniText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.alertRed,
  },
  newAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  newAccountIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  newAccountBtnSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  dropdownSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 6,
    backgroundColor: THEME.colors.canvasBg,
  },
  userOptionSelected: {
    backgroundColor: THEME.colors.primaryTint,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
  },
  optionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  optionRole: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
});
