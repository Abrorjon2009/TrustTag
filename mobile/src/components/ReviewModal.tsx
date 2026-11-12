import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface ReviewModalProps {
  tradeSessionId: string | null;
  targetUserId: string | null;
  targetUserName?: string;
  visible: boolean;
  onClose: () => void;
  onReviewSubmitted: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  tradeSessionId,
  targetUserId,
  targetUserName = 'User',
  visible,
  onClose,
  onReviewSubmitted,
}) => {
  const { currentUser } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!tradeSessionId || !targetUserId || !currentUser) return;
    setIsSubmitting(true);
    try {
      await api.submitReview({
        tradeSessionId,
        authorId: currentUser.id,
        targetUserId,
        rating,
        comment: comment.trim(),
      });
      alert('Thank you! Your verified trade review has been published.');
      onReviewSubmitted();
      onClose();
    } catch (err: any) {
      alert(`Failed to submit review: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Rate Your Safe Trade Experience</Text>
          <Text style={styles.subtitle}>
            Leave an authentic, verified review for <Text style={{ fontWeight: '700' }}>{targetUserName}</Text>:
          </Text>

          {/* 5-Star Interactive Rating */}
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starBtn}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={34}
                  color={THEME.colors.vipGold}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingLabel}>
            {rating === 5
              ? '⭐⭐⭐⭐⭐ Excellent & Fast Trade'
              : rating === 4
              ? '⭐⭐⭐⭐ Good Experience'
              : rating === 3
              ? '⭐⭐⭐ Average'
              : rating === 2
              ? '⭐⭐ Below Expectations'
              : '⭐ Poor'}
          </Text>

          {/* Written Feedback */}
          <TextInput
            style={styles.commentInput}
            placeholder="Share details about delivery speed, communication, and product condition..."
            multiline
            numberOfLines={3}
            value={comment}
            onChangeText={setComment}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Skip / Later</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitText}>Submit Review</Text>
              )}
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
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    ...THEME.shadows.float,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  starRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 14,
  },
  commentInput: {
    width: '100%',
    height: 70,
    borderWidth: 1,
    borderColor: THEME.colors.borderMedium,
    borderRadius: THEME.borderRadius.sm,
    padding: 10,
    fontSize: 13,
    textAlignVertical: 'top',
    backgroundColor: THEME.colors.canvasBg,
    marginBottom: 18,
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
  submitBtn: {
    flex: 1,
    height: 42,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

