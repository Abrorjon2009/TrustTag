import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'primary' | 'success' | 'warning' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  const typeColor =
    type === 'success'
      ? THEME.colors.safeGreen
      : type === 'warning'
      ? '#D97706'
      : type === 'danger'
      ? THEME.colors.alertRed
      : THEME.colors.primary;

  const typeIcon =
    type === 'success'
      ? 'shield-checkmark'
      : type === 'warning'
      ? 'alert-circle'
      : type === 'danger'
      ? 'warning'
      : 'information-circle';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={[styles.iconCircle, { backgroundColor: `${typeColor}15` }]}>
            <Ionicons name={typeIcon as any} size={28} color={typeColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: typeColor }]} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    ...THEME.shadows.float,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.canvasBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    height: 42,
    borderRadius: THEME.borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

