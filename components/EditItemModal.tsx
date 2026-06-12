import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import {
  X,
  Plus,
  Minus,
  Apple,
  Egg,
  Beef,
  Flame,
  Snowflake,
  Sparkles,
  ShoppingBag,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { VibeText } from './ui/Text';
import { VibeInput } from './ui/Input';
import { VibeButton } from './ui/Button';
import { ShoppingItem } from '../types';

interface EditItemModalProps {
  visible: boolean;
  item: ShoppingItem;
  onClose: () => void;
  onSave: (name: string, quantity: number, category: string, unit?: string, price?: number) => void;
}

const CATEGORIES = [
  { name: 'Produce', icon: Apple },
  { name: 'Dairy', icon: Egg },
  { name: 'Meat', icon: Beef },
  { name: 'Bakery', icon: Flame },
  { name: 'Frozen', icon: Snowflake },
  { name: 'Pantry', icon: Sparkles },
  { name: 'Kitchen', icon: ShoppingBag },
  { name: 'Other', icon: ShoppingBag },
];

export const EditItemModal: React.FC<EditItemModalProps> = ({
  visible,
  item,
  onClose,
  onSave,
}) => {
  const { colors, isDark } = useTheme();

  // Form states
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [unit, setUnit] = useState(item.unit || '');
  const [category, setCategory] = useState(item.category || 'Other');
  const [price, setPrice] = useState(item.price !== undefined && item.price !== null ? item.price.toString() : '');

  // Reset form states when modal opens with a new item
  useEffect(() => {
    if (visible) {
      setName(item.name);
      setQuantity(item.quantity);
      setUnit(item.unit || '');
      setCategory(item.category || 'Other');
      setPrice(item.price !== undefined && item.price !== null ? item.price.toString() : '');
    }
  }, [visible, item]);

  const handleIncrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setQuantity((prev) => prev - 1);
    }
  };

  const handleCategorySelect = (catName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategory(catName);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const parsedPrice = price.trim() ? parseFloat(price.replace(',', '.')) : undefined;
    onSave(
      name.trim(),
      quantity,
      category,
      unit.trim() || undefined,
      isNaN(parsedPrice as number) ? undefined : parsedPrice
    );
    onClose();
  };

  // Helper to fetch matching colors for category chips
  const getCategoryColors = (catName: string, isSelected: boolean) => {
    if (!isSelected) {
      return {
        bg: colors.cardSecondary,
        text: colors.textMuted,
        iconColor: colors.textMuted,
      };
    }

    const norm = catName.toLowerCase().trim();
    switch (norm) {
      case 'produce':
        return {
          bg: isDark ? '#1C3A27' : '#E6F4EA',
          text: isDark ? '#A8FAB4' : '#137333',
          iconColor: isDark ? '#A8FAB4' : '#137333',
        };
      case 'dairy':
        return {
          bg: isDark ? '#1B2E3C' : '#E8F0FE',
          text: isDark ? '#A1C2FA' : '#1A73E8',
          iconColor: isDark ? '#A1C2FA' : '#1A73E8',
        };
      case 'meat':
        return {
          bg: isDark ? '#3C1F1F' : '#FCE8E6',
          text: isDark ? '#FAD2CF' : '#C5221F',
          iconColor: isDark ? '#FAD2CF' : '#C5221F',
        };
      case 'bakery':
        return {
          bg: isDark ? '#3C2D1F' : '#FEF7E0',
          text: isDark ? '#FAD283' : '#B06000',
          iconColor: isDark ? '#FAD283' : '#B06000',
        };
      case 'frozen':
        return {
          bg: isDark ? '#1F3C3A' : '#E4F7FB',
          text: isDark ? '#A1EAF0' : '#007B83',
          iconColor: isDark ? '#A1EAF0' : '#007B83',
        };
      case 'pantry':
        return {
          bg: isDark ? '#2E1B3C' : '#F3E8FD',
          text: isDark ? '#DABAF8' : '#8824FA',
          iconColor: isDark ? '#DABAF8' : '#8824FA',
        };
      default:
        return {
          bg: colors.primary,
          text: '#FFFFFF',
          iconColor: '#FFFFFF',
        };
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                  <VibeText variant="bold" size="lg">Edit Item</VibeText>
                  <TouchableOpacity
                    onPress={onClose}
                    style={[styles.closeButton, { backgroundColor: colors.cardSecondary }]}
                  >
                    <X size={18} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <ScrollView contentContainerStyle={styles.formContainer}>
                  {/* Name Input */}
                  <VibeText variant="semibold" size="sm" style={styles.label}>
                    Item Name
                  </VibeText>
                  <VibeInput
                    value={name}
                    onChangeText={setName}
                    placeholder="E.g., Apples"
                    autoFocus={false}
                  />

                  {/* Quantity & Unit Row */}
                  <View style={styles.row}>
                    {/* Quantity Selector */}
                    <View style={styles.flexHalf}>
                      <VibeText variant="semibold" size="sm" style={styles.label}>
                        Quantity
                      </VibeText>
                      <View style={[styles.stepperContainer, { borderColor: colors.border }]}>
                        <TouchableOpacity
                          onPress={handleDecrement}
                          style={[styles.stepperButton, { backgroundColor: colors.cardSecondary }]}
                          disabled={quantity <= 1}
                        >
                          <Minus size={18} color={quantity > 1 ? colors.text : colors.textMuted} />
                        </TouchableOpacity>
                        <VibeText variant="bold" style={styles.quantityText}>
                          {quantity}
                        </VibeText>
                        <TouchableOpacity
                          onPress={handleIncrement}
                          style={[styles.stepperButton, { backgroundColor: colors.cardSecondary }]}
                        >
                          <Plus size={18} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Unit Selector */}
                    <View style={[styles.flexHalf, { marginLeft: 16 }]}>
                      <VibeText variant="semibold" size="sm" style={styles.label}>
                        Unit (Optional)
                      </VibeText>
                      <VibeInput
                        value={unit}
                        onChangeText={setUnit}
                        placeholder="E.g., bag, oz"
                      />
                    </View>
                  </View>

                  {/* Price Input Row */}
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <VibeText variant="semibold" size="sm" style={styles.label}>
                        Price (Optional)
                      </VibeText>
                      <VibeInput
                        value={price}
                        onChangeText={setPrice}
                        placeholder="E.g., 2.99"
                        keyboardType="decimal-pad"
                        leftIcon={<VibeText color="textMuted" variant="bold" style={{ fontSize: 16 }}>$</VibeText>}
                      />
                    </View>
                  </View>

                  {/* Category Chips Selector */}
                  <VibeText variant="semibold" size="sm" style={styles.label}>
                    Category
                  </VibeText>
                  <View style={styles.chipsContainer}>
                    {CATEGORIES.map((cat) => {
                      const isSelected = category === cat.name;
                      const chipColors = getCategoryColors(cat.name, isSelected);
                      const Icon = cat.icon;

                      return (
                        <TouchableOpacity
                          key={cat.name}
                          onPress={() => handleCategorySelect(cat.name)}
                          style={[
                            styles.chip,
                            { backgroundColor: chipColors.bg },
                            isSelected && styles.chipActive,
                          ]}
                        >
                          <Icon size={14} color={chipColors.iconColor} style={{ marginRight: 6 }} />
                          <VibeText
                            variant="semibold"
                            size="sm"
                            style={{ color: chipColors.text }}
                          >
                            {cat.name}
                          </VibeText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Modal Actions */}
                <View style={[styles.actionsContainer, { borderTopColor: colors.border }]}>
                  <VibeButton
                    title="Cancel"
                    variant="ghost"
                    onPress={onClose}
                    style={styles.actionButton}
                  />
                  <VibeButton
                    title="Save Changes"
                    variant="primary"
                    onPress={handleSave}
                    style={[styles.actionButton, { marginLeft: 12 }]}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    padding: 20,
  },
  label: {
    marginBottom: 8,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  flexHalf: {
    flex: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    height: 48,
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    marginHorizontal: -4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    margin: 4,
  },
  chipActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
  },
});
