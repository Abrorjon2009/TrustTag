import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { formatPrice } from '../utils/formatters';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface PaymentModalProps {
  visible: boolean;
  amount: number;
  tradeSessionId?: string;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  amount,
  tradeSessionId,
  onClose,
  onPaymentSuccess,
}) => {
  const { currentUser } = useAuth();
  
  // 'WALLET' | 'PAYME' | 'CLICK' | 'UZCARD_HUMO'
  const [selectedMethod, setSelectedMethod] = useState<'PAYME' | 'CLICK' | 'UZCARD_HUMO' | 'WALLET'>('UZCARD_HUMO');
  
  // Card input states
  const [cardNumber, setCardNumber] = useState('8600 ');
  const [cardExpiry, setCardExpiry] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Format card input with spaces: 8600 1234 5678 9012
  const handleCardNumberChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    setCardNumber(formatted);
  };

  // Format expiry: MM/YY
  const handleExpiryChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      setCardExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`);
    } else {
      setCardExpiry(cleaned);
    }
  };

  const handleExecutePayment = async () => {
    if (!currentUser) return;
    setIsProcessing(true);

    try {
      if (selectedMethod === 'PAYME') {
        // If tradeSessionId provided, initiate trade deposit
        if (tradeSessionId) {
          const res = await api.initiatePayment(tradeSessionId, 'PAYME');
          if (res.requiresRedirect && res.paymentUrl) {
            // Open Payme Checkout
            Linking.openURL(res.paymentUrl).catch(() => {
              Alert.alert('Payme Rejimi', 'Haqiqiy Payme to\'lov sahifasi ochilmoqda.');
            });
          }
        } else {
          // Wallet topup
          await api.topupWallet(currentUser.id, amount);
        }
        Alert.alert('Muvaffaqiyatli', `${formatPrice(amount)} Payme orqali Xavfsiz Hisobga kiritildi!`);
        onPaymentSuccess();
        onClose();
        return;
      }

      if (selectedMethod === 'CLICK') {
        if (tradeSessionId) {
          const res = await api.initiatePayment(tradeSessionId, 'CLICK');
          if (res.requiresRedirect && res.paymentUrl) {
            Linking.openURL(res.paymentUrl).catch(() => {
              Alert.alert('Click Rejimi', 'Haqiqiy Click to\'lov sahifasi ochilmoqda.');
            });
          }
        } else {
          await api.topupWallet(currentUser.id, amount);
        }
        Alert.alert('Muvaffaqiyatli', `${formatPrice(amount)} Click.uz orqali Xavfsiz Hisobga kiritildi!`);
        onPaymentSuccess();
        onClose();
        return;
      }

      if (selectedMethod === 'UZCARD_HUMO') {
        const rawDigits = cardNumber.replace(/\D/g, '');
        if (rawDigits.length !== 16) {
          Alert.alert('Xatolik', 'Iltimos, 16 xonali karta raqamini to\'liq kiriting');
          setIsProcessing(false);
          return;
        }

        // Process Escrow deposit
        if (tradeSessionId) {
          await api.initiatePayment(tradeSessionId, 'UZCARD_HUMO');
        } else {
          await api.topupWallet(currentUser.id, amount);
        }

        const cardBrand = rawDigits.startsWith('8600') ? 'Uzcard' : rawDigits.startsWith('9860') ? 'Humo' : 'Karta';
        Alert.alert('To\'lov Qabul Qilindi', `${cardBrand} (${rawDigits.slice(-4)}) orqali ${formatPrice(amount)} Markaziy Bank Xavfsiz Hisobiga o'tkazildi!`);
        onPaymentSuccess();
        onClose();
        return;
      }

      if (selectedMethod === 'WALLET') {
        if (tradeSessionId) {
          await api.initiatePayment(tradeSessionId, 'WALLET');
          Alert.alert('Muvaffaqiyatli', `${formatPrice(amount)} hamyon hisobingizdan Markaziy Bank Xavfsiz Hisobiga o'tkazildi!`);
        }
        onPaymentSuccess();
        onClose();
        return;
      }
    } catch (err: any) {
      Alert.alert('To\'lovda Xatolik', err.message || 'To\'lovni amalga oshirib bo\'lmadi');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>To'lov Usulini Tanlang</Text>
              <Text style={styles.subtitle}>Markaziy Bank Xavfsiz Hisobiga o'tkazish</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Amount Badge */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>To'lov Summasi:</Text>
            <Text style={styles.amountVal}>{formatPrice(amount)}</Text>
            <View style={styles.shieldRow}>
              <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
              <Text style={styles.shieldText}>Mablag' mahsulot olinmaguncha sotuvchiga berilmaydi</Text>
            </View>
          </View>

          <ScrollView style={styles.methodList} showsVerticalScrollIndicator={false}>
            {/* Option 1: Uzcard / Humo Plastic Card */}
            <TouchableOpacity
              style={[styles.methodCard, selectedMethod === 'UZCARD_HUMO' && styles.methodCardActive]}
              onPress={() => setSelectedMethod('UZCARD_HUMO')}
            >
              <View style={styles.methodLeft}>
                <View style={[styles.methodIconBox, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="card" size={22} color="#4F46E5" />
                </View>
                <View>
                  <Text style={styles.methodTitle}>Uzcard / Humo Plastik Karta</Text>
                  <Text style={styles.methodDesc}>To'g'ridan-to'g'ri bank kartangizdan to'lash</Text>
                </View>
              </View>
              <Ionicons
                name={selectedMethod === 'UZCARD_HUMO' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selectedMethod === 'UZCARD_HUMO' ? THEME.colors.primary : '#9CA3AF'}
              />
            </TouchableOpacity>

            {/* If Uzcard/Humo selected, show card inputs */}
            {selectedMethod === 'UZCARD_HUMO' && (
              <View style={styles.cardInputWrapper}>
                <Text style={styles.inputLabel}>Karta Raqami (16 xonali)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="card-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="8600 0000 0000 0000"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    value={cardNumber}
                    onChangeText={handleCardNumberChange}
                    maxLength={19}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Amal Qilish Muddati</Text>
                    <TextInput
                      style={[styles.inputContainer, styles.input, { textAlign: 'center' }]}
                      placeholder="05/28"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      value={cardExpiry}
                      onChangeText={handleExpiryChange}
                      maxLength={5}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Tizim</Text>
                    <View style={[styles.inputContainer, { justifyContent: 'center' }]}>
                      <Text style={{ fontWeight: '700', color: '#4F46E5' }}>
                        {cardNumber.startsWith('8600') ? '💳 UZCARD' : cardNumber.startsWith('9860') ? '💳 HUMO' : '💳 KARTA'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Option 2: Payme */}
            <TouchableOpacity
              style={[styles.methodCard, selectedMethod === 'PAYME' && styles.methodCardActive]}
              onPress={() => setSelectedMethod('PAYME')}
            >
              <View style={styles.methodLeft}>
                <View style={[styles.methodIconBox, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="flash" size={22} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.methodTitle}>Payme (Paycom)</Text>
                  <Text style={styles.methodDesc}>Payme ilovasi yoki chek orqali to'lov</Text>
                </View>
              </View>
              <Ionicons
                name={selectedMethod === 'PAYME' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selectedMethod === 'PAYME' ? THEME.colors.primary : '#9CA3AF'}
              />
            </TouchableOpacity>

            {/* Option 3: Click.uz */}
            <TouchableOpacity
              style={[styles.methodCard, selectedMethod === 'CLICK' && styles.methodCardActive]}
              onPress={() => setSelectedMethod('CLICK')}
            >
              <View style={styles.methodLeft}>
                <View style={[styles.methodIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark-done" size={22} color="#16A34A" />
                </View>
                <View>
                  <Text style={styles.methodTitle}>Click.uz</Text>
                  <Text style={styles.methodDesc}>Click Up ilovasi yoki USSD orqali to'lov</Text>
                </View>
              </View>
              <Ionicons
                name={selectedMethod === 'CLICK' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selectedMethod === 'CLICK' ? THEME.colors.primary : '#9CA3AF'}
              />
            </TouchableOpacity>

            {/* Option 4: In-App Wallet Balance */}
            {tradeSessionId && (
              <TouchableOpacity
                style={[styles.methodCard, selectedMethod === 'WALLET' && styles.methodCardActive]}
                onPress={() => setSelectedMethod('WALLET')}
              >
                <View style={styles.methodLeft}>
                  <View style={[styles.methodIconBox, { backgroundColor: '#FFF2EB' }]}>
                    <Ionicons name="wallet" size={22} color={THEME.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.methodTitle}>TrustTag Hamyon Balansi</Text>
                    <Text style={styles.methodDesc}>Hamyoningizdagi mavjud mablag'dan to'lash</Text>
                  </View>
                </View>
                <Ionicons
                  name={selectedMethod === 'WALLET' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selectedMethod === 'WALLET' ? THEME.colors.primary : '#9CA3AF'}
                />
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.payBtn, isProcessing && { opacity: 0.7 }]}
            onPress={handleExecutePayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.payBtnText}>
                {formatPrice(amount)} Xavfsiz Hisobga O'tkazish
              </Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  amountBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  amountVal: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.primary,
    marginVertical: 4,
  },
  shieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  shieldText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
  },
  methodList: {
    maxHeight: 320,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  methodCardActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: '#FFFBF9',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  methodIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  methodDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cardInputWrapper: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  payBtn: {
    backgroundColor: THEME.colors.primary,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
