import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingItem, ShoppingList, AppSettings, UserProfile } from '../types';
import { supabase } from '../services/supabase';
import { notifyPartner } from '../services/notifications';
import { User } from '@supabase/supabase-js';
import { Alert } from 'react-native';


// Simple fallback UUID generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface ShoppingState {
  lists: ShoppingList[];
  items: ShoppingItem[];
  activeListId: string | null;
  settings: AppSettings;
  
  // Auth state
  sessionUser: User | null;
  profile: UserProfile | null;
  
  // Actions
  addList: (name: string, icon?: string, supermarket?: string) => ShoppingList;
  deleteList: (id: string) => void;
  resetList: (id: string) => void;
  completeList: (id: string, isCompleted: boolean) => void;
  archiveList: (id: string, isArchived: boolean) => void;
  setActiveListId: (id: string | null) => void;
  
  addItem: (name: string, quantity: number, unit?: string, category?: string, price?: number) => ShoppingItem | null;
  toggleItemCompleted: (id: string) => void;
  deleteItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<Omit<ShoppingItem, 'id' | 'listId' | 'createdAt' | 'createdBy'>>) => void;
  clearCompletedItems: (listId: string) => void;
  
  assignItem: (id: string, assignedTo: 'husband' | 'wife' | 'member' | 'unassigned') => void;
  autoSplitItems: (listId: string) => void;
  
  updateSettings: (settings: Partial<AppSettings>) => void;
  toggleTheme: () => void;
  
  // Auth actions
  setSessionUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  signOut: () => Promise<void>;
  
  // Sync Actions
  setListsFromRemote: (lists: ShoppingList[]) => void;
  setItemsFromRemote: (items: ShoppingItem[]) => void;
  upsertItemFromRemote: (item: ShoppingItem) => void;
  deleteItemFromRemote: (id: string) => void;
  upsertListFromRemote: (list: ShoppingList) => void;
  deleteListFromRemote: (id: string) => void;
}

const defaultLists: ShoppingList[] = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Groceries', createdAt: new Date().toISOString(), icon: 'shopping-cart' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Future Ideas', createdAt: new Date().toISOString(), icon: 'lightbulb' },
];

