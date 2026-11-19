import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { LedgerEntry, Wallet } from '../types';
import { formatPrice } from '../utils/formatters';
import { PaymentModal } from './PaymentModal';

interface WalletModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ visible, onClose }) => {
  const { currentUser } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [buyerLocked, setBuyerLocked] = useState(0);
  const [sellerIncoming, setSellerIncoming] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Top-up & Withdraw modal state
  const [topupAmount, setTopupAmount] = useState('100000');
  const [withdrawAmount, setWithdrawAmount] = useState('50000');
  const [bankCard, setBankCard] = useState('8600 4589 1204 7782');
  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadWallet = async () => {
    if (!currentUser) return;
    try {
      const data = await api.getWallet(currentUser.id);
      setWallet(data.wallet);
      setTransactions(data.transactions || []);
      setBuyerLocked(data.buyerLockedTotal || 0);
      setSellerIncoming(data.sellerIncomingTotal || 0);
    } catch (err) {
      console.error('Failed to load wallet:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible && currentUser) {
      loadWallet();
    }
  }, [visible, currentUser]);

  const handleWithdrawBank = async () => {
    if (!currentUser || !withdrawAmount) return;
    setIsProcessing(true);
    try {
      await api.withdrawBank(currentUser.id, parseFloat(withdrawAmount), bankCard);
      Alert.alert('Muvaffaqiyatli', `${formatPrice(parseFloat(withdrawAmount))} bank kartangizga (${bankCard}) muvaffaqiyatli o'tkazildi!`);
      setShowWithdrawDialog(false);
      loadWallet();
    } catch (err: any) {
      Alert.alert('Chiqarishda xatolik', err.message || 'Xatolik yuz berdi');
    } finally {
      setIsProcessing(false);
    }
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
          <Text style={styles.headerTitle}>Central Account & Wallet</Text>
          <View style={{ width: 32 }} />
        </View>

        {isLoading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
          </View>
        ) : (
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Main Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceTopRow}>
                <View>
                  <Text style={styles.balanceLabel}>Available Balance</Text>
                  <Text style={styles.balanceAmount}>
                    {formatPrice(wallet?.availableBalance || 0)}
                  </Text>
                </View>
                <View style={styles.vaultShield}>
                  <Image
                    source={require('../../assets/logo-mark.png')}
                    style={{ width: 28, height: 34 }}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <Text style={styles.balanceSubtitle}>
                TrustTag Central Bank Safe-Hold kafolatlangan tizimi
              </Text>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.topupBtn]}
                  onPress={() => setShowTopupDialog(true)}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.btnText}>Add Money</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.withdrawBankBtn]}
                  onPress={() => setShowWithdrawDialog(true)}
                >
                  <Ionicons name="card-outline" size={18} color={THEME.colors.textPrimary} />
                  <Text style={[styles.btnText, { color: THEME.colors.textPrimary }]}>
                    Withdraw to Bank
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Hold & Frozen Details Matrix */}
            <View style={styles.matrixRow}>
              {/* Money in Safe Hold */}
              <View style={styles.matrixCard}>
                <View style={styles.matrixIconRow}>
                  <Ionicons name="lock-closed" size={18} color={THEME.colors.safeGreen} />
                  <Text style={styles.matrixTag}>Safe Hold</Text>
                </View>
                <Text style={styles.matrixAmount}>
                  {formatPrice(buyerLocked + sellerIncoming)}
                </Text>
                <Text style={styles.matrixNote}>
                  {buyerLocked > 0 ? `🛒 ${formatPrice(buyerLocked)} in trades you are buying` : 'Active trades'}
                </Text>
              </View>

              {/* Frozen Balance */}
              <View style={styles.matrixCard}>
                <View style={styles.matrixIconRow}>
                  <Ionicons name="alert-circle" size={18} color={THEME.colors.alertRed} />
                  <Text style={[styles.matrixTag, { color: THEME.colors.alertRed }]}>Frozen</Text>
                </View>
                <Text style={[styles.matrixAmount, { color: THEME.colors.alertRed }]}>
                  {formatPrice(wallet?.frozenBalance || 0)}
                </Text>
                <Text style={styles.matrixNote}>Locked during Admin reports</Text>
              </View>
            </View>

            {/* Full Transaction Ledger Log */}
            <View style={styles.ledgerSection}>
              <Text style={styles.ledgerHeading}>Transaction Ledger History</Text>
              {transactions.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="receipt-outline" size={32} color={THEME.colors.textMuted} />
                  <Text style={styles.emptyText}>No transaction records yet.</Text>
                </View>
              ) : (
                transactions.map((tx) => (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={styles.txIconBox}>
                      <Ionicons
                        name={
                          tx.txType === 'DEPOSIT_TOPUP'
                            ? 'arrow-down-circle'
                            : tx.txType === 'ESCROW_LOCK'
                            ? 'lock-closed'
                            : tx.txType === 'ESCROW_RELEASE_PAYOUT'
                            ? 'checkmark-circle'
                            : tx.txType === 'ESCROW_REFUND_WITHDRAWAL'
                            ? 'refresh-circle'
                            : 'cash'
                        }
                        size={22}
                        color={tx.isCredit ? THEME.colors.safeGreen : THEME.colors.primary}
                      />
                    </View>
                    <View style={styles.txDetails}>
                      <Text style={styles.txTitle}>
                        {tx.txType.replace(/_/g, ' ')}
                      </Text>
                      <Text style={styles.txNotes}>{tx.notes || 'Safe Trade operation'}</Text>
                      <Text style={styles.txTime}>
                        {new Date(tx.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        tx.isCredit ? styles.txAmountPlus : styles.txAmountMinus,
                      ]}
                    >
                      {tx.isCredit ? `+${formatPrice(tx.amount)}` : `-${formatPrice(tx.amount)}`}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        )}

        {/* Topup Amount & Payment Sheet Modal */}
        <Modal visible={showTopupDialog} transparent animationType="fade">
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogBox}>
              <Text style={styles.dialogTitle}>Hamyonni To'ldirish</Text>
              <Text style={styles.dialogDesc}>
                Uzcard, Humo, Payme yoki Click orqali hisobingizni to'ldiring:
              </Text>
              <TextInput
                style={styles.dialogInput}
                keyboardType="numeric"
                value={topupAmount}
                onChangeText={setTopupAmount}
                placeholder="Summa (masalan: 100 000)"
              />
              <View style={styles.dialogBtns}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setShowTopupDialog(false)}
                >
                  <Text style={styles.dialogCancelText}>Bekor qilish</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dialogActionBtn}
                  onPress={() => {
                    setShowTopupDialog(false);
                    setShowPaymentModal(true);
                  }}
                >
                  <Text style={styles.dialogActionText}>To'lov Usulini Tanlash</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Real Uzbekistan Payment Sheet */}
        <PaymentModal
          visible={showPaymentModal}
          amount={parseFloat(topupAmount) || 100000}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={() => {
            loadWallet();
          }}
        />

        {/* Withdraw to Bank Dialog */}
        <Modal visible={showWithdrawDialog} transparent animationType="fade">
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogBox}>
              <Text style={styles.dialogTitle}>Kartaga Pul Chiqarish</Text>
              <Text style={styles.dialogDesc}>
                Mablag'ingizni to'g'ridan-to'g'ri Uzcard yoki Humo kartangizga o'tkazing:
              </Text>
              <TextInput
                style={styles.dialogInput}
                keyboardType="numeric"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholder="Summa (so'mda)"
              />
              <TextInput
                style={[styles.dialogInput, { marginTop: 8 }]}
                value={bankCard}
                onChangeText={setBankCard}
                placeholder="Karta raqami (8600... yoki 9860...)"
              />
              <View style={styles.dialogBtns}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setShowWithdrawDialog(false)}
                >
                  <Text style={styles.dialogCancelText}>Bekor qilish</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dialogActionBtn}
                  onPress={handleWithdrawBank}
                  disabled={isProcessing}
                >
                  <Text style={styles.dialogActionText}>Kartaga Yuborish</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    padding: 14,
  },
  balanceCard: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    ...THEME.shadows.float,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 4,
  },
  vaultShield: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  btn: {
    flex: 1,
    height: 42,
    borderRadius: THEME.borderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  topupBtn: {
    backgroundColor: '#FFFFFF',
    opacity: 0.95,
  },
  withdrawBankBtn: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  btnText: {
    color: THEME.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  matrixRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  matrixCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    ...THEME.shadows.card,
  },
  matrixIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matrixTag: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.safeGreen,
  },
  matrixAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 6,
  },
  matrixNote: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  ledgerSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.md,
    padding: 16,
    marginTop: 14,
    ...THEME.shadows.card,
  },
  ledgerHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 12,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  txIconBox: {
    marginRight: 10,
  },
  txDetails: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  txNotes: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  txTime: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txAmountPlus: {
    color: THEME.colors.safeGreen,
  },
  txAmountMinus: {
    color: THEME.colors.textPrimary,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    ...THEME.shadows.float,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  dialogDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 14,
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: THEME.colors.borderMedium,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
  },
  dialogBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  dialogCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.canvasBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogCancelText: {
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },
  dialogActionBtn: {
    flex: 1,
    height: 42,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogActionText: {
    color: '#FFF',
    fontWeight: '700',
  },
});

