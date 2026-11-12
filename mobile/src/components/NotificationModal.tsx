import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectNotification: (linkId?: string | null) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  onSelectNotification,
}) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    if (!currentUser) return;
    try {
      const data = await api.getNotifications(currentUser.id);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible && currentUser) {
      loadNotifications();
    }
  }, [visible, currentUser]);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    await api.markNotificationsRead(currentUser.id);
    loadNotifications();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="arrow-back" size={24} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications ({unreadCount} new)</Text>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadBtn}>
              <Text style={styles.markReadText}>Mark read</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {isLoading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyCenter}>
            <Ionicons name="notifications-off-outline" size={48} color={THEME.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySub}>
              You'll be alerted here whenever money is held, released, or withdrawn in your trades!
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {notifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemCard, !item.isRead && styles.itemCardUnread]}
                onPress={() => {
                  onSelectNotification(item.linkId);
                  onClose();
                }}
              >
                <View style={styles.iconBox}>
                  <Ionicons
                    name={
                      item.type === 'TRADE_DEPOSIT'
                        ? 'shield-checkmark'
                        : item.type === 'TRADE_RECEIVED'
                        ? 'checkmark-circle'
                        : item.type === 'TRADE_WITHDRAWN'
                        ? 'warning'
                        : item.type === 'REPORT_FILED'
                        ? 'alert-circle'
                        : 'chatbubble-ellipses'
                    }
                    size={22}
                    color={
                      item.type === 'TRADE_WITHDRAWN' || item.type === 'REPORT_FILED'
                        ? THEME.colors.alertRed
                        : item.type === 'TRADE_DEPOSIT' || item.type === 'TRADE_RECEIVED'
                        ? THEME.colors.safeGreen
                        : THEME.colors.primary
                    }
                  />
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemMessage}>{item.message}</Text>
                  <Text style={styles.itemTime}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  markReadBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  body: {
    flex: 1,
    padding: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 8,
    ...THEME.shadows.card,
  },
  itemCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primary,
    backgroundColor: '#FFFBF9',
  },
  iconBox: {
    marginRight: 12,
    marginTop: 2,
  },
  infoCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  itemMessage: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  itemTime: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
    marginLeft: 8,
    marginTop: 6,
  },
});

