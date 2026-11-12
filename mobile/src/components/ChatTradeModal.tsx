import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { TradeSession, ChatMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { api, SOCKET_URL } from '../api/client';
import { io, Socket } from 'socket.io-client';

interface ChatTradeModalProps {
  tradeId: string | null;
  visible: boolean;
  onClose: () => void;
  onOpenReport: (tradeSessionId: string) => void;
}

export const ChatTradeModal: React.FC<ChatTradeModalProps> = ({
  tradeId,
  visible,
  onClose,
  onOpenReport,
}) => {
  const { currentUser } = useAuth();
  const [trade, setTrade] = useState<TradeSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  // Fetch trade data
  const loadTradeData = async () => {
    if (!tradeId) return;
    try {
      const data = await api.getTrade(tradeId, currentUser?.id);
      setTrade(data);
      setMessages(data.chatMessages || []);
    } catch (err) {
      console.error('Error loading trade:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible && tradeId) {
      loadTradeData();

      // Connect socket
      const socket = io(SOCKET_URL);
      socketRef.current = socket;

      socket.emit('join_trade', tradeId);

      socket.on('new_message', (msg: ChatMessage) => {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      });

      socket.on('trade_status_updated', () => {
        loadTradeData();
      });

      return () => {
        socket.emit('leave_trade', tradeId);
        socket.disconnect();
      };
    }
  }, [visible, tradeId, currentUser]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !socketRef.current || !tradeId || !currentUser) return;
    socketRef.current.emit('send_message', {
      tradeSessionId: tradeId,
      senderId: currentUser.id,
      text: inputText.trim(),
    });
    setInputText('');
  };

  // Money Action 1: Deposit to Central Account
  const handleDeposit = () => {
    if (!trade || !currentUser) return;
    const confirmed = confirm(
      `Deposit $${trade.agreedPrice.toFixed(2)} into the Central Safe-Hold Account?\n\nThe funds will be securely held in the Central Bank until you receive and verify the item.`
    );
    if (!confirmed) return;

    setIsActionLoading(true);
    api
      .depositTrade(trade.id, currentUser.id)
      .then(() => {
        alert('Funds safely held in Central Account! The seller has been cleared to deliver.');
        loadTradeData();
      })
      .catch((err) => alert(`Deposit failed: ${err.message}`))
      .finally(() => setIsActionLoading(false));
  };

  // Money Action 2: Product Received (Release to Seller)
  const handleProductReceived = () => {
    if (!trade || !currentUser) return;
    const confirmed = confirm(
      `Confirm Product Received?\n\nAre you sure you have received and inspected the item? This will IMMEDIATELY release $${trade.agreedPrice.toFixed(2)} from the Central Bank Account to the Seller.`
    );
    if (!confirmed) return;

    setIsActionLoading(true);
    api
      .receiveTrade(trade.id, currentUser.id)
      .then(() => {
        alert('Payment released to Seller! Trade completed.');
        loadTradeData();
      })
      .catch((err) => alert(`Confirmation failed: ${err.message}`))
      .finally(() => setIsActionLoading(false));
  };

  // Money Action 3: Withdraw Money
  const handleWithdrawMoney = () => {
    if (!trade || !currentUser) return;
    const confirmed = confirm(
      `Withdraw Money from Central Safe Account?\n\nThis will cancel the trade and immediately return $${trade.agreedPrice.toFixed(2)} back to your account. The seller will be alerted.`
    );
    if (!confirmed) return;

    setIsActionLoading(true);
    api
      .withdrawTrade(trade.id, currentUser.id)
      .then(() => {
        alert('Money withdrawn back to your account. Trade cancelled.');
        loadTradeData();
      })
      .catch((err) => alert(`Withdrawal failed: ${err.message}`))
      .finally(() => setIsActionLoading(false));
  };

  if (!visible || !tradeId) return null;

  const isBuyer = currentUser?.id === trade?.buyerId;
  const isSeller = currentUser?.id === trade?.sellerId;
  const otherPartyName = isBuyer ? trade?.seller.fullName : trade?.buyer.fullName;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Chat Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.topInfo}>
            <Text style={styles.otherPartyName}>{otherPartyName || 'Safe Trade Chat'}</Text>
            <Text style={styles.roleSubtext}>
              {isBuyer ? 'You are the Customer (Buyer)' : isSeller ? 'You are the Seller' : 'Spectator'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.reportHeaderBtn}
            onPress={() => onOpenReport(trade?.id || '')}
          >
            <Ionicons name="alert-circle-outline" size={16} color={THEME.colors.alertRed} />
            <Text style={styles.reportHeaderText}>Report</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={{ marginTop: 10, color: THEME.colors.textSecondary }}>
              Connecting to Safe Trade...
            </Text>
          </View>
        ) : (
          <>
            {/* LIVE DYNAMIC TRADE STATUS BANNER */}
            {trade?.banner && (
              <View style={[styles.statusBanner, { backgroundColor: trade.banner.badgeBg }]}>
                <View style={styles.bannerIconBox}>
                  <Ionicons
                    name={
                      trade.banner.color === 'green'
                        ? 'shield-checkmark'
                        : trade.banner.color === 'yellow'
                        ? 'warning'
                        : trade.banner.color === 'blue'
                        ? 'checkmark-circle'
                        : trade.banner.color === 'red'
                        ? 'alert-circle'
                        : 'time'
                    }
                    size={22}
                    color={trade.banner.badgeText}
                  />
                </View>
                <View style={styles.bannerTextCol}>
                  <Text style={[styles.bannerTitle, { color: trade.banner.badgeText }]}>
                    {trade.banner.title}
                  </Text>
                  <Text style={[styles.bannerMessage, { color: trade.banner.badgeText }]}>
                    {trade.banner.message}
                  </Text>
                </View>
              </View>
            )}

            {/* Product Summary Header Strip */}
            <View style={styles.productStrip}>
              <Image
                source={{
                  uri:
                    trade?.product.images?.[0] ||
                    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120',
                }}
                style={styles.productThumb}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={1}>
                  {trade?.product.title}
                </Text>
                <Text style={styles.productPrice}>Agreed Price: ${trade?.agreedPrice.toFixed(2)}</Text>
              </View>
            </View>

            {/* In-Trade Action Bar */}
            <View style={styles.actionDock}>
              {/* If Stage 1 (Agreeing) and Customer */}
              {trade?.status === 'NEGOTIATING' && isBuyer && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.depositBtn]}
                  onPress={handleDeposit}
                  disabled={isActionLoading}
                >
                  <Ionicons name="card-outline" size={16} color="#FFF" />
                  <Text style={styles.actionBtnText}>
                    Send ${trade?.agreedPrice.toFixed(2)} to Central Safe Account
                  </Text>
                </TouchableOpacity>
              )}

              {/* If Stage 1 (Agreeing) and Seller */}
              {trade?.status === 'NEGOTIATING' && isSeller && (
                <View style={styles.sellerWarningBox}>
                  <Ionicons name="hourglass-outline" size={16} color={THEME.colors.textSecondary} />
                  <Text style={styles.sellerWarningText}>
                    Waiting for customer to deposit funds into Central Safe-Hold. Do not hand over item yet.
                  </Text>
                </View>
              )}

              {/* If Stage 2 (Money in Central Account) and Customer */}
              {trade?.status === 'MONEY_IN_SAFE_HOLD' && isBuyer && (
                <View style={styles.dualActionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.receiveBtn]}
                    onPress={handleProductReceived}
                    disabled={isActionLoading}
                  >
                    <Ionicons name="checkmark-done" size={16} color="#FFF" />
                    <Text style={styles.actionBtnText}>Product Received</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.withdrawBtn]}
                    onPress={handleWithdrawMoney}
                    disabled={isActionLoading}
                  >
                    <Ionicons name="arrow-undo-outline" size={16} color="#FFF" />
                    <Text style={styles.actionBtnText}>Withdraw Money</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* If Stage 2 and Seller */}
              {trade?.status === 'MONEY_IN_SAFE_HOLD' && isSeller && (
                <View style={styles.sellerSafeBox}>
                  <Ionicons name="shield-checkmark" size={16} color={THEME.colors.safeGreen} />
                  <Text style={styles.sellerSafeText}>
                    Funds are secured in Central Account! Safe to deliver or hand over the product.
                  </Text>
                </View>
              )}
            </View>

            {/* Chat Messages Stream */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatContent}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg) => {
                // If it's a verified system event
                if (msg.isSystemEvent) {
                  return (
                    <View key={msg.id} style={styles.systemEventContainer}>
                      <View style={styles.systemEventBox}>
                        <Text style={styles.systemEventText}>{msg.messageText}</Text>
                        <Text style={styles.systemEventTime}>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                  );
                }

                // Regular chat message
                const isMe = msg.senderId === currentUser?.id;
                return (
                  <View
                    key={msg.id}
                    style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}
                  >
                    {!isMe && (
                      <Image
                        source={{
                          uri:
                            msg.sender?.avatarUrl ||
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80',
                        }}
                        style={styles.msgAvatar}
                      />
                    )}
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                      <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                        {msg.messageText}
                      </Text>
                      <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Bottom Input Field */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message or agree on handover..."
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]}
                onPress={handleSendMessage}
                disabled={!inputText.trim()}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </>
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
  topBar: {
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
  backBtn: {
    padding: 4,
  },
  topInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  otherPartyName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  roleSubtext: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  reportHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.alertRedLight,
    gap: 4,
  },
  reportHeaderText: {
    color: THEME.colors.alertRed,
    fontSize: 11,
    fontWeight: '700',
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: THEME.borderRadius.md,
  },
  bannerIconBox: {
    marginRight: 10,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  bannerMessage: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  productStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 8,
    padding: 8,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  productThumb: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.xs,
    marginRight: 10,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  actionDock: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: THEME.borderRadius.pill,
    gap: 6,
  },
  depositBtn: {
    backgroundColor: THEME.colors.primary,
  },
  receiveBtn: {
    flex: 1,
    backgroundColor: THEME.colors.safeGreen,
  },
  withdrawBtn: {
    flex: 1,
    backgroundColor: '#EAB308',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  dualActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sellerWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
    gap: 8,
  },
  sellerWarningText: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 15,
  },
  sellerSafeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.safeGreenLight,
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
    gap: 8,
  },
  sellerSafeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.safeGreenDark,
    lineHeight: 15,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: 12,
    paddingBottom: 20,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 6,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: THEME.colors.primary,
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
  },
  bubbleTextOther: {
    color: THEME.colors.textPrimary,
  },
  timeText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  timeTextOther: {
    color: THEME.colors.textMuted,
  },
  systemEventContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  systemEventBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxWidth: '90%',
  },
  systemEventText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '500',
  },
  systemEventTime: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
  },
  chatInput: {
    flex: 1,
    height: 40,
    backgroundColor: THEME.colors.canvasBg,
    borderRadius: THEME.borderRadius.pill,
    paddingHorizontal: 14,
    fontSize: 13,
    color: THEME.colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

