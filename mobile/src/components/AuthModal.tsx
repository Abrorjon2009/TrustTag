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
  ScrollView,
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

type AuthMethod = 'PHONE' | 'GOOGLE' | 'TELEGRAM' | 'EMAIL';

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
  const { loginWithToken } = useAuth();
  const { t } = useTranslation();

  // Active Auth Method: 'PHONE' | 'GOOGLE' | 'TELEGRAM' | 'EMAIL'
  const [method, setMethod] = useState<AuthMethod>('PHONE');

  // Phone state
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  // Email state
  const [emailMode, setEmailMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Google state
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // Telegram state
  const [telegramUsername, setTelegramUsername] = useState('');
  const [telegramName, setTelegramName] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // Timer for OTP countdown
  useEffect(() => {
    let timer: any;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // ==========================================
  // HANDLERS
  // ==========================================

  // 1. Phone Handlers
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
        setOtpCode(res.devCode); // Auto-fill for friction-free dev testing
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
      handleClose();
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'Tasdiqlash kodi noto\'g\'ri');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Google Handler
  const handleGoogleLogin = async (presetEmail?: string, presetName?: string) => {
    const targetEmail = (presetEmail || googleEmail).trim().toLowerCase();
    const targetName = (presetName || googleName || targetEmail.split('@')[0] || 'Google User').trim();

    if (!targetEmail || !targetEmail.includes('@')) {
      Alert.alert('Xatolik', 'Iltimos, Google elektron pochta manzilingizni kiriting');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.loginWithGoogle({
        email: targetEmail,
        fullName: targetName,
        googleId: `google_${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      });
      await loginWithToken(res.user, res.token);
      Alert.alert('Muvaffaqiyatli', `Google orqali kirdingiz: ${res.user.fullName}`);
      handleClose();
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'Google orqali kirishda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Telegram Handler
  const handleTelegramLogin = async (presetUsername?: string, presetName?: string) => {
    let cleanUsername = (presetUsername || telegramUsername).replace(/^@/, '').trim();
    if (!cleanUsername) {
      Alert.alert('Xatolik', 'Iltimos, Telegram @username kiriting');
      return;
    }

    const displayName = (presetName || telegramName || `@${cleanUsername}`).trim();

    setIsLoading(true);
    try {
      const res = await api.loginWithTelegram({
        username: cleanUsername,
        fullName: displayName,
        telegramId: `tg_${cleanUsername}`,
      });
      await loginWithToken(res.user, res.token);
      Alert.alert('Muvaffaqiyatli', `Telegram orqali kirdingiz: ${res.user.fullName}`);
      handleClose();
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'Telegram orqali kirishda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Email Handlers
  const handleEmailAuth = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      Alert.alert('Xatolik', 'Iltimos, to\'g\'ri email manzil kiriting');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Xatolik', 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }

    setIsLoading(true);
    try {
      if (emailMode === 'REGISTER') {
        if (!fullName.trim()) {
          Alert.alert('Xatolik', 'Iltimos, ism va familiyangizni kiriting');
          setIsLoading(false);
          return;
        }
        const res = await api.registerWithEmail({
          email: cleanEmail,
          password,
          fullName: fullName.trim(),
        });
        await loginWithToken(res.user, res.token);
        Alert.alert('Muvaffaqiyatli', `Ro'yxatdan o'tdingiz: ${res.user.fullName}`);
      } else {
        const res = await api.loginWithEmail({
          email: cleanEmail,
          password,
        });
        await loginWithToken(res.user, res.token);
        Alert.alert('Muvaffaqiyatli', `Xush kelibsiz, ${res.user.fullName}!`);
      }
      handleClose();
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'Email orqali amalni bajarishda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('PHONE');
    setOtpCode('');
    setDevCode(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
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
                <Text style={styles.subtitle}>
                  {method === 'PHONE'
                    ? t.loginSubtitle
                    : method === 'GOOGLE'
                    ? 'Google hisobingiz orqali parolsiz va tekin kiring'
                    : method === 'TELEGRAM'
                    ? 'Telegram profilingiz orqali 1-bosishda kiring'
                    : 'Email va parol orqali xavfsiz kiring'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Method Selector Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, method === 'PHONE' && styles.tabBtnActive]}
              onPress={() => {
                setMethod('PHONE');
                setStep('PHONE');
              }}
            >
              <Ionicons
                name="call"
                size={16}
                color={method === 'PHONE' ? THEME.colors.primary : '#6B7280'}
              />
              <Text style={[styles.tabText, method === 'PHONE' && styles.tabTextActive]}>
                {t.methodPhone}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, method === 'GOOGLE' && styles.tabBtnActiveGoogle]}
              onPress={() => setMethod('GOOGLE')}
            >
              <Ionicons
                name="logo-google"
                size={16}
                color={method === 'GOOGLE' ? '#EA4335' : '#6B7280'}
              />
              <Text style={[styles.tabText, method === 'GOOGLE' && styles.tabTextActiveGoogle]}>
                Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, method === 'TELEGRAM' && styles.tabBtnActiveTelegram]}
              onPress={() => setMethod('TELEGRAM')}
            >
              <Ionicons
                name="paper-plane"
                size={16}
                color={method === 'TELEGRAM' ? '#0088CC' : '#6B7280'}
              />
              <Text style={[styles.tabText, method === 'TELEGRAM' && styles.tabTextActiveTelegram]}>
                Telegram
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, method === 'EMAIL' && styles.tabBtnActive]}
              onPress={() => setMethod('EMAIL')}
            >
              <Ionicons
                name="mail"
                size={16}
                color={method === 'EMAIL' ? THEME.colors.primary : '#6B7280'}
              />
              <Text style={[styles.tabText, method === 'EMAIL' && styles.tabTextActive]}>
                {t.methodEmail}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* ==================================================== */}
            {/* METHOD 1: PHONE NUMBER (SMS OTP)                    */}
            {/* ==================================================== */}
            {method === 'PHONE' && (
              step === 'PHONE' ? (
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

                  <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                    Ismingiz (Yangi foydalanuvchilar uchun)
                  </Text>
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
                    <Text style={styles.demoSectionTitle}>{t.quickDemoAccounts}</Text>
                    <View style={styles.demoButtons}>
                      <TouchableOpacity
                        style={styles.demoBtn}
                        onPress={() => handleSendOtp('+998939876543')}
                      >
                        <Ionicons name="cart-outline" size={15} color="#0284C7" />
                        <Text style={styles.demoBtnText}>Alex (Xaridor)</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.demoBtn}
                        onPress={() => handleSendOtp('+998901234567')}
                      >
                        <Ionicons name="storefront-outline" size={15} color="#16A34A" />
                        <Text style={styles.demoBtnText}>Sarah (Sotuvchi)</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.demoBtn}
                        onPress={() => handleSendOtp('+998971112233')}
                      >
                        <Ionicons name="shield-outline" size={15} color="#DC2626" />
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
              )
            )}

            {/* ==================================================== */}
            {/* METHOD 2: GOOGLE SIGN-IN (FREE & 1-TAP)              */}
            {/* ==================================================== */}
            {method === 'GOOGLE' && (
              <View style={styles.form}>
                <View style={styles.infoBannerGoogle}>
                  <Ionicons name="sparkles" size={20} color="#EA4335" />
                  <Text style={styles.infoBannerTextGoogle}>
                    Google bilan 100% tekin, SMS kutmasdan va 1 bosishda hisob oching!
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Google Pochta Manzili</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="masalan: alisher.q@gmail.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={googleEmail}
                  onChangeText={setGoogleEmail}
                />

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Ismingiz</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Alisher Qodirov"
                  placeholderTextColor="#9CA3AF"
                  value={googleName}
                  onChangeText={setGoogleName}
                />

                <TouchableOpacity
                  style={[styles.googleBtn, isLoading && { opacity: 0.7 }]}
                  onPress={() => handleGoogleLogin()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#374151" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color="#EA4335" />
                      <Text style={styles.googleBtnText}>Google orqali Kirish</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* 1-Tap Quick Accounts */}
                <View style={styles.demoSection}>
                  <Text style={styles.demoSectionTitle}>Tezkor Sinov Google Akkauntlari:</Text>
                  <View style={styles.demoButtons}>
                    <TouchableOpacity
                      style={styles.demoBtn}
                      onPress={() => handleGoogleLogin('alex.buyer@gmail.com', 'Alex (Google Xaridor)')}
                    >
                      <Ionicons name="logo-google" size={14} color="#EA4335" />
                      <Text style={styles.demoBtnText}>Alex Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.demoBtn}
                      onPress={() => handleGoogleLogin('sarah.seller@gmail.com', 'Sarah (Google Sotuvchi)')}
                    >
                      <Ionicons name="logo-google" size={14} color="#EA4335" />
                      <Text style={styles.demoBtnText}>Sarah Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.demoBtn}
                      onPress={() => handleGoogleLogin('developer.uz@gmail.com', 'Sardor Qodirov')}
                    >
                      <Ionicons name="logo-google" size={14} color="#EA4335" />
                      <Text style={styles.demoBtnText}>Yangi Profil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* ==================================================== */}
            {/* METHOD 3: TELEGRAM LOGIN (FREE & UZBEKISTAN FAVORITE) */}
            {/* ==================================================== */}
            {method === 'TELEGRAM' && (
              <View style={styles.form}>
                <View style={styles.infoBannerTelegram}>
                  <Ionicons name="paper-plane" size={20} color="#0088CC" />
                  <Text style={styles.infoBannerTextTelegram}>
                    O'zbekistonda eng tez va ommabop usul! Telegram orqali 1 soniyada ulaning.
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Telegram Foydalanuvchi Nomi (@username)</Text>
                <View style={styles.inputWithIcon}>
                  <Text style={styles.inputPrefix}>@</Text>
                  <TextInput
                    style={[styles.textInput, { flex: 1, borderWidth: 0, backgroundColor: 'transparent' }]}
                    placeholder="alisher_trade"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    value={telegramUsername.replace(/^@/, '')}
                    onChangeText={(txt) => setTelegramUsername(txt.replace(/^@/, ''))}
                  />
                </View>

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Telegramdagi Ismingiz</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Alisher"
                  placeholderTextColor="#9CA3AF"
                  value={telegramName}
                  onChangeText={setTelegramName}
                />

                <TouchableOpacity
                  style={[styles.telegramBtn, isLoading && { opacity: 0.7 }]}
                  onPress={() => handleTelegramLogin()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={20} color="#fff" />
                      <Text style={styles.telegramBtnText}>Telegram orqali Kirish</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* 1-Tap Quick Telegram Accounts */}
                <View style={styles.demoSection}>
                  <Text style={styles.demoSectionTitle}>Tezkor Sinov Telegram Akkauntlari:</Text>
                  <View style={styles.demoButtons}>
                    <TouchableOpacity
                      style={styles.demoBtn}
                      onPress={() => handleTelegramLogin('alex_trade_uz', 'Alex Trade (TG)')}
                    >
                      <Ionicons name="paper-plane" size={14} color="#0088CC" />
                      <Text style={styles.demoBtnText}>@alex_trade_uz</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.demoBtn}
                      onPress={() => handleTelegramLogin('sarah_store_uz', 'Sarah Store (TG)')}
                    >
                      <Ionicons name="paper-plane" size={14} color="#0088CC" />
                      <Text style={styles.demoBtnText}>@sarah_store_uz</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.demoBtn}
                      onPress={() => handleTelegramLogin('tashkent_buyer', 'Toshkent Xaridor')}
                    >
                      <Ionicons name="paper-plane" size={14} color="#0088CC" />
                      <Text style={styles.demoBtnText}>@tashkent_buyer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* ==================================================== */}
            {/* METHOD 4: EMAIL + PASSWORD (FREE & UNIVERSAL)        */}
            {/* ==================================================== */}
            {method === 'EMAIL' && (
              <View style={styles.form}>
                {/* Mode toggle */}
                <View style={styles.emailModeSwitch}>
                  <TouchableOpacity
                    style={[styles.modeBtn, emailMode === 'LOGIN' && styles.modeBtnActive]}
                    onPress={() => setEmailMode('LOGIN')}
                  >
                    <Text style={[styles.modeBtnText, emailMode === 'LOGIN' && styles.modeBtnTextActive]}>
                      {t.loginTab}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeBtn, emailMode === 'REGISTER' && styles.modeBtnActive]}
                    onPress={() => setEmailMode('REGISTER')}
                  >
                    <Text style={[styles.modeBtnText, emailMode === 'REGISTER' && styles.modeBtnTextActive]}>
                      {t.registerTab}
                    </Text>
                  </TouchableOpacity>
                </View>

                {emailMode === 'REGISTER' && (
                  <View style={{ marginBottom: 14 }}>
                    <Text style={styles.inputLabel}>{t.fullNamePlaceholder}</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Sardor Aliyev"
                      placeholderTextColor="#9CA3AF"
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>
                )}

                <Text style={styles.inputLabel}>Email Manzil</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="sardor@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Parol</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Kamida 6 ta belgi"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                  onPress={handleEmailAuth}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {emailMode === 'LOGIN' ? 'Tizimga Kirish' : "Ro'yxatdan O'tish"}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Quick Fill Demo */}
                <View style={styles.demoSection}>
                  <Text style={styles.demoSectionTitle}>Tezkor Sinov Akkaunti:</Text>
                  <TouchableOpacity
                    style={[styles.demoBtn, { alignSelf: 'flex-start' }]}
                    onPress={() => {
                      setEmailMode('LOGIN');
                      setEmail('testuser@trusttag.uz');
                      setPassword('123456');
                    }}
                  >
                    <Ionicons name="key-outline" size={14} color="#6366F1" />
                    <Text style={styles.demoBtnText}>testuser@trusttag.uz / 123456</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
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
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnActiveGoogle: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  tabBtnActiveTelegram: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  tabTextActiveGoogle: {
    color: '#EA4335',
    fontWeight: '700',
  },
  tabTextActiveTelegram: {
    color: '#0088CC',
    fontWeight: '700',
  },
  form: {
    paddingTop: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
    height: 50,
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
    height: 50,
    fontSize: 15,
    color: '#111827',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
    height: 50,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0088CC',
    marginRight: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
    height: 50,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  eyeBtn: {
    padding: 6,
  },
  emailModeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  modeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeBtnTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  primaryBtn: {
    backgroundColor: THEME.colors.primary,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EA4335',
    height: 50,
    borderRadius: 14,
    marginTop: 18,
    gap: 10,
    shadowColor: '#EA4335',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  googleBtnText: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: '700',
  },
  telegramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0088CC',
    height: 50,
    borderRadius: 14,
    marginTop: 18,
    gap: 10,
    shadowColor: '#0088CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  telegramBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  infoBannerGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  infoBannerTextGoogle: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 17,
    fontWeight: '500',
  },
  infoBannerTelegram: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  infoBannerTextTelegram: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 17,
    fontWeight: '500',
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  demoSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
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
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 9,
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
    marginBottom: 14,
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
    marginBottom: 14,
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
    height: 56,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: '#FFF9F5',
    color: '#111827',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 16,
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
