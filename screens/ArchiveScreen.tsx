import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Archive, Trash2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useShoppingStore } from '../store/useShoppingStore';
import { useTheme } from '../hooks/useTheme';
import { VibeText } from '../components/ui/Text';
import { VibeCard } from '../components/ui/Card';
import { Haptics } from '../services/haptics';

export const ArchiveScreen: React.FC = () => {
  const { colors } = useTheme();
  
  const lists = useShoppingStore((state) => state.lists);
  const items = useShoppingStore((state) => state.items);
  
  const archiveListAction = useShoppingStore((state) => state.archiveList);
  const completeListAction = useShoppingStore((state) => state.completeList);
  const deleteListAction = useShoppingStore((state) => state.deleteList);

  const [expandedListIds, setExpandedListIds] = useState<Record<string, boolean>>({});

  const archivedLists = lists.filter((l) => l.isArchived);

  const toggleExpanded = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedListIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleRestoreList = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    archiveListAction(id, false);
    completeListAction(id, false);
  };

  const handleDeletePermanently = (id: string, name: string) => {
    Alert.alert(
      'Delete Permanently',
      `Are you sure you want to permanently delete "${name}" and all its items? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            deleteListAction(id);
          },
        },
      ]
    );
  };

  const getListItems = (listId: string) => items.filter((item) => item.listId === listId);

  const calculateListTotal = (listId: string) => {
    const listItems = getListItems(listId);
    return listItems.reduce((sum, item) => {
      const price = item.price || 0;
      const quantity = item.quantity || 1;
      return sum + price * quantity;
    }, 0);
  };

  const getCategoryColors = (category: string) => {
    const norm = category.toLowerCase().trim();
    switch (norm) {
      case 'produce':
      case 'fruits':
      case 'vegetables':
        return { text: colors.success };
      case 'dairy':
      case 'cheese':
      case 'milk':
        return { text: colors.primary };
      case 'meat':
      case 'seafood':
        return { text: colors.error };
      default:
        return { text: colors.textMuted };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerInfo}>
        <VibeText variant="bold" size="xl">
          Archived Lists
        </VibeText>
        <VibeText size="sm" color="textMuted">
          View and restore your completed shopping list history
        </VibeText>
      </View>

      {archivedLists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Archive size={48} color={colors.textMuted} strokeWidth={1.2} style={styles.emptyIcon} />
          <VibeText color="textMuted" variant="semibold" style={styles.emptyText}>
            No archived lists yet. Mark a list as completed, then click "Archive List" to see it here.
          </VibeText>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {archivedLists.map((list) => {
            const isExpanded = !!expandedListIds[list.id];
            const listItems = getListItems(list.id);
            const totalCost = calculateListTotal(list.id);
            
            // Group items by category
            const grouped: Record<string, typeof items> = {};
            listItems.forEach((item) => {
              const cat = item.category || 'Uncategorized';
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(item);
            });
            const categories = Object.keys(grouped).sort((a, b) => {
              if (a === 'Uncategorized') return 1;
              if (b === 'Uncategorized') return -1;
              return a.localeCompare(b);
            });

            return (
              <VibeCard
                key={list.id}
                style={styles.archiveCard}
                variant="outlined"
              >
                {/* Collapsed Card Header */}
                <TouchableOpacity
                  onPress={() => toggleExpanded(list.id)}
                  activeOpacity={0.7}
                  style={styles.cardHeader}
                >
                  <View style={styles.headerLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.cardSecondary }]}>
                      <Archive size={20} color={colors.primary} />
                    </View>
                    <View style={styles.titleContainer}>
                      <VibeText variant="bold" size="md">
                        {list.name}
                      </VibeText>
                      {list.supermarket && (
                        <VibeText size="xs" variant="semibold" style={[styles.supermarketTag, { color: colors.primary }]}>
                          📍 {list.supermarket}
                        </VibeText>
                      )}
                      <VibeText size="xs" color="textMuted" style={{ marginTop: 2 }}>
                        {new Date(list.createdAt).toLocaleDateString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </VibeText>
                    </View>
                  </View>

                  <View style={styles.headerRight}>
                    <View style={styles.priceContainer}>
                      <VibeText size="xs" color="textMuted">Total</VibeText>
                      <VibeText variant="bold" size="md" style={{ color: colors.primary }}>
                        ${totalCost.toFixed(2)}
                      </VibeText>
                    </View>
                    {isExpanded ? (
                      <ChevronUp size={20} color={colors.textMuted} style={{ marginLeft: 8 }} />
                    ) : (
                      <ChevronDown size={20} color={colors.textMuted} style={{ marginLeft: 8 }} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Expanded Card Body */}
                {isExpanded && (
                  <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
                    {listItems.length === 0 ? (
                      <VibeText color="textMuted" style={styles.emptyItemsText}>
                        No items in this list.
                      </VibeText>
                    ) : (
                      categories.map((category) => {
                        const catItems = grouped[category];
                        const catColors = getCategoryColors(category);
                        return (
                          <View key={category} style={styles.categorySection}>
                            <VibeText variant="bold" size="xs" style={[styles.categoryTitle, { color: catColors.text }]}>
                              {category.toUpperCase()}
                            </VibeText>
                            {catItems.map((item) => (
                              <View key={item.id} style={styles.itemRow}>
                                <VibeText
                                  style={[
                                    styles.itemText,
                                    item.completed && styles.lineThrough,
                                    { color: item.completed ? colors.textMuted : colors.text }
                                  ]}
                                  numberOfLines={1}
                                >
                                  {item.quantity}
                                  {item.unit ? ` ${item.unit}` : ''} x {item.name}
                                </VibeText>
                                {item.price !== undefined && item.price !== null && item.price > 0 && (
                                  <VibeText size="sm" color={item.completed ? 'textMuted' : 'text'}>
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </VibeText>
                                )}
                              </View>
                            ))}
                          </View>
                        );
                      })
                    )}

                    {/* Action buttons */}
                    <View style={[styles.btnRow, { borderTopColor: colors.border }]}>
                      <TouchableOpacity
                        onPress={() => handleRestoreList(list.id)}
                        activeOpacity={0.7}
                        style={[
                          styles.outlineBtn,
                          { borderColor: colors.primary, marginRight: 8 }
                        ]}
                      >
                        <RotateCcw size={14} color={colors.primary} style={{ marginRight: 8 }} />
                        <VibeText variant="semibold" size="sm" style={{ color: colors.primary }}>
                          Restore List
                        </VibeText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeletePermanently(list.id, list.name)}
                        activeOpacity={0.7}
                        style={[
                          styles.outlineBtn,
                          { borderColor: colors.error }
                        ]}
                      >
                        <Trash2 size={14} color={colors.error} style={{ marginRight: 8 }} />
                        <VibeText variant="semibold" size="sm" style={{ color: colors.error }}>
                          Delete Permanently
                        </VibeText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </VibeCard>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  archiveCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  supermarketTag: {
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginRight: 4,
  },
  cardBody: {
    borderTopWidth: 1,
    padding: 16,
  },
  emptyItemsText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryTitle: {
    letterSpacing: 1,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemText: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  lineThrough: {
    textDecorationLine: 'line-through',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 10,
  },
});
