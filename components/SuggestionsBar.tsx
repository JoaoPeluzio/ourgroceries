import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Haptics } from '../services/haptics';
import { useShoppingStore } from '../store/useShoppingStore';
import { useTheme } from '../hooks/useTheme';
import { VibeText } from './ui/Text';
import { parseNaturalLanguageInput } from '../services/ai';

const DEFAULTS = [
  'Milk',
  'Eggs',
  'Bread',
  'Bananas',
  'Butter',
  'Cheese',
  'Apples',
  'Coffee',
  'Yogurt',
  'Tomatoes',
];

export const SuggestionsBar: React.FC = () => {
  const { colors } = useTheme();
  
  const items = useShoppingStore((state) => state.items);
  const addItem = useShoppingStore((state) => state.addItem);

  // 1. Calculate suggestions based on frequency of completed items
  const completedItems = items.filter((i) => i.completed);
  
  const frequencyMap: Record<string, number> = {};
  completedItems.forEach((item) => {
    const cleanName = item.name.trim();
    if (cleanName) {
      frequencyMap[cleanName] = (frequencyMap[cleanName] || 0) + 1;
    }
  });

  // Sort by frequency descending
  const sortedHistory = Object.keys(frequencyMap).sort(
    (a, b) => frequencyMap[b] - frequencyMap[a]
  );

  // Combine history + defaults, filter out duplicates, limit to top 10
  const suggestions = [
    ...sortedHistory,
    ...DEFAULTS,
  ]
    .filter((value, index, self) => self.indexOf(value) === index)
    .slice(0, 10);

  const handleSuggestionPress = async (name: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    try {
      // Use offline parser to resolve category & capitalization instantly
      const parsed = await parseNaturalLanguageInput(name, '');
      if (parsed.length > 0) {
        const parsedItem = parsed[0];
        addItem(
          parsedItem.name,
          parsedItem.quantity,
          parsedItem.unit,
          parsedItem.category
        );
      } else {
        addItem(name, 1, undefined, 'Other');
      }
    } catch (error) {
      console.error('Error adding suggestion:', error);
      addItem(name, 1, undefined, 'Other');
    }
  };

  return (
    <View style={styles.container}>
      <VibeText variant="bold" color="textMuted" size="xs" style={styles.title}>
        QUICK ADD SUGGESTIONS
      </VibeText>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((suggestion) => (
          <TouchableOpacity
            key={suggestion}
            onPress={() => handleSuggestionPress(suggestion)}
            activeOpacity={0.7}
            style={[
              styles.chip,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Plus size={12} color={colors.primary} style={styles.plusIcon} />
            <VibeText variant="semibold" size="sm" style={styles.chipText}>
              {suggestion}
            </VibeText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    marginBottom: 8,
  },
  title: {
    paddingHorizontal: 16,
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 2,
    elevation: 0.5,
  },
  plusIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 13,
  },
});
