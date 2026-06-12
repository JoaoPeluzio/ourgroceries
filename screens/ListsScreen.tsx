import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { ShoppingCart, Lightbulb, List, Plus, Trash2, X } from 'lucide-react-native';
import { useShoppingStore } from '../store/useShoppingStore';
import { useTheme } from '../hooks/useTheme';
import { VibeText } from '../components/ui/Text';
import { VibeCard } from '../components/ui/Card';
import { VibeInput } from '../components/ui/Input';
import { VibeButton } from '../components/ui/Button';
import { AIPromptInput } from '../components/AIPromptInput';
import { SuggestionsBar } from '../components/SuggestionsBar';
import { ShoppingListSection } from '../components/ShoppingListSection';
import * as Haptics from 'expo-haptics';

export const ListsScreen: React.FC = () => {
  const { colors } = useTheme();
  
  const lists = useShoppingStore((state) => state.lists);
  const items = useShoppingStore((state) => state.items);
  const activeListId = useShoppingStore((state) => state.activeListId);
  const profile = useShoppingStore((state) => state.profile);
  
  const setActiveListId = useShoppingStore((state) => state.setActiveListId);
  const addList = useShoppingStore((state) => state.addList);
  const deleteList = useShoppingStore((state) => state.deleteList);
  const resetList = useShoppingStore((state) => state.resetList);
  const clearCompletedItems = useShoppingStore((state) => state.clearCompletedItems);
  const settings = useShoppingStore((state) => state.settings);

 
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListSupermarket, setNewListSupermarket] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'partner'>('all');

  const activeList = lists.find((l) => l.id === activeListId && !l.isArchived) || lists.find((l) => !l.isArchived);
  const activeItems = activeList ? items.filter((item) => item.listId === activeList.id) : [];
  const completedCount = activeList ? items.filter((item) => item.listId === activeList.id && item.completed).length : 0;

  const currentUserRole = profile?.role || settings.currentUserRole || 'husband';
  const partnerRole = currentUserRole === 'husband' ? 'wife' : 'husband';

  const filteredItems = activeItems.filter((item) => {
    if (activeFilter === 'mine') return item.assignedTo === currentUserRole;
    if (activeFilter === 'partner') return item.assignedTo === partnerRole;
    return true;
  });

  const pricedItems = filteredItems.filter((item) => item.price !== undefined && item.price !== null && item.price > 0);
  const pricedItemsCount = pricedItems.length;
  const totalPrice = pricedItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Pick an icon based on name
    let icon = 'list';
    const nameLower = newListName.toLowerCase();
    if (nameLower.includes('grocery') || nameLower.includes('food') || nameLower.includes('cart')) {
      icon = 'shopping-cart';
    } else if (nameLower.includes('idea') || nameLower.includes('thought') || nameLower.includes('wish')) {
      icon = 'lightbulb';
    }

    const created = addList(newListName.trim(), icon, newListSupermarket.trim() || undefined);
    setActiveListId(created.id);
    setNewListName('');
    setNewListSupermarket('');
    setIsAddingList(false);
  };

  const handleDeleteActiveList = () => {
    if (!activeList) return;
    const activeLists = lists.filter((l) => !l.isArchived);
    const isLastList = activeLists.length <= 1;

    if (isLastList) {
      Alert.alert(
        'Delete or Reset List',
        `This is your last active shopping list. Do you want to delete "${activeList.name}" entirely, or reset it (clear all items and rename to "Groceries")?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset List',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              resetList(activeList.id);
            },
          },
          {
            text: 'Delete Entirely',
            style: 'destructive',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              deleteList(activeList.id);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Delete List',
        `Are you sure you want to delete "${activeList.name}" and all its items? This syncs immediately.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              deleteList(activeList.id);
            },
          },
        ]
      );
    }
  };

  const getListIcon = (iconName?: string, active?: boolean) => {
    const size = 20;
    const color = active ? '#FFFFFF' : colors.primary;
    if (iconName === 'shopping-cart') return <ShoppingCart size={size} color={color} />;
    if (iconName === 'lightbulb') return <Lightbulb size={size} color={color} />;
    return <List size={size} color={color} />;
  };

  return (
    <View style={styles.container}>
      {/* Top Profile Header */}
      <View style={styles.headerProfileRow}>
        <View style={styles.userInfo}>
          <VibeText variant="bold" size="lg" style={{ color: colors.primary }}>
            VibeCart
          </VibeText>
          <VibeText size="xs" color="textMuted">
            {profile?.role === 'husband' ? 'Husband' : profile?.role === 'wife' ? 'Wife' : 'Member'} • {profile?.name || settings.userName}
          </VibeText>
        </View>
        
        <View style={styles.avatarContainer}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: profile?.role === 'wife' ? '#FF6B8B' : '#820AD1' }]}>
              <VibeText variant="bold" style={styles.avatarText}>
                {(profile?.name || settings.userName || 'H').charAt(0).toUpperCase()}
              </VibeText>
            </View>
          )}
        </View>
      </View>

      {/* 1. Horizontal List Card Selector */}
      <View style={styles.selectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorScroll}
        >
          {lists.filter((l) => !l.isArchived).map((list) => {
            const isActive = list.id === activeListId;
            const listItemsCount = items.filter((item) => item.listId === list.id && !item.completed).length;

            return (
              <VibeCard
                key={list.id}
                onPress={() => setActiveListId(list.id)}
                style={[
                  styles.listCard,
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                variant={isActive ? 'flat' : 'outlined'}
              >
                <View style={styles.cardContent}>
                  {getListIcon(list.icon, isActive)}
                  <VibeText
                    variant="bold"
                    style={[styles.listName, isActive && { color: '#FFFFFF' }]}
                    numberOfLines={1}
                  >
                    {list.name}
                  </VibeText>
                  {isActive ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteActiveList();
                      }}
                      style={styles.deleteCardBtn}
                    >
                      <X size={12} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={[
                        styles.countBadge,
                        { backgroundColor: colors.cardSecondary },
                      ]}
                    >
                      <VibeText
                        variant="bold"
                        size="xs"
                        style={{ color: colors.primary, fontSize: 11 }}
                      >
                        {listItemsCount}
                      </VibeText>
                    </View>
                  )}
                </View>
              </VibeCard>
            );
          })}

          {/* Plus button to add inline */}
          {!isAddingList ? (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsAddingList(true);
              }}
              style={[styles.addListBtn, { borderColor: colors.border }]}
            >
              <Plus size={20} color={colors.textMuted} />
              <VibeText color="textMuted" variant="semibold" size="sm" style={{ marginLeft: 6 }}>
                List
              </VibeText>
            </TouchableOpacity>
          ) : (
            <View style={[styles.inlineAddContainer, { borderColor: colors.border }]}>
              <VibeInput
                placeholder="Name"
                value={newListName}
                onChangeText={setNewListName}
                containerStyle={{ width: 100, height: 38, borderWidth: 0, paddingHorizontal: 0, backgroundColor: 'transparent' }}
                autoFocus
              />
              <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 8 }} />
              <VibeInput
                placeholder="Supermarket (opt)"
                value={newListSupermarket}
                onChangeText={setNewListSupermarket}
                onSubmitEditing={handleCreateList}
                containerStyle={{ width: 140, height: 38, borderWidth: 0, paddingHorizontal: 0, backgroundColor: 'transparent' }}
              />
              <VibeButton title="Save" variant="primary" size="sm" onPress={handleCreateList} style={styles.saveBtn} />
              <VibeButton
                title="Cancel"
                variant="ghost"
                size="sm"
                onPress={() => {
                  setIsAddingList(false);
                  setNewListName('');
                  setNewListSupermarket('');
                }}
              />
            </View>
          )}
        </ScrollView>
      </View>

      {/* 2. Natural Language Input */}
      <AIPromptInput />

      {/* Suggestions Bar */}
      <SuggestionsBar />

      {/* 3. Category Categorized Shopping List */}
      <View style={styles.listContainer}>
        {activeList && (
          <View style={styles.listHeaderRow}>
            <View style={styles.titleWithCount}>
              <VibeText variant="bold" size="xl">
                {activeList.name}
              </VibeText>
              {activeList.supermarket && (
                <VibeText variant="bold" size="sm" style={{ color: colors.primary, marginTop: 2 }}>
                  📍 Buy at: {activeList.supermarket}
                </VibeText>
              )}
              <VibeText size="xs" color="textMuted" style={{ marginTop: 2 }}>
                Created on {new Date(activeList.createdAt).toLocaleDateString([], {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </VibeText>
              {activeItems.length > 0 && (
                <VibeText size="xs" color="textMuted" style={styles.completedCountText}>
                  ({completedCount} of {activeItems.length} items checked)
                </VibeText>
              )}
            </View>
          </View>
        )}

        {/* Custom Segmented Control */}
        {activeList && (
          <View style={[styles.filterBar, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFilter('all');
              }}
              style={[styles.tab, activeFilter === 'all' && { backgroundColor: colors.primary }]}
            >
              <VibeText
                variant="bold"
                style={[styles.tabText, { color: activeFilter === 'all' ? '#FFFFFF' : colors.textMuted }]}
              >
                All Items
              </VibeText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFilter('mine');
              }}
              style={[styles.tab, activeFilter === 'mine' && { backgroundColor: colors.primary }]}
            >
              <VibeText
                variant="bold"
                style={[styles.tabText, { color: activeFilter === 'mine' ? '#FFFFFF' : colors.textMuted }]}
              >
                {settings.userName}'s Cart
              </VibeText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFilter('partner');
              }}
              style={[styles.tab, activeFilter === 'partner' && { backgroundColor: colors.primary }]}
            >
              <VibeText
                variant="bold"
                style={[styles.tabText, { color: activeFilter === 'partner' ? '#FFFFFF' : colors.textMuted }]}
              >
                {settings.partnerName}'s Cart
              </VibeText>
            </TouchableOpacity>
          </View>
        )}

        <ShoppingListSection
          items={filteredItems}
          isCompletedList={activeList?.isCompleted}
          emptyMessage={
            lists.filter((l) => !l.isArchived).length === 0
              ? "You don't have any active lists. Create one at the top to start shopping! 🛒"
              : "List is empty. Add items above using AI magic! ✨"
          }
        />

        {/* Total Price Sticky Banner */}
        {totalPrice > 0 && (
          <View style={[styles.totalPriceBanner, { backgroundColor: colors.cardSecondary, borderTopColor: colors.border, borderBottomColor: colors.border }]}>
            <VibeText variant="semibold" size="sm" color="textMuted">
              Cart Total ({pricedItemsCount} item{pricedItemsCount > 1 ? 's' : ''})
            </VibeText>
            <VibeText variant="bold" size="md" style={{ color: colors.primary }}>
              ${totalPrice.toFixed(2)}
            </VibeText>
          </View>
        )}
      </View>

      {/* 4. Complete / Edit / Archive Footer */}
      {activeList && (
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {activeList.isCompleted ? (
            <View style={styles.footerRow}>
              <VibeButton
                title="Edit List"
                variant="outline"
                size="md"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  useShoppingStore.getState().completeList(activeList.id, false);
                }}
                style={{ flex: 1, marginRight: 8 }}
              />
              <VibeButton
                title="Archive List"
                variant="primary"
                size="md"
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  useShoppingStore.getState().archiveList(activeList.id, true);
                }}
                style={{ flex: 1, backgroundColor: colors.success }}
              />
            </View>
          ) : (
            <VibeButton
              title="Complete List"
              variant="primary"
              size="md"
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                useShoppingStore.getState().completeList(activeList.id, true);
              }}
              style={{ width: '100%' }}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectorContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  selectorScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  listCard: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    minWidth: 120,
    justifyContent: 'center',
    height: 48,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listName: {
    marginLeft: 8,
    marginRight: 6,
    fontSize: 14,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  addListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    marginRight: 10,
  },
  inlineAddContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 8,
    paddingRight: 4,
    height: 48,
    marginRight: 10,
  },
  inlineInput: {
    width: 140,
    height: 38,
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  saveBtn: {
    height: 38,
    paddingHorizontal: 12,
    marginLeft: 6,
  },
  listContainer: {
    flex: 1,
    marginTop: 8,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  titleWithCount: {
    flex: 1,
  },
  completedCountText: {
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 8,
  },
  headerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  userInfo: {
    flexDirection: 'column',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  deleteCardBtn: {
    marginLeft: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  totalPriceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
});