const defaultItems: ShoppingItem[] = [
  {
    id: '00000000-0000-0000-0000-000000000011',
    listId: '00000000-0000-0000-0000-000000000001',
    name: 'Avocados',
    quantity: 3,
    category: 'Produce',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    listId: '00000000-0000-0000-0000-000000000001',
    name: 'Whole Milk',
    quantity: 1,
    unit: 'gallon',
    category: 'Dairy',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000013',
    listId: '00000000-0000-0000-0000-000000000001',
    name: 'Sourdough Bread',
    quantity: 1,
    unit: 'loaf',
    category: 'Bakery',
    completed: true,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    completedBy: 'Husband',
  },
  {
    id: '00000000-0000-0000-0000-000000000014',
    listId: '00000000-0000-0000-0000-000000000002',
    name: 'Espresso Machine',
    quantity: 1,
    category: 'Kitchen',
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

const defaultSettings: AppSettings = {
  theme: 'dark',
  userName: 'Husband',
  partnerName: 'Wife',
  currentUserRole: undefined,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  isSyncEnabled: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
};

export const useShoppingStore = create<ShoppingState>()(
  persist(
    (set, get) => ({
      lists: defaultLists,
      items: defaultItems,
      activeListId: '00000000-0000-0000-0000-000000000001',
      settings: defaultSettings,
      sessionUser: null,
      profile: null,

      addList: (name, icon, supermarket) => {
        const newList: ShoppingList = {
          id: generateUUID(),
          name,
          createdAt: new Date().toISOString(),
          icon: icon || 'list',
          isCompleted: false,
          isArchived: false,
          supermarket,
        };

        set((state) => ({
          lists: [...state.lists, newList],
        }));

        // Push to Supabase if sync is active and authenticated profile is loaded
        const { settings, profile } = get();
        if (settings.isSyncEnabled && supabase && profile?.householdId) {
          const insertData: any = {
            id: newList.id,
            name: newList.name,
            created_at: newList.createdAt,
            icon: newList.icon,
            household_id: profile.householdId,
            is_completed: newList.isCompleted,
            is_archived: newList.isArchived,
            supermarket: newList.supermarket || null,
          };
          supabase
            .from('shopping_lists')
            .insert(insertData)
            .then(({ error }: any) => {
              if (error) console.error('Error syncing list insertion:', error.message);
            });
        }

        return newList;
      },

      deleteList: (id) => {
        set((state) => {
          const nextLists = state.lists.filter((l) => l.id !== id);
          const nextActiveList = state.activeListId === id 
            ? (nextLists[0]?.id || null) 
            : state.activeListId;

          return {
            lists: nextLists,
            items: state.items.filter((i) => i.listId !== id),
            activeListId: nextActiveList,
          };
        });

        // Delete from Supabase if sync is active and authenticated profile is loaded
        const { settings, profile } = get();
        if (settings.isSyncEnabled && supabase && profile?.householdId) {
          supabase
            .from('shopping_lists')
            .delete()
            .eq('id', id)
            .then(({ error }: any) => {
              if (error) console.error('Error syncing list deletion:', error.message);
            });
        }
      },

      resetList: (id) => {
        set((state) => {
          const updatedLists = state.lists.map((list) => {
            if (list.id === id) {
              return {
                ...list,
                name: 'Groceries',
                icon: 'shopping-cart',
              };
            }
            return list;
          });

          return {
            lists: updatedLists,
            items: state.items.filter((item) => item.listId !== id),
          };
        });

        // Sync with Supabase if sync is active and authenticated profile is loaded
        const { settings, profile } = get();
        if (settings.isSyncEnabled && supabase && profile?.householdId) {
          // 1. Delete all items belonging to this list
          supabase
            .from('shopping_items')
            .delete()
            .eq('list_id', id)
            .then(({ error }: any) => {
              if (error) console.error('Error syncing reset list items deletion:', error.message);
            });

          // 2. Update list name and icon
          supabase
            .from('shopping_lists')
            .update({
              name: 'Groceries',
              icon: 'shopping-cart',
            })
            .eq('id', id)
            .then(({ error }: any) => {
              if (error) console.error('Error syncing reset list rename:', error.message);
            });
        }
      },

      completeList: (id, isCompleted) => {
        set((state) => {
          const updatedLists = state.lists.map((list) => {
            if (list.id === id) {
              return { ...list, isCompleted };
            }
            return list;
          });
          return { lists: updatedLists };
        });

        // Sync with Supabase if active
        const { settings, profile } = get();
        if (settings.isSyncEnabled && supabase && profile?.householdId) {
          supabase
            .from('shopping_lists')
            .update({ is_completed: isCompleted })
            .eq('id', id)
            .then(({ error }: any) => {
              if (error) console.error('Error syncing list completion:', error.message);
            });
        }
      },

      archiveList: (id, isArchived) => {
        set((state) => {
          const updatedLists = state.lists.map((list) => {
            if (list.id === id) {
              return { ...list, isArchived };
            }
            return list;
          });
          
          let nextActiveListId = state.activeListId;
          if (isArchived && state.activeListId === id) {
            const remainingLists = updatedLists.filter((l) => !l.isArchived);
            nextActiveListId = remainingLists[0]?.id || null;
          }

          return {
            lists: updatedLists,
            activeListId: nextActiveListId,
          };
        });

        // Sync with Supabase if active
        const { settings, profile } = get();
        if (settings.isSyncEnabled && supabase && profile?.householdId) {
          supabase
            .from('shopping_lists')
            .update({ is_archived: isArchived })
            .eq('id', id)
            .then(({ error }: any) => {
              if (error) console.error('Error syncing list archiving:', error.message);
            });
        }
      },

      setActiveListId: (id) => set({ activeListId: id }),

      addItem: (name, quantity, unit, category = 'Uncategorized', price) => {
        const state = get();
        
        // 1. Check if active lists are empty
        const activeLists = state.lists.filter((l) => !l.isArchived);
        if (activeLists.length === 0) {
          Alert.alert(
            'Create a List First',
            'You don\'t have any active shopping lists yet. Please create a list first (e.g. using the "+ List" button at the top) before adding items.'
          );
          return null;
        }

        const activeListId = activeLists.find((l) => l.id === state.activeListId)?.id
          || activeLists[0]?.id;

        // Auto-assign to current role
        const defaultAssignee = state.settings.currentUserRole || 'unassigned';

        // 2. Check if the item already exists in the target list (uncompleted, same name)
        const existingItem = state.items.find(
          (item) =>
            item.listId === activeListId &&
            item.name.toLowerCase().trim() === name.toLowerCase().trim() &&
            !item.completed
        );

        if (existingItem) {
          const updatedQty = existingItem.quantity + quantity;
          const updatedItem = {
            ...existingItem,
            quantity: updatedQty,
            unit: existingItem.unit || unit, // Keep existing unit, or take new if none
            price: existingItem.price || price,
          };

          set((state) => ({
            items: state.items.map((item) =>
              item.id === existingItem.id ? updatedItem : item
            ),
          }));

          // Push to Supabase if sync is active and authenticated profile is loaded
          const { settings, profile } = get();
          if (settings.isSyncEnabled && supabase && profile?.householdId) {
            supabase
              .from('shopping_items')
              .update({
                quantity: updatedQty,
                unit: updatedItem.unit,
                price: updatedItem.price,
              })
              .eq('id', existingItem.id)
              .then(({ error }: any) => {
                if (error) console.error('Error syncing item quantity update:', error.message);
              });
          }

          // Notify partner if the current role is configured
          if (settings.currentUserRole) {
            const partnerRole = settings.currentUserRole === 'husband' ? 'wife' : 'husband';
            const qtyText = quantity > 1 ? `${quantity} more ` : 'another ';
            const unitText = unit ? `${unit} of ` : '';
            const itemNameFormatted = `${qtyText}${unitText}${name}`;
            notifyPartner(partnerRole, `${settings.userName} added ${itemNameFormatted} (Total: ${updatedQty})`);
          }

          return updatedItem;
        }

        // Otherwise, add a new item
        const newItem: ShoppingItem = {
          id: generateUUID(),
          listId: activeListId,
          name,
          quantity,
          unit,
          category,
          completed: false,
          createdAt: new Date().toISOString(),
          createdBy: state.settings.userName,
          assignedTo: defaultAssignee,
          price,
        };

        set((state) => ({
          items: [newItem, ...state.items],
        }));

        // Push to Supabase if sync is active and authenticated profile is loaded
        const { settings, profile } = get();
        if (settings.isSyncEnabled && supabase && profile?.householdId) {
          const insertData: any = {
            id: newItem.id,
            list_id: newItem.listId,
            name: newItem.name,
            quantity: newItem.quantity,
            unit: newItem.unit,
            category: newItem.category,
            completed: newItem.completed,
            created_at: newItem.createdAt,
            created_by: newItem.createdBy,
            assigned_to: defaultAssignee,
            household_id: profile.householdId,
            price: newItem.price,
          };
          supabase
            .from('shopping_items')
            .insert(insertData)
            .then(({ error }: any) => {
              if (error) console.error('Error syncing item insertion:', error.message);
            });
        }

        // Notify partner if the current role is configured
        if (state.settings.currentUserRole) {
          const partnerRole = state.settings.currentUserRole === 'husband' ? 'wife' : 'husband';
          const qtyText = quantity > 1 ? `${quantity} ` : '';
          const unitText = unit ? `${unit} of ` : '';
          const itemNameFormatted = `${qtyText}${unitText}${name}`;
          notifyPartner(partnerRole, `${state.settings.userName} has added: ${itemNameFormatted}`);
        }

        return newItem;
      },

      toggleItemCompleted: (id) => {
        const userName = get().settings.userName;
        let updatedItem: ShoppingItem | undefined;

        set((state) => {
          const updatedItems = state.items.map((item) => {
            if (item.id === id) {
              const completed = !item.completed;
              updatedItem = {
                ...item,
                completed,
                completedAt: completed ? new Date().toISOString() : undefined,
                completedBy: completed ? userName : undefined,
              };
              return updatedItem;
            }
            return item;
          });
          return { items: updatedItems };
        });

        // Push update to Supabase if sync is active and authenticated profile is loaded
        const { settings, profile } = get();
        if (settings.isSyncEnabled && supabase && profile?.householdId && updatedItem) {
          supabase
            .from('shopping_items')
            .update({
              completed: updatedItem.completed,
              completed_at: updatedItem.completedAt || null,
              completed_by: updatedItem.completedBy || null,
            })
            .eq('id', id)
            .then(({ error }: any) => {
              if (error) console.error('Error syncing item toggle:', error.message);
            });
        }
      },

      deleteItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));

        // Delete from Supabase if sync is active and authenticated profile is loaded
        const { settings, profile } = get();
        if (settings.isSyncEnabled && supabase && profile?.householdId) {
          supabase
            .from('shopping_items')
            .delete()
            .eq('id', id)
            .then(({ error }: any) => {
              if (error) console.error('Error syncing item deletion:', error.message);
            });
        }
      },

      updateItem: (id, updates) => {
        let updatedItem: ShoppingItem | undefined;

        set((state) => {
          const updatedItems = state.items.map((item) => {
            if (item.id === id) {
              updatedItem = { ...item, ...updates };
              return updatedItem;
            }
            return item;
          });
          return { items: updatedItems };
        });

        // Push update to Supabase if sync is active and authenticated profile is loaded
        const { settings, profile } = get();
        if (settings.isSyncEnabled && supabase && profile?.householdId && updatedItem) {
          supabase
            .from('shopping_items')
            .update({
              name: updatedItem.name,
              quantity: updatedItem.quantity,
              unit: updatedItem.unit || null,
              category: updatedItem.category,
              completed: updatedItem.completed,
              completed_at: updatedItem.completedAt || null,
              completed_by: updatedItem.completedBy || null,
              assigned_to: updatedItem.assignedTo || 'unassigned',
              price: updatedItem.price !== undefined ? updatedItem.price : null,
            })
            .eq('id', id)
            .then(({ error }: any) => {
              if (error) console.error('Error syncing item update:', error.message);
            });
        }
      },

      clearCompletedItems: (listId) => {
        const itemsToDelete = get().items.filter(
          (item) => item.listId === listId && item.completed
        );

        set((state) => ({
          items: state.items.filter((item) => !(item.listId === listId && item.completed)),
        }));

        // Sync deletion in batch if sync is active and authenticated profile is loaded
        const { settings, profile } = get();
        if (settings.isSyncEnabled && supabase && profile?.householdId && itemsToDelete.length > 0) {
          const ids = itemsToDelete.map((i) => i.id);
          supabase
            .from('shopping_items')
            .delete()
            .in('id', ids)
            .then(({ error }: any) => {
              if (error) console.error('Error syncing batch deletion:', error.message);
            });
        }
      },

      assignItem: (id, assignedTo) => {
        let updatedItem: ShoppingItem | undefined;
        set((state) => {
          const updatedItems = state.items.map((item) => {
            if (item.id === id) {
              updatedItem = { ...item, assignedTo };
              return updatedItem;
            }
            return item;
          });
          return { items: updatedItems };
        });

        const { settings, profile } = get();
        if (settings.isSyncEnabled && supabase && profile?.householdId && updatedItem) {
          supabase
            .from('shopping_items')
            .update({ assigned_to: assignedTo })
            .eq('id', id)
            .then(({ error }: any) => {
              if (error) console.error('Error syncing assignment:', error.message);
            });
        }
      },

      autoSplitItems: (listId) => {
        const categoryMap: Record<string, 'husband' | 'wife' | 'unassigned'> = {
          'produce': 'wife',
          'bakery': 'wife',
          'dairy': 'wife',
          'meat': 'husband',
          'frozen': 'husband',
          'pantry': 'husband',
        };

        set((state) => {
          const updatedItems = state.items.map((item) => {
            if (item.listId === listId && !item.completed) {
              const cat = item.category.toLowerCase().trim();
              const assignedTo = categoryMap[cat] || 'unassigned';

              const { settings, profile } = get();
              if (settings.isSyncEnabled && supabase && profile?.householdId) {
                supabase
                  .from('shopping_items')
                  .update({ assigned_to: assignedTo })
                  .eq('id', item.id)
                  .then(({ error }: any) => {
                    if (error) console.error('Error syncing auto-split item:', error.message);
                  });
              }

              return { ...item, assignedTo };
            }
            return item;
          });
          return { items: updatedItems };
        });
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      toggleTheme: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            theme: state.settings.theme === 'light' ? 'dark' : 'light',
          },
        }));
      },

      setSessionUser: (sessionUser) => set({ sessionUser }),
      setProfile: (profile) => set({ profile }),
      signOut: async () => {
        if (supabase) {
          await supabase.auth.signOut();
        }
        set({
          sessionUser: null,
          profile: null,
          lists: defaultLists,
          items: defaultItems,
          activeListId: '00000000-0000-0000-0000-000000000001',
        });
      },

      // Remote syncing state updates
      setListsFromRemote: (lists) => {
        set((state) => {
          const nextActiveList = state.activeListId && lists.some((l) => l.id === state.activeListId)
            ? state.activeListId
            : (lists[0]?.id || null);
          return { lists, activeListId: nextActiveList };
        });
      },
      setItemsFromRemote: (items) => set({ items }),
      
      upsertItemFromRemote: (newItem) => {
        set((state) => {
          const index = state.items.findIndex((item) => item.id === newItem.id);
          if (index > -1) {
            const updatedItems = [...state.items];
            updatedItems[index] = newItem;
            return { items: updatedItems };
          } else {
            return { items: [newItem, ...state.items] };
          }
        });
      },

      deleteItemFromRemote: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      upsertListFromRemote: (newList) => {
        set((state) => {
          const index = state.lists.findIndex((l) => l.id === newList.id);
          if (index > -1) {
            const updatedLists = [...state.lists];
            updatedLists[index] = newList;
            return { lists: updatedLists };
          } else {
            return { lists: [...state.lists, newList] };
          }
        });
      },

      deleteListFromRemote: (id) => {
        set((state) => {
          const nextLists = state.lists.filter((l) => l.id !== id);
          const nextActiveList = state.activeListId === id 
            ? (nextLists[0]?.id || null) 
            : state.activeListId;

          return {
            lists: nextLists,
            items: state.items.filter((i) => i.listId !== id),
            activeListId: nextActiveList,
          };
        });
      },
    }),
    {
      name: 'vibecart-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (!persistedState) return persistedState;

        const isUUID = (str: string) => {
          return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        };

        const generateUUID = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        };

        if (version < 2) {
          const idMap: { [key: string]: string } = {
            'list-groceries': '00000000-0000-0000-0000-000000000001',
            'list-ideas': '00000000-0000-0000-0000-000000000002',
            'item-1': '00000000-0000-0000-0000-000000000011',
            'item-2': '00000000-0000-0000-0000-000000000012',
            'item-3': '00000000-0000-0000-0000-000000000013',
            'item-4': '00000000-0000-0000-0000-000000000014',
          };

          // 1. Map list IDs
          if (persistedState.lists) {
            persistedState.lists = persistedState.lists.map((list: any) => {
              let newId = list.id;
              if (idMap[list.id]) {
                newId = idMap[list.id];
              } else if (!isUUID(list.id)) {
                newId = generateUUID();
                idMap[list.id] = newId;
              }
              return { ...list, id: newId };
            });
          }

          // 2. Map item IDs and listId references
          if (persistedState.items) {
            persistedState.items = persistedState.items.map((item: any) => {
              let newId = item.id;
              if (idMap[item.id]) {
                newId = idMap[item.id];
              } else if (!isUUID(item.id)) {
                newId = generateUUID();
                idMap[item.id] = newId;
              }

              let newListId = item.listId;
              if (idMap[item.listId]) {
                newListId = idMap[item.listId];
              } else if (item.listId && !isUUID(item.listId)) {
                newListId = generateUUID();
                idMap[item.listId] = newListId;
              }

              return { ...item, id: newId, listId: newListId };
            });
          }

          // 3. Map activeListId
          if (persistedState.activeListId) {
            if (idMap[persistedState.activeListId]) {
              persistedState.activeListId = idMap[persistedState.activeListId];
            } else if (!isUUID(persistedState.activeListId)) {
              persistedState.activeListId = '00000000-0000-0000-0000-000000000001';
            }
          }
        }
        return persistedState;
      },
      partialize: (state) => ({
        lists: state.lists,
        items: state.items,
        activeListId: state.activeListId,
        settings: state.settings,
        sessionUser: state.sessionUser,
        profile: state.profile,
      }),
    }
  )
);
