import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { Dispute } from '../types';
import { api } from '../api/client';

interface AdminDisputeModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AdminDisputeModal: React.FC<AdminDisputeModalProps> = ({ visible, onClose }) => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);

  const loadDisputes = async () => {
    try {
      const data = await api.getDisputes();
      setDisputes(data);
      if (data.length > 0 && !selectedDispute) {
        setSelectedDispute(data[0]);
      }
    } catch (err) {
      console.error('Failed to load disputes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadDisputes();
    }
  }, [visible]);

  const executeResolve = async (action: 'PAY_SELLER' | 'REFUND_BUYER' | 'BAN_ACCUSED') => {
    if (!selectedDispute) return;
    setIsResolving(true);
    try {
      await api.resolveDispute(selectedDispute.id, {
        action,
        adminNotes: `Moderator reviewed evidence and resolved via ${action}`,
        resolvedBy: 'Platform Admin',
      });
      Alert.alert('Success', `Case successfully resolved with action: ${action}`);
      loadDisputes();
    } catch (err: any) {
      Alert.alert('Resolution Failed', err.message || 'Error resolving dispute');
    } finally {
      setIsResolving(false);
    }
  };

  const handleResolve = (action: 'PAY_SELLER' | 'REFUND_BUYER' | 'BAN_ACCUSED') => {
    if (!selectedDispute) return;
    Alert.alert(
      'Moderator Decision',
      `Execute Moderator Decision: ${action.replace(/_/g, ' ')}?\n\nThis will disburse funds and record an official administrative ruling.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Execute', style: 'destructive', onPress: () => executeResolve(action) },
      ]
    );
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
          <Text style={styles.headerTitle}>Admin Dispute & Investigation Console</Text>
          <TouchableOpacity onPress={loadDisputes} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color={THEME.colors.primary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color={THEME.colors.alertRed} />
          </View>
        ) : disputes.length === 0 ? (
          <View style={styles.emptyCenter}>
            <Ionicons name="checkmark-circle-outline" size={48} color={THEME.colors.safeGreen} />
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptyDesc}>No open dispute reports require investigation.</Text>
          </View>
        ) : (
          <View style={styles.consoleBody}>
            {/* Left Queue / List */}
            <View style={styles.queueColumn}>
              <Text style={styles.columnTitle}>Dispute Queue ({disputes.length})</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {disputes.map((d) => {
                  const isSelected = selectedDispute?.id === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.queueItem, isSelected && styles.queueItemActive]}
                      onPress={() => setSelectedDispute(d)}
                    >
                      <View style={styles.queueItemTop}>
                        <Text style={styles.queueItemCode} numberOfLines={1}>
                          {d.reasonCode.replace(/_/g, ' ')}
                        </Text>
                        <Text
                          style={[
                            styles.queueStatus,
                            d.status === 'OPEN_PENDING'
                              ? styles.statusPending
                              : styles.statusResolved,
                          ]}
                        >
                          {d.status.replace(/_/g, ' ')}
                        </Text>
                      </View>
                      <Text style={styles.queueItemProduct} numberOfLines={1}>
                        Product: {d.tradeSession.product.title}
                      </Text>
                      <Text style={styles.queueItemAmount}>
                        Hold: ${d.tradeSession.agreedPrice.toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Right Case Detail & Adjudication View */}
            {selectedDispute && (
              <ScrollView style={styles.caseDetail} showsVerticalScrollIndicator={false}>
                {/* Case Heading */}
                <View style={styles.caseCard}>
                  <Text style={styles.caseId}>CASE #{selectedDispute.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={styles.caseReason}>
                    {selectedDispute.reasonCode.replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.caseDate}>
                    Reported on {new Date(selectedDispute.createdAt).toLocaleString()}
                  </Text>
                </View>

                {/* Parties Involved */}
                <View style={styles.caseCard}>
                  <Text style={styles.cardHeader}>Parties Involved</Text>
                  <View style={styles.partiesRow}>
                    <View style={styles.partyBox}>
                      <Text style={styles.partyRole}>Reporter</Text>
                      <Text style={styles.partyName}>{selectedDispute.reporter.fullName}</Text>
                      <Text style={styles.partyPhone}>{selectedDispute.reporter.phoneNumber}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color={THEME.colors.textMuted} />
                    <View style={styles.partyBox}>
                      <Text style={[styles.partyRole, { color: THEME.colors.alertRed }]}>Accused</Text>
                      <Text style={styles.partyName}>{selectedDispute.accused.fullName}</Text>
                      <Text style={styles.partyPhone}>{selectedDispute.accused.phoneNumber}</Text>
                    </View>
                  </View>
                </View>

                {/* Statement */}
                <View style={styles.caseCard}>
                  <Text style={styles.cardHeader}>Reporter's Statement</Text>
                  <Text style={styles.statementText}>{selectedDispute.description}</Text>
                </View>

                {/* Evidence Attachments */}
                <View style={styles.caseCard}>
                  <Text style={styles.cardHeader}>Uploaded Evidence Photos</Text>
                  {selectedDispute.evidence.length === 0 ? (
                    <Text style={styles.noEvidenceText}>No photos attached.</Text>
                  ) : (
                    <View style={styles.evidenceGrid}>
                      {selectedDispute.evidence.map((ev) => (
                        <Image
                          key={ev.id}
                          source={{ uri: ev.fileUrl }}
                          style={styles.evidencePhoto}
                          resizeMode="cover"
                        />
                      ))}
                    </View>
                  )}
                </View>

                {/* Administrative Resolution Controls */}
                <View style={[styles.caseCard, styles.resolutionCard]}>
                  <Text style={styles.cardHeader}>Admin Adjudication Actions</Text>
                  <Text style={styles.resolutionSub}>
                    Select an official ruling to execute disbursement:
                  </Text>

                  <View style={styles.resolutionButtons}>
                    <TouchableOpacity
                      style={[styles.resBtn, styles.resBtnPaySeller]}
                      onPress={() => handleResolve('PAY_SELLER')}
                      disabled={isResolving}
                    >
                      <Ionicons name="cash-outline" size={16} color="#FFF" />
                      <Text style={styles.resBtnText}>Disburse Money to Seller</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.resBtn, styles.resBtnRefundBuyer]}
                      onPress={() => handleResolve('REFUND_BUYER')}
                      disabled={isResolving}
                    >
                      <Ionicons name="refresh-outline" size={16} color="#FFF" />
                      <Text style={styles.resBtnText}>Refund Money to Customer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.resBtn, styles.resBtnBan]}
                      onPress={() => handleResolve('BAN_ACCUSED')}
                      disabled={isResolving}
                    >
                      <Ionicons name="ban-outline" size={16} color="#FFF" />
                      <Text style={styles.resBtnText}>Ban Accused Account</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
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
  refreshBtn: {
    padding: 6,
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
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  consoleBody: {
    flex: 1,
    flexDirection: 'column',
  },
  queueColumn: {
    backgroundColor: '#FFFFFF',
    maxHeight: 180,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
    padding: 10,
  },
  columnTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  queueItem: {
    backgroundColor: THEME.colors.canvasBg,
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  queueItemActive: {
    borderColor: THEME.colors.alertRed,
    backgroundColor: THEME.colors.alertRedLight,
  },
  queueItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueItemCode: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    flex: 1,
  },
  queueStatus: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPending: {
    backgroundColor: '#FDE8E8',
    color: THEME.colors.alertRed,
  },
  statusResolved: {
    backgroundColor: '#DEF7EC',
    color: THEME.colors.safeGreen,
  },
  queueItemProduct: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  queueItemAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  caseDetail: {
    flex: 1,
    padding: 12,
  },
  caseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    marginBottom: 10,
    ...THEME.shadows.card,
  },
  caseId: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.alertRed,
  },
  caseReason: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  caseDate: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  partiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partyBox: {
    flex: 1,
    backgroundColor: THEME.colors.canvasBg,
    padding: 8,
    borderRadius: THEME.borderRadius.xs,
  },
  partyRole: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.safeGreen,
    textTransform: 'uppercase',
  },
  partyName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  partyPhone: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  statementText: {
    fontSize: 13,
    lineHeight: 18,
    color: THEME.colors.textSecondary,
  },
  noEvidenceText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  evidencePhoto: {
    width: 100,
    height: 100,
    borderRadius: THEME.borderRadius.sm,
  },
  resolutionCard: {
    backgroundColor: '#FFF7F7',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  resolutionSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginBottom: 10,
  },
  resolutionButtons: {
    gap: 8,
  },
  resBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: THEME.borderRadius.pill,
    gap: 6,
  },
  resBtnPaySeller: {
    backgroundColor: THEME.colors.safeGreen,
  },
  resBtnRefundBuyer: {
    backgroundColor: '#2563EB',
  },
  resBtnBan: {
    backgroundColor: THEME.colors.alertRed,
  },
  resBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

