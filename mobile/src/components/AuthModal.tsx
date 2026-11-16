import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../locales/i18n';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
  const { loginWithToken } = useAuth();
  const { t } = useTranslation();

  // 'PHONE' | 'OTP'
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    let timer: any;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleSendOtp = async (presetPhone?: string) => {
    const targetPhone = presetPhone || phoneNumber;
    if (!targetPhone || targetPhone.replace(/\D/g, '').length < 9) {
      Alert.alert('Xatolik', 'Iltimos, to\'g\'ri telefon raqam kiriting');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.sendOtp(targetPhone);
      setPhoneNumber(res.phoneNumber);
      if (res.devCode) {
        setDevCode(res.devCode);
        setOtpCode(res.devCode); // auto-fill for frictionless testing
      }
      setStep('OTP');
      setCountdown(60);
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'SMS kod yuborishda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      Alert.alert('Xatolik', 'Iltimos, 6 xonali tasdiqlash kodini kiriting');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.verifyOtp(phoneNumber, otpCode, fullName);
      await loginWithToken(res.user, res.token);
      Alert.alert('Muvaffaqiyatli', `Xush kelibsiz, ${res.user.fullName}!`);
      onClose();
      // Reset
      setStep('PHONE');
      setOtpCode('');
      setDevCode(null);
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'Tasdiqlash kodi noto\'g\'ri');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={24} color={THEME.colors.primary} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.title}>{t.loginTitle}</Text>
                <Text style={styles.subtitle}>{t.loginSubtitle}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {step === 'PHONE' ? (
            <View style={styles.form}>
              <Text style={styles.inputLabel}>{t.phoneLabel}</Text>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.countryCode}>🇺🇿 +998</Text>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="90 123 45 67"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  maxLength={13}
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Ismingiz (Yangi foydalanuvchilar uchun)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Masalan: Sardor Aliyev"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={setFullName}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                onPress={() => handleSendOtp()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t.sendCode}</Text>
                )}
              </TouchableOpacity>

              {/* Quick Demo Accounts */}
              <View style={styles.demoSection}>
                <Text style={styles.demoSectionTitle}>Tezkor Sinov Akkauntlari (1-Bosishda):</Text>
                <View style={styles.demoButtons}>
                  <TouchableOpacity
                    style={styles.demoBtn}
                    onPress={() => handleSendOtp('+998939876543')}
                  >
                    <Ionicons name="cart-outline" size={16} color="#0284C7" />
                    <Text style={styles.demoBtnText}>Alex (Xaridor)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.demoBtn}
                    onPress={() => handleSendOtp('+998901234567')}
                  >
                    <Ionicons name="storefront-outline" size={16} color="#16A34A" />
                    <Text style={styles.demoBtnText}>Sarah (Sotuvchi)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.demoBtn}
                    onPress={() => handleSendOtp('+998971112233')}
                  >
                    <Ionicons name="shield-outline" size={16} color="#DC2626" />
                    <Text style={styles.demoBtnText}>Admin (Nazoratchi)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.otpHeader}>
                <Text style={styles.otpTargetText}>
                  Kod yuborildi: <Text style={{ fontWeight: '700', color: '#111827' }}>{phoneNumber}</Text>
                </Text>
                <TouchableOpacity onPress={() => setStep('PHONE')}>
                  <Text style={styles.editPhoneText}>{t.changePhone}</Text>
                </TouchableOpacity>
              </View>

              {devCode && (
                <View style={styles.devCodeBadge}>
                  <Ionicons name="information-circle" size={18} color="#0369A1" />
                  <Text style={styles.devCodeText}>
                    Sinov SMS kodi: <Text style={{ fontWeight: '800' }}>{devCode}</Text> (avtomatik kiritildi)
                  </Text>
                </View>
              )}

              <Text style={styles.inputLabel}>{t.enterCode}</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="123456"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={setOtpCode}
                autoFocus={true}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                onPress={handleVerifyOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t.verifyAndLogin}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendRow}>
                {countdown > 0 ? (
                  <Text style={styles.resendTimerText}>
                    {t.resendIn} {countdown}s
                  </Text>
                ) : (
                  <TouchableOpacity onPress={() => handleSendOtp(phoneNumber)}>
                    <Text style={styles.resendLinkText}>Kodni qayta yuborish</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
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
  form: {
    paddingTop: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
    height: 52,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
    height: 52,
    fontSize: 15,
    color: '#111827',
  },
  primaryBtn: {
    backgroundColor: THEME.colors.primary,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  demoSection: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  demoSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  demoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  demoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  otpTargetText: {
    fontSize: 13,
    color: '#4B5563',
  },
  editPhoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  devCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  devCodeText: {
    fontSize: 12,
    color: '#0369A1',
  },
  otpInput: {
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderRadius: 14,
    height: 60,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: '#FFF9F5',
    color: '#111827',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 18,
  },
  resendTimerText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  resendLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
});
