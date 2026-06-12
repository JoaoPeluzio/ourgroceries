import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import { Sparkles, Plus, Check, Trash2 } from 'lucide-react-native';
import { useShoppingStore } from '../store/useShoppingStore';
import { useTheme } from '../hooks/useTheme';
import { parseNaturalLanguageInput } from '../services/ai';
import { ParsedItem } from '../types';
import { VibeText } from './ui/Text';
import { VibeInput } from './ui/Input';
import { VibeCard } from './ui/Card';
import { VibeButton } from './ui/Button';
import * as Haptics from 'expo-haptics';

const isComplexInput = (text: string): boolean => {
  const t = text.toLowerCase().trim();
  if (/\b(ingredients|recipe|make|cook|tacos|pancakes|spaghetti|salad|lasagna|cookies)\b/.test(t)) {
    return true;
  }
  if (t.includes(',') || /\b(and|plus|also)\b/.test(t)) {
    return true;
  }
  return false;
};

export const AIPromptInput: React.FC = () => {
  const { colors } = useTheme();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedItem[]>([]);
  
  const geminiApiKey = useShoppingStore((state) => state.settings.geminiApiKey);
  const addItem = useShoppingStore((state) => state.addItem);

  const isComplex = isComplexInput(input);

  const handleQuickAdd = async () => {
    if (!input.trim()) return;

    Keyboard.dismiss();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Pass empty string as API key to bypass Gemini and parse locally
      const results = await parseNaturalLanguageInput(input, '');
      results.forEach((item) => {
        addItem(item.name, item.quantity, item.unit, item.category);
      });
      setInput('');
    } catch (e) {
      console.error(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleParse = async () => {
    if (!input.trim()) return;
    
    Keyboard.dismiss();
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const results = await parseNaturalLanguageInput(input, geminiApiKey);
      if (results.length > 0) {
        setParsedPreview(results);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (e) {
      console.error(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    if (isComplex) {
      handleParse();
    } else {
      handleQuickAdd();
    }
  };

  const handleAddAll = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    parsedPreview.forEach((item) => {
      addItem(item.name, item.quantity, item.unit, item.category);
    });

    setParsedPreview([]);
    setInput('');
  };

  const handleRemovePreviewItem = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setParsedPreview((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      {/* Input Field wrapper */}
      <VibeInput
        placeholder="Type here... 'tacos, 2 gallons of milk'"
        value={input}
        onChangeText={setInput}
        onClear={() => setInput('')}
        onSubmitEditing={handleAction}
        returnKeyType="search"
        containerStyle={{
          borderColor: parsedPreview.length > 0 ? colors.primaryLight : colors.border,
        }}
        leftIcon={
          <Sparkles size={18} color={input.trim() ? colors.primary : colors.textMuted} />
        }
      />

      {/* Sparkle or Plus Action Trigger */}
      {input.trim().length > 0 && !loading && (
        <TouchableOpacity
          onPress={handleAction}
          activeOpacity={0.7}
          style={[styles.sparkleFloatingButton, { backgroundColor: colors.primary }]}
        >
          {isComplex ? (
            <Sparkles size={18} color="#FFFFFF" />
          ) : (
            <Plus size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      )}

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      )}

      {/* AI Preview Card Panel */}
      {parsedPreview.length > 0 && (
        <VibeCard style={styles.previewCard} variant="elevated">
          <View style={styles.previewHeader}>
            <View style={styles.headerTitleRow}>
              <Sparkles size={16} color={colors.primaryLight} style={{ marginRight: 6 }} />
              <VibeText variant="bold" color="primary">AI PARSE PREVIEW</VibeText>
            </View>
            <VibeText size="xs" color="textMuted">Verify items below before adding</VibeText>
          </View>

          {/* List of parsed items */}
          <View style={styles.previewList}>
            {parsedPreview.map((item, index) => (
              <View key={index} style={[styles.previewItemRow, { borderBottomColor: colors.border }]}>
                <View style={styles.previewItemDetails}>
                  <VibeText variant="bold" color="primary" style={styles.previewQty}>
                    {item.quantity}
                    {item.unit ? ` ${item.unit}` : ''}
                  </VibeText>
                  <VibeText variant="semibold" style={styles.previewName}>{item.name}</VibeText>
                  <VibeText size="xs" color="textMuted" style={styles.previewCat}>
                    ({item.category})
                  </VibeText>
                </View>

                {/* Remove from preview */}
                <TouchableOpacity
                  onPress={() => handleRemovePreviewItem(index)}
                  activeOpacity={0.6}
                  style={styles.previewRemoveBtn}
                >
                  <Trash2 size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Action Footer */}
          <View style={styles.previewActions}>
            <VibeButton
              title="Cancel"
              variant="secondary"
              size="sm"
              onPress={() => setParsedPreview([])}
              style={{ flex: 1, marginRight: 8 }}
            />
            <VibeButton
              title={`Add ${parsedPreview.length} Item${parsedPreview.length > 1 ? 's' : ''}`}
              variant="primary"
              size="sm"
              icon={<Plus size={16} color="#FFFFFF" />}
              onPress={handleAddAll}
              style={{ flex: 1.5 }}
            />
          </View>
        </VibeCard>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
    zIndex: 10,
  },
  sparkleFloatingButton: {
    position: 'absolute',
    right: 22,
    top: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    right: 28,
    top: 26,
  },
  previewCard: {
    marginTop: 12,
    borderWidth: 1.5,
  },
  previewHeader: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  previewList: {
    marginBottom: 16,
    maxHeight: 180,
  },
  previewItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  previewItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  previewQty: {
    marginRight: 6,
    fontSize: 14,
  },
  previewName: {
    fontSize: 14,
    marginRight: 6,
  },
  previewCat: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  previewRemoveBtn: {
    padding: 6,
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
