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
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../locales/i18n';
import {
  promptGoogleAuth,
  getSavedGoogleClientId,
  saveGoogleClientId,
  loadGoogleGsiScript,
} from '../services/googleAuth';

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

  // Email state (100% Free Email OTP Verification)
  const [emailMode, setEmailMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [emailAuthType, setEmailAuthType] = useState<'OTP' | 'PASSWORD'>('OTP');
  const [emailStep, setEmailStep] = useState<'INPUT' | 'OTP'>('INPUT');
  const [email, setEmail] = useState('');
  const [emailFullName, setEmailFullName] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailDevCode, setEmailDevCode] = useState<string | null>(null);
  const [emailCountdown, setEmailCountdown] = useState(60);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Google state
  const [googleMode, setGoogleMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [googleClientId, setGoogleClientId] = useState('');
  const [showClientIdConfig, setShowClientIdConfig] = useState(false);
  const [tempClientId, setTempClientId] = useState('');

  // Telegram state (Official Telegram Auth & Bot)
  const defaultTgBot = (process.env.EXPO_PUBLIC_TELEGRAM_BOT_USERNAME || 'TrustTagUzAuthBot').replace(/^@/, '');
  const [telegramMode, setTelegramMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [telegramBotUsername, setTelegramBotUsername] = useState(defaultTgBot);
  const [showTelegramConfig, setShowTelegramConfig] = useState(false);
  const [tempTelegramBot, setTempTelegramBot] = useState(defaultTgBot);
  const [waitingTelegramSession, setWaitingTelegramSession] = useState<{
    sessionId: string;
    botUrl: string;
    type: 'AUTH' | 'PHONE';
    mode?: 'LOGIN' | 'SIGNUP';
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Timer for OTP countdown
  useEffect(() => {
    let timer: any;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Timer for Email OTP countdown
  useEffect(() => {
    let timer: any;
    if (emailStep === 'OTP' && emailCountdown > 0) {
      timer = setInterval(() => setEmailCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [emailStep, emailCountdown]);

  // Telegram Session Poller (100% Free, Real-time verification)
  useEffect(() => {
    if (!waitingTelegramSession) return;
    const { sessionId, type } = waitingTelegramSession;
    let isMounted = true;

    const interval = setInterval(async () => {
      try {
        let res = await api.checkTelegramSession(sessionId);
        // Smart fallback: check latest verified session if specific session hasn't fulfilled yet
        if (!res?.authenticated) {
          res = await api.checkTelegramSession('latest');
        }

        if (!isMounted) return;
        if (res && res.authenticated && res.token && res.user) {
          clearInterval(interval);
          setWaitingTelegramSession(null);
          await loginWithToken(res.user, res.token);
          handleClose();
          const successTitle = type === 'PHONE' ? 'Telefon Tasdiqlandi' : 'Telegram Tasdiqlandi';
          const successMsg = res.isNewUser
            ? `Assalomu alaykum, ${res.user.fullName}! Sizga 1,200,000 UZS start balansi berildi.`
            : `Assalomu alaykum, ${res.user.fullName}! Tizimga xush kelibsiz.`;
          setTimeout(() => {
            Alert.alert(successTitle, successMsg);
          }, 150);
        }
      } catch (err) {
        // Silently continue polling
      }
    }, 800);

    const timeout = setTimeout(() => {
      if (isMounted) {
        clearInterval(interval);
      }
    }, 180000); // 3 minutes timeout

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [waitingTelegramSession]);

  // Google initialization & Client ID sync
  useEffect(() => {
    if (visible && method === 'GOOGLE') {
      const savedId = getSavedGoogleClientId();
      setGoogleClientId(savedId);
      setTempClientId(savedId);
      loadGoogleGsiScript().catch(() => {});
    }
  }, [visible, method]);

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

  // 2. Real Google Auth Handlers (Log In & Sign Up)
  const handleGoogleAuth = async (modeOverride?: 'LOGIN' | 'SIGNUP') => {
    const targetMode = modeOverride || googleMode;
    const effectiveClientId = googleClientId.trim() || getSavedGoogleClientId();

    if (!effectiveClientId) {
      setShowClientIdConfig(true);
      Alert.alert(
        'Google Client ID Kerak',
        'Google orqali kirish / ro\'yxatdan o\'tish uchun Google Cloud Web Client ID kerak. Quyidagi sozlama maydoniga Client ID ni kiriting yoki mobile/.env fayliga EXPO_PUBLIC_GOOGLE_CLIENT_ID sifatida yozing.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const authResult = await promptGoogleAuth({
        clientId: effectiveClientId,
        mode: targetMode,
      });

      const res = await api.loginWithGoogle({
        accessToken: authResult.accessToken,
        idToken: authResult.idToken,
        code: authResult.code,
        mode: targetMode,
      });

      await loginWithToken(res.user, res.token);

      const title = res.isNewUser || targetMode === 'SIGNUP' ? 'Xush kelibsiz!' : 'Muvaffaqiyatli';
      const msg = res.message || (res.isNewUser
        ? `Google orqali yangi hisobingiz ochildi: ${res.user.fullName}`
        : `Google orqali kirdingiz: ${res.user.fullName}`);

      Alert.alert(title, msg);
      handleClose();
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      Alert.alert('Google Xatolik', err.message || 'Google orqali autentifikatsiyada xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClientId = () => {
    const clean = tempClientId.trim();
    saveGoogleClientId(clean);
    setGoogleClientId(clean);
    setShowClientIdConfig(false);
    Alert.alert('Saqlandi', clean ? 'Google Client ID muvaffaqiyatli saqlandi!' : 'Google Client ID tozalandi.');
  };

  // 3. Official Telegram Auth Handlers
  const handleTelegramAuth = async (modeOverride?: 'LOGIN' | 'SIGNUP') => {
    const targetMode = modeOverride || telegramMode;
    const botUser = telegramBotUsername.replace(/^@/, '').trim() || defaultTgBot;

    if (!botUser) {
      setShowTelegramConfig(true);
      Alert.alert('Telegram Bot Kerak', 'Iltimos, Telegram Bot @username kiriting');
      return;
    }

    const sessionId = `tt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const botUrl = `https://t.me/${botUser}?start=auth_${sessionId}`;

    setWaitingTelegramSession({
      sessionId,
      botUrl,
      type: 'AUTH',
      mode: targetMode,
    });

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(botUrl, '_blank');
    } else {
      try {
        await Linking.openURL(botUrl);
      } catch (e) {
        Alert.alert('Telegram topilmadi', 'Qurilmangizda Telegram ilovasi o\'rnatilganligini tekshiring');
      }
    }
  };

  const handleTelegramPhoneAuth = async () => {
    const botUser = telegramBotUsername.replace(/^@/, '').trim() || defaultTgBot;

    if (!botUser) {
      setShowTelegramConfig(true);
      Alert.alert('Telegram Bot Kerak', 'Iltimos, Telegram Bot @username kiriting');
      return;
    }

    const sessionId = `phone_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const botUrl = `https://t.me/${botUser}?start=phone_${sessionId}`;

    setWaitingTelegramSession({
      sessionId,
      botUrl,
      type: 'PHONE',
    });

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(botUrl, '_blank');
    } else {
      try {
        await Linking.openURL(botUrl);
      } catch (e) {
        Alert.alert('Telegram topilmadi', 'Qurilmangizda Telegram ilovasi o\'rnatilganligini tekshiring');
      }
    }
  };

  const handleSaveTelegramBot = () => {
    const clean = tempTelegramBot.replace(/^@/, '').trim();
    if (!clean) {
      Alert.alert('Xatolik', 'Iltimos, to\'g\'ri bot username kiriting');
      return;
    }
    setTelegramBotUsername(clean);
    setShowTelegramConfig(false);
    Alert.alert('Saqlandi', `@${clean} muvaffaqiyatli saqlandi!`);
  };

  // 4. Real Email OTP Handlers (100% Free Verification Code)
  const handleSendEmailOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      Alert.alert('Xatolik', 'Iltimos, to\'g\'ri email manzil kiriting');
      return;
    }

    if (emailMode === 'SIGNUP' && !emailFullName.trim()) {
      Alert.alert('Xatolik', 'Iltimos, ism va familiyangizni kiriting');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.sendEmailOtp({
        email: cleanEmail,
        fullName: emailFullName.trim(),
        mode: emailMode,
      });

      setEmail(res.email);
      if (res.devCode) {
        setEmailDevCode(res.devCode);
        setEmailOtpCode(res.devCode); // Pre-fill in dev simulation mode
      }
      setEmailStep('OTP');
      setEmailCountdown(60);
      Alert.alert('Kod Yuborildi', `6 xonali tasdiqlash kodi ${res.email} manziliga yuborildi. Iltimos, pochtangizni tekshiring.`);
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'Emailga kod yuborishda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtpCode || emailOtpCode.trim().length < 4) {
      Alert.alert('Xatolik', 'Iltimos, 6 xonali tasdiqlash kodini kiriting');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.verifyEmailOtp({
        email,
        code: emailOtpCode.trim(),
        fullName: emailFullName.trim(),
        mode: emailMode,
      });

      await loginWithToken(res.user, res.token);
      const title = res.isNewUser || emailMode === 'SIGNUP' ? 'Xush kelibsiz!' : 'Muvaffaqiyatli';
      Alert.alert(title, res.message || `${res.user.fullName}, tizimga muvaffaqiyatli kirdingiz!`);
      handleClose();
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'Tasdiqlash kodi noto\'g\'ri yoki eskirgan');
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy Password Handler fallback
  const handleEmailPasswordAuth = async () => {
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
      if (emailMode === 'SIGNUP') {
        if (!emailFullName.trim()) {
          Alert.alert('Xatolik', 'Iltimos, ism va familiyangizni kiriting');
          setIsLoading(false);
          return;
        }
        const res = await api.registerWithEmail({
          email: cleanEmail,
          password,
          fullName: emailFullName.trim(),
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
    setWaitingTelegramSession(null);
    setStep('PHONE');
    setOtpCode('');
    setDevCode(null);
    setEmailStep('INPUT');
    setEmailOtpCode('');
    setEmailDevCode(null);
    onClose();
  };

  const renderTelegramWaitingView = () => {
    if (!waitingTelegramSession) return null;
    const isPhone = waitingTelegramSession.type === 'PHONE';
    const botUser = telegramBotUsername || defaultTgBot;

    return (
      <View style={styles.waitingCard}>
        <View style={styles.waitingTelegramCircle}>
          <ActivityIndicator size="large" color="#0088CC" style={styles.waitingSpinner} />
          <Ionicons name="paper-plane" size={26} color="#0088CC" />
        </View>

        <Text style={styles.waitingTitle}>
          {isPhone
            ? 'Telefon raqam tasdiqlanishi kutilmoqda...'
            : 'Telegram orqali tasdiqlash kutilmoqda...'}
        </Text>

        <Text style={styles.waitingSubtitle}>
          {isPhone
            ? `Telegram botimizda (@${botUser}) pastdagi "📱 Telefon raqamimni yuborish" tugmasini bosing.`
            : `Telegram botimizda (@${botUser}) "Start" (Boshlash) tugmasini bosing.`}
        </Text>

        <View style={styles.waitingStatusPill}>
          <View style={styles.waitingPulseDot} />
          <Text style={styles.waitingStatusText}>Botdan javob kutilmoqda (avtomatik kiradi)...</Text>
        </View>

        <TouchableOpacity
          style={styles.waitingOpenBtn}
          onPress={() => {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.open(waitingTelegramSession.botUrl, '_blank');
            } else {
              Linking.openURL(waitingTelegramSession.botUrl);
            }
          }}
        >
          <Ionicons name="paper-plane" size={18} color="#fff" />
          <Text style={styles.waitingOpenBtnText}>Telegram botni ochish</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.waitingCheckNowBtn}
          onPress={async () => {
            setIsLoading(true);
            try {
              let res = await api.checkTelegramSession(waitingTelegramSession.sessionId);
              if (!res?.authenticated) {
                res = await api.checkTelegramSession('latest');
              }
              if (res && res.authenticated && res.token && res.user) {
                setWaitingTelegramSession(null);
                await loginWithToken(res.user, res.token);
                handleClose();
                return;
              }
              Alert.alert('Tasdiqlanmadi', 'Telegram botda "Start" tugmasi bosilganligini tekshiring.');
            } catch (e: any) {
              Alert.alert('Xatolik', e.message || 'Tekshirishda xatolik');
            } finally {
              setIsLoading(false);
            }
          }}
        >
          <Ionicons name="checkmark-circle" size={18} color="#15803D" />
          <Text style={styles.waitingCheckNowBtnText}>Telegramda tasdiqladim (Tekshirish)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.waitingCancelBtn}
          onPress={() => setWaitingTelegramSession(null)}
        >
          <Text style={styles.waitingCancelBtnText}>Bekor qilish</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header with Official Trusttag Logo */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Image
                source={require('../../assets/logo-mark.png')}
                style={{ width: 36, height: 44, marginRight: 10 }}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#073B63' }}>Trust</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#19AB60' }}>tag</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.colors.textSecondary, marginLeft: 6 }}>
                    • {t.loginTitle}
                  </Text>
                </View>
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
            {/* METHOD 1: PHONE NUMBER (SMS OTP & TELEGRAM CONTACT) */}
            {/* ==================================================== */}
            {method === 'PHONE' && (
              waitingTelegramSession ? (
                renderTelegramWaitingView()
              ) : step === 'PHONE' ? (
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

                  {/* Free Telegram Phone Verification (No SMS cost) */}
                  <View style={styles.orDividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerOrText}>yoki bepul va SMS-siz</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={styles.telegramPhoneBtn}
                    onPress={handleTelegramPhoneAuth}
                  >
                    <View style={styles.telegramIconCircleSmall}>
                      <Ionicons name="paper-plane" size={16} color="#fff" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.telegramPhoneBtnTitle}>Telegram orqali 1-bosishda tasdiqlash</Text>
                      <Text style={styles.telegramPhoneBtnSubtitle}>100% Bepul, SMS kutmasdan va avtomatik</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#0088CC" />
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
            {/* METHOD 2: REAL GOOGLE SIGN-IN & SIGN-UP (OAUTH 2.0)  */}
            {/* ==================================================== */}
            {method === 'GOOGLE' && (
              <View style={styles.form}>
                {/* 1. Mode Switch: LOG IN vs SIGN UP */}
                <View style={styles.googleModeSwitch}>
                  <TouchableOpacity
                    style={[styles.modeBtn, googleMode === 'LOGIN' && styles.modeBtnActive]}
                    onPress={() => setGoogleMode('LOGIN')}
                  >
                    <Text style={[styles.modeBtnText, googleMode === 'LOGIN' && styles.modeBtnTextActive]}>
                      {t.loginTab} (Log In)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeBtn, googleMode === 'SIGNUP' && styles.modeBtnActive]}
                    onPress={() => setGoogleMode('SIGNUP')}
                  >
                    <Text style={[styles.modeBtnText, googleMode === 'SIGNUP' && styles.modeBtnTextActive]}>
                      {t.registerTab} (Sign Up)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 2. Descriptive Info Banner */}
                <View style={styles.infoBannerGoogle}>
                  <Ionicons name="sparkles" size={18} color="#EA4335" />
                  <Text style={styles.infoBannerTextGoogle}>
                    {googleMode === 'LOGIN'
                      ? t.googleLoginSubtitle
                      : t.googleSignupSubtitle}
                  </Text>
                </View>

                {/* 3. Primary Real Google Action Button */}
                <TouchableOpacity
                  style={[
                    styles.realGoogleBtn,
                    googleMode === 'SIGNUP' && styles.realGoogleBtnSignup,
                    isLoading && { opacity: 0.7 },
                  ]}
                  onPress={() => handleGoogleAuth(googleMode)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#1F2937" size="small" />
                  ) : (
                    <View style={styles.googleBtnRow}>
                      <View style={[styles.googleIconCircle, googleMode === 'SIGNUP' && { backgroundColor: '#EEF2FF' }]}>
                        <Ionicons
                          name="logo-google"
                          size={22}
                          color={googleMode === 'SIGNUP' ? '#4285F4' : '#EA4335'}
                        />
                      </View>
                      <View style={styles.googleBtnTextContainer}>
                        <Text style={styles.realGoogleBtnText}>
                          {googleMode === 'LOGIN' ? t.loginWithGoogle : t.signupWithGoogle}
                        </Text>
                        <Text style={styles.realGoogleBtnSubText}>
                          {googleMode === 'LOGIN' ? 'Rasmiy Google OAuth 2.0 bilan' : '1,200,000 UZS start balansi bilan'}
                        </Text>
                      </View>
                      <Ionicons name="arrow-forward" size={18} color="#9CA3AF" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* 4. Alternate Quick Action Button (Direct 1-Tap Access to the Other Flow) */}
                <TouchableOpacity
                  style={[styles.secondaryGoogleBtn, isLoading && { opacity: 0.7 }]}
                  onPress={() => {
                    const otherMode = googleMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN';
                    setGoogleMode(otherMode);
                    handleGoogleAuth(otherMode);
                  }}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={googleMode === 'LOGIN' ? 'person-add-outline' : 'log-in-outline'}
                    size={18}
                    color="#4B5563"
                  />
                  <Text style={styles.secondaryGoogleBtnText}>
                    {googleMode === 'LOGIN'
                      ? 'Yangi hisob ochish (Sign Up with Google)'
                      : 'Mavjud hisobga kirish (Log In with Google)'}
                  </Text>
                </TouchableOpacity>

                {/* 5. Security Guarantee Badge */}
                <View style={styles.googleSecurityBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#059669" />
                  <Text style={styles.googleSecurityText}>
                    Google hisobingiz xavfsiz va shifrlangan protokol orqali ulanadi. Parolingiz hech qachon saqlanmaydi.
                  </Text>
                </View>

                {/* 6. Google Client ID Settings Drawer (For Easy Configuration) */}
                <View style={styles.clientIdConfigSection}>
                  <TouchableOpacity
                    style={styles.clientIdToggleBtn}
                    onPress={() => setShowClientIdConfig(!showClientIdConfig)}
                  >
                    <Ionicons name="settings-outline" size={14} color="#6B7280" />
                    <Text style={styles.clientIdToggleText}>
                      {googleClientId
                        ? `Google OAuth: ulangan (${googleClientId.slice(0, 14)}...)`
                        : 'Google OAuth Client ID sozlamasi'}
                    </Text>
                    <Ionicons
                      name={showClientIdConfig ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color="#6B7280"
                    />
                  </TouchableOpacity>

                  {showClientIdConfig && (
                    <View style={styles.clientIdConfigBox}>
                      <Text style={styles.clientIdConfigTitle}>Google Cloud OAuth 2.0 Web Client ID:</Text>
                      <TextInput
                        style={styles.clientIdInput}
                        placeholder="masalan: 123456789-abc.apps.googleusercontent.com"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="none"
                        value={tempClientId}
                        onChangeText={setTempClientId}
                      />
                      <View style={styles.clientIdConfigActions}>
                        <TouchableOpacity style={styles.clientIdSaveBtn} onPress={handleSaveClientId}>
                          <Text style={styles.clientIdSaveBtnText}>Saqlash</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.clientIdHelpText}>
                        * Google Cloud Console {'>'} APIs & Services {'>'} Credentials {'>'} OAuth 2.0 Client IDs bo'limidan Web Client ID oling.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ==================================================== */}
            {/* METHOD 3: TELEGRAM LOGIN & SIGN-UP (OFFICIAL OAUTH)  */}
            {/* ==================================================== */}
            {method === 'TELEGRAM' && (
              waitingTelegramSession ? (
                renderTelegramWaitingView()
              ) : (
                <View style={styles.form}>
                {/* 1. Mode Switch: LOG IN vs SIGN UP */}
                <View style={styles.googleModeSwitch}>
                  <TouchableOpacity
                    style={[styles.modeBtn, telegramMode === 'LOGIN' && styles.modeBtnActive]}
                    onPress={() => setTelegramMode('LOGIN')}
                  >
                    <Text style={[styles.modeBtnText, telegramMode === 'LOGIN' && styles.modeBtnTextActive]}>
                      {t.loginTab} (Log In)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeBtn, telegramMode === 'SIGNUP' && styles.modeBtnActive]}
                    onPress={() => setTelegramMode('SIGNUP')}
                  >
                    <Text style={[styles.modeBtnText, telegramMode === 'SIGNUP' && styles.modeBtnTextActive]}>
                      {t.registerTab} (Sign Up)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 2. Info Banner */}
                <View style={styles.infoBannerTelegram}>
                  <Ionicons name="paper-plane" size={20} color="#0088CC" />
                  <Text style={styles.infoBannerTextTelegram}>
                    {telegramMode === 'LOGIN'
                      ? "O'zbekistonda eng tez va qulay usul! Telegram orqali 1 soniyada kiring."
                      : "Telegram orqali 1 bosishda yangi hisob oching va 1,200,000 UZS start balansiga ega bo'ling!"}
                  </Text>
                </View>

                {/* 3. Primary Real Telegram Action Button */}
                <TouchableOpacity
                  style={[styles.realTelegramBtn, isLoading && { opacity: 0.7 }]}
                  onPress={() => handleTelegramAuth(telegramMode)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <View style={styles.googleBtnRow}>
                      <View style={styles.telegramIconCircle}>
                        <Ionicons name="paper-plane" size={20} color="#fff" />
                      </View>
                      <View style={styles.googleBtnTextContainer}>
                        <Text style={styles.realTelegramBtnText}>
                          {telegramMode === 'LOGIN' ? 'Telegram orqali Kirish' : 'Telegram orqali Ro\'yxatdan o\'tish'}
                        </Text>
                        <Text style={styles.realTelegramBtnSubText}>
                          {telegramMode === 'LOGIN' ? 'Rasmiy Telegram Bot OAuth orqali' : '1,200,000 UZS start balansi bilan'}
                        </Text>
                      </View>
                      <Ionicons name="arrow-forward" size={18} color="#E0F2FE" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* 4. Alternate Quick Action Button */}
                <TouchableOpacity
                  style={[styles.secondaryGoogleBtn, isLoading && { opacity: 0.7 }]}
                  onPress={() => {
                    const other = telegramMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN';
                    setTelegramMode(other);
                    handleTelegramAuth(other);
                  }}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={telegramMode === 'LOGIN' ? 'person-add-outline' : 'log-in-outline'}
                    size={18}
                    color="#0088CC"
                  />
                  <Text style={[styles.secondaryGoogleBtnText, { color: '#0088CC' }]}>
                    {telegramMode === 'LOGIN'
                      ? 'Yangi hisob ochish (Sign Up with Telegram)'
                      : 'Mavjud hisobga kirish (Log In with Telegram)'}
                  </Text>
                </TouchableOpacity>

                {/* 5. Security Guarantee Badge */}
                <View style={styles.telegramSecurityBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#0284C7" />
                  <Text style={styles.telegramSecurityText}>
                    Telegram hisobingiz xavfsiz HMAC-SHA256 protokoli orqali ulanadi. Telefon raqamingiz sir saqlanadi.
                  </Text>
                </View>

                {/* 6. Telegram Bot Config Drawer */}
                <View style={styles.clientIdConfigSection}>
                  <TouchableOpacity
                    style={styles.clientIdToggleBtn}
                    onPress={() => setShowTelegramConfig(!showTelegramConfig)}
                  >
                    <Ionicons name="settings-outline" size={14} color="#6B7280" />
                    <Text style={styles.clientIdToggleText}>
                      Telegram Bot: @{telegramBotUsername}
                    </Text>
                    <Ionicons
                      name={showTelegramConfig ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color="#6B7280"
                    />
                  </TouchableOpacity>

                  {showTelegramConfig && (
                    <View style={styles.clientIdConfigBox}>
                      <Text style={styles.clientIdConfigTitle}>Telegram Bot Username (@username):</Text>
                      <TextInput
                        style={styles.clientIdInput}
                        placeholder="masalan: TrustTagAuthBot"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="none"
                        value={tempTelegramBot}
                        onChangeText={setTempTelegramBot}
                      />
                      <View style={styles.clientIdConfigActions}>
                        <TouchableOpacity style={styles.clientIdSaveBtn} onPress={handleSaveTelegramBot}>
                          <Text style={styles.clientIdSaveBtnText}>Saqlash</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.clientIdHelpText}>
                        * @BotFather orqali yaratilgan botingiz nomini yozing.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              )
            )}

            {/* ==================================================== */}
            {/* METHOD 4: REAL EMAIL OTP (100% FREE SMTP CODE)       */}
            {/* ==================================================== */}
            {method === 'EMAIL' && (
              <View style={styles.form}>
                {/* Mode toggle: Log In vs Sign Up */}
                <View style={styles.googleModeSwitch}>
                  <TouchableOpacity
                    style={[styles.modeBtn, emailMode === 'LOGIN' && styles.modeBtnActive]}
                    onPress={() => {
                      setEmailMode('LOGIN');
                      setEmailStep('INPUT');
                    }}
                  >
                    <Text style={[styles.modeBtnText, emailMode === 'LOGIN' && styles.modeBtnTextActive]}>
                      {t.loginTab} (Log In)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeBtn, emailMode === 'SIGNUP' && styles.modeBtnActive]}
                    onPress={() => {
                      setEmailMode('SIGNUP');
                      setEmailStep('INPUT');
                    }}
                  >
                    <Text style={[styles.modeBtnText, emailMode === 'SIGNUP' && styles.modeBtnTextActive]}>
                      {t.registerTab} (Sign Up)
                    </Text>
                  </TouchableOpacity>
                </View>

                {emailAuthType === 'OTP' ? (
                  emailStep === 'INPUT' ? (
                    <View>
                      <View style={styles.infoBannerGoogle}>
                        <Ionicons name="mail-open-outline" size={18} color="#2563EB" />
                        <Text style={[styles.infoBannerTextGoogle, { color: '#1E40AF' }]}>
                          {emailMode === 'SIGNUP'
                            ? "Pochtangizga 6 xonali tasdiqlash kodi yuboriladi. Parol eslab qolish shart emas!"
                            : "Email manzilingizga bir martalik xavfsiz tasdiqlash kodi yuboriladi."}
                        </Text>
                      </View>

                      {emailMode === 'SIGNUP' && (
                        <View style={{ marginBottom: 14 }}>
                          <Text style={styles.inputLabel}>{t.fullNamePlaceholder}</Text>
                          <TextInput
                            style={styles.textInput}
                            placeholder="Sardor Aliyev"
                            placeholderTextColor="#9CA3AF"
                            value={emailFullName}
                            onChangeText={setEmailFullName}
                          />
                        </View>
                      )}

                      <Text style={styles.inputLabel}>Elektron Pochta Manzili</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="sardor@example.com"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                      />

                      <TouchableOpacity
                        style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                        onPress={handleSendEmailOtp}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.primaryBtnText}>Tasdiqlash Kodini Yuborish</Text>
                        )}
                      </TouchableOpacity>

                      <View style={styles.emailMethodToggle}>
                        <TouchableOpacity onPress={() => setEmailAuthType('PASSWORD')}>
                          <Text style={styles.emailMethodToggleText}>🔑 Parol bilan kirishni xohlaysizmi?</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.otpHeader}>
                        <Text style={styles.otpTargetText}>
                          Kod yuborildi: <Text style={{ fontWeight: '700', color: '#111827' }}>{email}</Text>
                        </Text>
                        <TouchableOpacity onPress={() => setEmailStep('INPUT')}>
                          <Text style={styles.editPhoneText}>O'zgartirish</Text>
                        </TouchableOpacity>
                      </View>

                      {emailDevCode && (
                        <View style={styles.devCodeBadge}>
                          <Ionicons name="information-circle" size={18} color="#0369A1" />
                          <Text style={styles.devCodeText}>
                            Sinov kodi: <Text style={{ fontWeight: '800' }}>{emailDevCode}</Text> (avtomatik kiritildi)
                          </Text>
                        </View>
                      )}

                      <Text style={styles.inputLabel}>Pochtangizga kelgan 6 xonali kod</Text>
                      <TextInput
                        style={styles.otpInput}
                        placeholder="123456"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={emailOtpCode}
                        onChangeText={setEmailOtpCode}
                        autoFocus={true}
                      />

                      <TouchableOpacity
                        style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                        onPress={handleVerifyEmailOtp}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.primaryBtnText}>Tasdiqlash va Davom Etish</Text>
                        )}
                      </TouchableOpacity>

                      <View style={styles.resendRow}>
                        {emailCountdown > 0 ? (
                          <Text style={styles.resendTimerText}>
                            Qayta yuborish: {emailCountdown}s
                          </Text>
                        ) : (
                          <TouchableOpacity onPress={handleSendEmailOtp}>
                            <Text style={styles.resendLinkText}>Kodni qayta yuborish</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )
                ) : (
                  <View>
                    {emailMode === 'SIGNUP' && (
                      <View style={{ marginBottom: 14 }}>
                        <Text style={styles.inputLabel}>{t.fullNamePlaceholder}</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Sardor Aliyev"
                          placeholderTextColor="#9CA3AF"
                          value={emailFullName}
                          onChangeText={setEmailFullName}
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
                      onPress={handleEmailPasswordAuth}
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

                    <View style={styles.emailMethodToggle}>
                      <TouchableOpacity onPress={() => setEmailAuthType('OTP')}>
                        <Text style={styles.emailMethodToggleText}>📩 Parolsiz Email Kod (OTP) orqali kirish</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
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
    backgroundColor: THEME.colors.primaryTint,
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
  googleModeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  realGoogleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  realGoogleBtnSignup: {
    borderColor: '#C7D2FE',
    backgroundColor: '#F8FAFC',
  },
  googleBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleBtnTextContainer: {
    flex: 1,
  },
  realGoogleBtnText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  realGoogleBtnSubText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  secondaryGoogleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  secondaryGoogleBtnText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  googleSecurityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  googleSecurityText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    lineHeight: 15,
  },
  clientIdConfigSection: {
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  clientIdToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  clientIdToggleText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  clientIdConfigBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  clientIdConfigTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  clientIdInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#111827',
  },
  clientIdConfigActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  clientIdSaveBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  clientIdSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  clientIdHelpText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 8,
    lineHeight: 14,
  },
  realTelegramBtn: {
    backgroundColor: '#0088CC',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 4,
    shadowColor: '#0088CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  telegramIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  realTelegramBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  realTelegramBtnSubText: {
    color: '#E0F2FE',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  telegramSecurityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  telegramSecurityText: {
    flex: 1,
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 15,
  },
  waitingCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#0088CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  waitingTelegramCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  waitingSpinner: {
    position: 'absolute',
    transform: [{ scale: 1.4 }],
  },
  waitingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  waitingSubtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  waitingStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 18,
  },
  waitingPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 8,
  },
  waitingStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  waitingOpenBtn: {
    backgroundColor: '#0088CC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    width: '100%',
    marginBottom: 10,
    gap: 8,
  },
  waitingOpenBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  waitingCheckNowBtn: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    width: '100%',
    marginBottom: 10,
    gap: 8,
  },
  waitingCheckNowBtnText: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '700',
  },
  waitingCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  waitingCancelBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerOrText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  telegramPhoneBtn: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  telegramIconCircleSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0088CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  telegramPhoneBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  telegramPhoneBtnSubtitle: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 2,
  },
  emailMethodToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    paddingVertical: 6,
  },
  emailMethodToggleText: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '600',
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
    backgroundColor: THEME.colors.primaryTint,
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
