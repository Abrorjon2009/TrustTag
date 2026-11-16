import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface ReportModalProps {
  tradeSessionId: string | null;
  visible: boolean;
  onClose: () => void;
  onReportFiled: () => void;
}

const REPORT_REASONS = [
  { code: 'CUSTOMER_WITHDREW_AFTER_DELIVERY', label: 'Customer received product and withdrew money' },
  { code: 'CUSTOMER_REFUSES_CONFIRMATION', label: 'Customer received item but refuses to press "Product Received"' },
  { code: 'SELLER_DISAPPEARED_AFTER_DEPOSIT', label: 'Seller disappeared or blocked me after deposit' },
  { code: 'FAKE_OR_DAMAGED_PRODUCT', label: 'Product is fake, broken, or does not match description' },
  { code: 'PRESSURE_PAY_OUTSIDE_APP', label: 'Seller is pressuring to pay outside Central Safe Account' },
  { code: 'HARASSMENT_OR_SCAM', label: 'Harassment / Scam attempt' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  tradeSessionId,
  visible,
  onClose,
  onReportFiled,
}) => {
  const { currentUser } = useAuth();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0].code);
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReport = async () => {
    if (!tradeSessionId || !currentUser) return;
    if (!description.trim()) {
      alert('Please explain what happened in the description.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.fileDispute({
        tradeSessionId,
        reporterId: currentUser.id,
        reasonCode: selectedReason,
        description: description.trim(),
        evidenceUrls: evidenceUrl ? [evidenceUrl] : [],
      });

      alert('Report filed successfully!\n\nThe trade is now under investigation, funds are frozen, and Admins will review the case.');
      onReportFiled();
      onClose();
    } catch (err: any) {
      alert(`Failed to file report: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🚨 File a Report</Text>
              <Text style={styles.subtitle}>Our Admins will freeze funds and investigate evidence</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={THEME.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Reason Selection */}
            <Text style={styles.sectionLabel}>Select Reason *</Text>
            {REPORT_REASONS.map((r) => {
              const isSelected = selectedReason === r.code;
              return (
                <TouchableOpacity
                  key={r.code}
                  style={[styles.reasonOption, isSelected && styles.reasonOptionActive]}
                  onPress={() => setSelectedReason(r.code)}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={isSelected ? THEME.colors.alertRed : THEME.colors.textMuted}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.reasonText, isSelected && styles.reasonTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Description */}
            <Text style={styles.sectionLabel}>Detailed Explanation *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Explain clearly what happened, dates/times, and any agreements made in chat or call..."
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />

            {/* Evidence attachment */}
            <Text style={styles.sectionLabel}>Evidence Photo / Receipt URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://... (photo of handover, parcel receipt, or chat screenshot)"
              value={evidenceUrl}
              onChangeText={setEvidenceUrl}
            />

            <View style={styles.warningBox}>
              <Ionicons name="alert-circle-outline" size={18} color={THEME.colors.alertRed} />
              <Text style={styles.warningText}>
                Filing a report will immediately freeze all money in the Central Safe Account or the user's
                balance. Accounts cannot be deleted while under review.
              </Text>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSubmitReport}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Report to Admins</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    maxHeight: '85%',
    padding: 18,
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
    color: THEME.colors.alertRed,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginTop: 10,
    marginBottom: 6,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.canvasBg,
    marginBottom: 6,
  },
  reasonOptionActive: {
    backgroundColor: THEME.colors.alertRedLight,
    borderWidth: 1,
    borderColor: THEME.colors.alertRed,
  },
  reasonText: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    flex: 1,
  },
  reasonTextActive: {
    color: THEME.colors.alertRed,
    fontWeight: '700',
  },
  textArea: {
    borderWidth: 1,
    borderColor: THEME.colors.borderMedium,
    borderRadius: THEME.borderRadius.sm,
    padding: 10,
    fontSize: 13,
    height: 80,
    textAlignVertical: 'top',
    backgroundColor: '#FFF',
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.borderMedium,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#FFF',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.alertRedLight,
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    marginTop: 14,
    gap: 8,
    alignItems: 'center',
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.alertRed,
    lineHeight: 15,
  },
  submitBtn: {
    backgroundColor: THEME.colors.alertRed,
    height: 46,
    borderRadius: THEME.borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

