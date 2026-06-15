import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Haptics } from '../services/haptics';
import { Check, Trash2, CheckCircle2, RotateCcw } from 'lucide-react-native';
import { ShoppingItem } from '../types';
import { VibeText } from './ui/Text';
import { useTheme } from '../hooks/useTheme';
import { useShoppingStore } from '../store/useShoppingStore';
import { EditItemModal } from './EditItemModal';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  isCompletedList?: boolean;
}

export const ShoppingItemRow: React.FC<ShoppingItemRowProps> = ({ item, isCompletedList = false }) => {
  const { colors, isDark } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);
  const toggleItemCompleted = useShoppingStore((state) => state.toggleItemCompleted);
  const deleteItem = useShoppingStore((state) => state.deleteItem);
  const updateItem = useShoppingStore((state) => state.updateItem);
  const assignItem = useShoppingStore((state) => state.assignItem);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const cycleAssignment = () => {
    if (isCompletedList) return;
    const roles: ('unassigned' | 'husband' | 'wife' | 'member')[] = ['unassigned', 'husband', 'wife', 'member'];
    const nextIdx = (roles.indexOf(item.assignedTo || 'unassigned') + 1) % roles.length;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    assignItem(item.id, roles[nextIdx]);
  };

  const handleToggle = () => {
    if (isCompletedList) return;
    // Premium success or tick haptic
    if (!item.completed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleItemCompleted(item.id);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteItem(item.id);
  };

  // Category Colors Palette mapping
  const getCategoryColors = (category: string) => {
    const norm = category.toLowerCase().trim();
    switch (norm) {
      case 'produce':
      case 'fruits':
      case 'vegetables':
        return { bg: isDark ? '#1C3A27' : '#E6F4EA', text: isDark ? '#A8FAB4' : '#137333' };
      case 'dairy':
      case 'cheese':
      case 'milk':
        return { bg: isDark ? '#1B2E3C' : '#E8F0FE', text: isDark ? '#A1C2FA' : '#1A73E8' };
      case 'meat':
      case 'seafood':
        return { bg: isDark ? '#3C1F1F' : '#FCE8E6', text: isDark ? '#FAD2CF' : '#C5221F' };
      case 'bakery':
      case 'bread':
        return { bg: isDark ? '#3C2D1F' : '#FEF7E0', text: isDark ? '#FAD283' : '#B06000' };
      case 'frozen':
        return { bg: isDark ? '#1F3C3A' : '#E4F7FB', text: isDark ? '#A1EAF0' : '#007B83' };
      case 'pantry':
      case 'snacks':
        return { bg: isDark ? '#2E1B3C' : '#F3E8FD', text: isDark ? '#DABAF8' : '#8824FA' };
      default:
        return { bg: isDark ? '#2B2B2B' : '#E8EAED', text: isDark ? '#D0D0D0' : '#5F6368' };
    }
  };

  const badgeColors = getCategoryColors(item.category);

  // Left Swipe Action: Complete/Restore
  const renderLeftActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0.5, 1],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={[styles.leftAction, { backgroundColor: item.completed ? colors.textMuted : colors.success }]}
        activeOpacity={0.8}
        onPress={() => {
          swipeableRef.current?.close();
          handleToggle();
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          {item.completed ? (
            <RotateCcw size={22} color="#FFFFFF" />
          ) : (
            <CheckCircle2 size={22} color="#FFFFFF" />
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Right Swipe Action: Delete
  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={[styles.rightAction, { backgroundColor: colors.error }]}
        activeOpacity={0.8}
        onPress={() => {
          swipeableRef.current?.close();
          handleDelete();
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Trash2 size={22} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        friction={2}
        leftThreshold={40}
        rightThreshold={40}
        enabled={!isCompletedList}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
      >
        <View
          style={[
            styles.rowContainer,
            {
              backgroundColor: colors.card,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            },
          ]}
        >
          {/* Custom Haptic Checkbox */}
          {!isCompletedList && (
            <TouchableOpacity
              onPress={handleToggle}
              activeOpacity={0.7}
              style={[
                styles.checkbox,
                {
                  borderColor: item.completed ? colors.primary : colors.textMuted,
                  backgroundColor: item.completed ? colors.primary : 'transparent',
                },
              ]}
            >
              {item.completed && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
            </TouchableOpacity>
          )}

          {/* Text Details (Touchable to open Edit Modal) */}
          <TouchableOpacity
            onPress={() => {
              if (isCompletedList) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsEditOpen(true);
            }}
            activeOpacity={0.7}
            style={styles.detailsContainer}
          >
            <View style={styles.nameRow}>
              {/* Quantity / Unit Badge */}
              <VibeText
                variant="bold"
                color={item.completed ? 'textMuted' : 'primary'}
                style={[
                  styles.quantityText,
                  item.completed && styles.completedTextLineThrough,
                ]}
              >
                {item.quantity}
                {item.unit ? ` ${item.unit}` : ''}
              </VibeText>

              {/* Name */}
              <VibeText
                variant={item.completed ? 'regular' : 'semibold'}
                color={item.completed ? 'textMuted' : 'text'}
                numberOfLines={2}
                style={[
                  styles.itemName,
                  item.completed && styles.completedTextLineThrough,
                ]}
              >
                {item.name}
              </VibeText>
            </View>

            {/* Price Details */}
            {item.price !== undefined && item.price !== null && item.price > 0 && (
              <VibeText size="xs" color="textMuted" style={styles.priceMeta}>
                ${item.price.toFixed(2)} each
                {item.quantity > 1 ? ` • Total: $${(item.price * item.quantity).toFixed(2)}` : ''}
              </VibeText>
            )}

            {/* Checked info if completed */}
            {item.completed && (item.completedBy || item.completedAt) && (
              <VibeText size="xs" color="textMuted" style={styles.completedMeta}>
                Completed
                {item.completedBy ? ` by ${item.completedBy}` : ''}
                {item.completedAt
                  ? ` at ${new Date(item.completedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : ''}
              </VibeText>
            )}
          </TouchableOpacity>

          {/* Assignee Badge */}
          {!item.completed && (
            <TouchableOpacity
              onPress={cycleAssignment}
              disabled={isCompletedList}
              activeOpacity={0.7}
              style={[
                styles.assigneeBadge,
                item.assignedTo === 'husband' && { backgroundColor: '#820AD1', borderColor: '#820AD1' },
                item.assignedTo === 'wife' && { backgroundColor: '#FF6B8B', borderColor: '#FF6B8B' },
                (!item.assignedTo || item.assignedTo === 'unassigned') && {
                  borderColor: colors.border,
                  borderStyle: 'dashed',
                  backgroundColor: 'transparent',
                },
              ]}
            >
              {item.assignedTo === 'husband' && (
                <VibeText variant="bold" style={styles.assigneeText}>H</VibeText>
              )}
              {item.assignedTo === 'wife' && (
                <VibeText variant="bold" style={styles.assigneeText}>W</VibeText>
              )}
              {(!item.assignedTo || item.assignedTo === 'unassigned') && (
                <View style={styles.emptyAssigneeDot} />
              )}
            </TouchableOpacity>
          )}

          {/* Category Tag */}
          {item.category && item.category !== 'Uncategorized' && (
            <View style={[styles.categoryBadge, { backgroundColor: badgeColors.bg }]}>
              <VibeText
                variant="bold"
                size="xs"
                style={{ color: badgeColors.text, fontSize: 10 }}
              >
                {item.category.toUpperCase()}
              </VibeText>
            </View>
          )}
        </View>
      </Swipeable>

      <EditItemModal
        visible={isEditOpen}
        item={item}
        onClose={() => setIsEditOpen(false)}
        onSave={(name, quantity, category, unit, price) => {
          updateItem(item.id, { name, quantity, category, unit, price });
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  quantityText: {
    marginRight: 8,
  },
  itemName: {
    flex: 1,
  },
  completedTextLineThrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  completedMeta: {
    marginTop: 4,
    fontSize: 11,
  },
  priceMeta: {
    marginTop: 4,
    fontSize: 12,
  },
  categoryBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'center',
  },
  leftAction: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 24,
    width: 90,
  },
  rightAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 24,
    width: 90,
  },
  assigneeBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  assigneeText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  emptyAssigneeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#888888',
  },
});
