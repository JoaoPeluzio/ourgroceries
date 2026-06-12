import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ShoppingBag, Apple, Egg, Beef, Flame, Snowflake, Sparkles } from 'lucide-react-native';
import { ShoppingItem } from '../types';
import { ShoppingItemRow } from './ShoppingItemRow';
import { VibeText } from './ui/Text';
import { useTheme } from '../hooks/useTheme';

interface ShoppingListSectionProps {
  items: ShoppingItem[];
  emptyMessage?: string;
  isCompletedList?: boolean;
}

export const ShoppingListSection: React.FC<ShoppingListSectionProps> = ({
  items,
  emptyMessage = "List is empty. Add items above using AI magic! ✨",
  isCompletedList = false,
}) => {
  const { colors } = useTheme();

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ShoppingBag size={48} color={colors.textMuted} strokeWidth={1.2} style={styles.emptyIcon} />
        <VibeText color="textMuted" variant="semibold" style={styles.emptyText}>
          {emptyMessage}
        </VibeText>
      </View>
    );
  }

  // 1. Group items by category
  const groupedItems: Record<string, ShoppingItem[]> = {};
  items.forEach((item) => {
    const category = item.category || 'Uncategorized';
    if (!groupedItems[category]) {
      groupedItems[category] = [];
    }
    groupedItems[category].push(item);
  });

  // Sort categories - put Uncategorized at the bottom
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  const getCategoryIcon = (category: string) => {
    const norm = category.toLowerCase();
    const size = 18;
    const color = colors.primary;
    
    switch (norm) {
      case 'produce':
      case 'fruits':
      case 'vegetables':
        return <Apple size={size} color={color} />;
      case 'dairy':
      case 'cheese':
      case 'milk':
        return <Egg size={size} color={color} />;
      case 'meat':
      case 'seafood':
        return <Beef size={size} color={color} />;
      case 'bakery':
      case 'bread':
        return <Flame size={size} color={color} />; // warm flame representing oven
      case 'frozen':
        return <Snowflake size={size} color={color} />;
      case 'pantry':
      case 'snacks':
        return <Sparkles size={size} color={color} />;
      default:
        return <ShoppingBag size={size} color={color} />;
    }
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      {sortedCategories.map((category) => {
        const categoryItems = groupedItems[category];
        return (
          <View key={category} style={styles.sectionContainer}>
            {/* Section Header */}
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              {getCategoryIcon(category)}
              <VibeText variant="bold" color="primary" style={styles.sectionTitle}>
                {category.toUpperCase()} ({categoryItems.length})
              </VibeText>
            </View>

            {/* Section Items */}
            <View style={styles.itemsList}>
              {categoryItems.map((item) => (
                <ShoppingItemRow key={item.id} item={item} isCompletedList={isCompletedList} />
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 13,
    letterSpacing: 1,
  },
  itemsList: {
    marginTop: 4,
  },
});
