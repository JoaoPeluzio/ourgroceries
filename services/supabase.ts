import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ShoppingItem, ShoppingList } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  // Read settings directly from the store's current state via dynamic require to avoid circular dependency
  const useShoppingStore = require('../store/useShoppingStore').useShoppingStore;
  const settings = useShoppingStore.getState().settings;
  let url = settings.supabaseUrl;
  if (url && url.includes('.supabase.com')) {
    url = url.replace('.supabase.com', '.supabase.co');
  }
  const anonKey = settings.supabaseAnonKey;

  if (!url || !anonKey) {
    return null;
  }

  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    return supabaseInstance;
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    return null;
  }
};

// Exported placeholder to satisfy imports, will resolve dynamically
export const supabase = {
  from: (table: string) => {
    const client = getSupabase();
    if (!client) {
      // Return a dummy chain if no client exists to prevent crash
      return {
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        eq: () => ({ then: (cb: any) => cb({ error: new Error('Supabase not configured') }) }),
        in: () => ({ then: (cb: any) => cb({ error: new Error('Supabase not configured') }) }),
      } as any;
    }
    return client.from(table);
  },
  rpc: (fnName: string, params?: any) => {
    const client = getSupabase();
    if (!client) {
      return Promise.resolve({ data: null, error: new Error('Supabase not configured') });
    }
    return client.rpc(fnName, params);
  },
  get auth() {
    const client = getSupabase();
    if (!client) {
      // Return a dummy auth structure if no client exists to prevent crash
      return {
        signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
        signUp: () => Promise.resolve({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
        signOut: () => Promise.resolve({ error: new Error('Supabase not configured') }),
      } as any;
    }
    return client.auth;
  }
};

export const resetSupabaseClient = () => {
  supabaseInstance = null;
};

// Mapping Helpers
export const mapRemoteItem = (row: any): ShoppingItem => ({
  id: row.id,
  listId: row.list_id,
  name: row.name,
  quantity: row.quantity || 1,
  unit: row.unit || undefined,
  category: row.category || 'Uncategorized',
  completed: row.completed,
  completedAt: row.completed_at || undefined,
  completedBy: row.completed_by || undefined,
  createdAt: row.created_at,
  createdBy: row.created_by || undefined,
  assignedTo: row.assigned_to || 'unassigned',
  price: row.price !== null && row.price !== undefined ? parseFloat(row.price) : undefined,
});

export const mapRemoteList = (row: any): ShoppingList => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  icon: row.icon || undefined,
  isCompleted: row.is_completed || false,
  isArchived: row.is_archived || false,
  supermarket: row.supermarket || undefined,
});

// Setup Real-time Subscriptions
export const initializeRealtimeSync = () => {
  const client = getSupabase();
  const useShoppingStore = require('../store/useShoppingStore').useShoppingStore;
  const store = useShoppingStore.getState();
  const settings = store.settings;
  const profile = store.profile;

  if (!client || !settings.isSyncEnabled || !profile || !profile.householdId) {
    return () => {};
  }
  // 1. Initial full sync fetch & merge
  const pullInitialData = async () => {
    try {
      const currentStore = useShoppingStore.getState();
      const currentProfile = currentStore.profile;

      // 1. Double check that we actually have a household context
      if (!currentProfile?.householdId) {
        console.log('Sync deferred: profile.householdId is missing.');
        return;
      }

      // 2. Double check that the Supabase client auth is hydrated & matches local user ID
      const { data: { session } } = await client.auth.getSession();
      if (!session || session.user.id !== currentStore.sessionUser?.id) {
        console.log('Sync deferred: Supabase auth session is not hydrated/authenticated yet.');
        return;
      }

      // Fetch Lists
      const { data: remoteLists, error: listError } = await client
        .from('shopping_lists')
        .select('*');

      if (listError) throw listError;

      // Fetch Items
      const { data: remoteItems, error: itemError } = await client
        .from('shopping_items')
        .select('*');

      if (itemError) throw itemError;

      if (remoteLists) {
        const mappedLists = remoteLists.map(mapRemoteList);
        let localLists = currentStore.lists;
        
        // Self-heal empty lists state: if both local and remote are empty, seed default list
        if (mappedLists.length === 0 && localLists.length === 0) {
          localLists = [
            { id: '00000000-0000-0000-0000-000000000001', name: 'Groceries', createdAt: new Date().toISOString(), icon: 'shopping-cart' }
          ];
        }

        for (const localList of localLists) {
          const exists = mappedLists.some((l) => l.id === localList.id);
          if (!exists) {
            const insertData: any = {
              id: localList.id,
              name: localList.name,
              created_at: localList.createdAt,
              icon: localList.icon,
              is_completed: localList.isCompleted || false,
              is_archived: localList.isArchived || false,
              supermarket: localList.supermarket || null,
            };
            if (currentProfile.householdId) {
              insertData.household_id = currentProfile.householdId;
            } else {
              continue;
            }
            const { error: insertError } = await client.from('shopping_lists').upsert(insertData);
            if (insertError) {
              console.error(`Error uploading local list "${localList.name}":`, insertError.message);
            }
          }
        }
        
        // Refresh and set from remote
        const { data: updatedLists } = await client.from('shopping_lists').select('*');
        if (updatedLists) currentStore.setListsFromRemote(updatedLists.map(mapRemoteList));
      }

      if (remoteItems) {
        const mappedItems = remoteItems.map(mapRemoteItem);
        const localItems = currentStore.items;

        for (const localItem of localItems) {
          const exists = mappedItems.some((i) => i.id === localItem.id);
          if (!exists) {
            const insertData: any = {
              id: localItem.id,
              list_id: localItem.listId,
              name: localItem.name,
              quantity: localItem.quantity,
              unit: localItem.unit,
              category: localItem.category,
              completed: localItem.completed,
              created_at: localItem.createdAt,
              created_by: localItem.createdBy,
              assigned_to: localItem.assignedTo || 'unassigned',
              price: localItem.price,
            };
            if (currentProfile.householdId) {
              insertData.household_id = currentProfile.householdId;
            } else {
              continue;
            }
            const { error: insertError } = await client.from('shopping_items').upsert(insertData);
            if (insertError) {
              console.error(`Error uploading local item "${localItem.name}":`, insertError.message);
            }
          }
        }

        // Refresh and set from remote
        const { data: updatedItems } = await client.from('shopping_items').select('*');
        if (updatedItems) currentStore.setItemsFromRemote(updatedItems.map(mapRemoteItem));
      }
    } catch (e) {
      console.warn('Initial sync merge failed. Using offline data.', e);
    }
  };

  pullInitialData();

  // Listen for auth state changes to trigger pullInitialData once authenticated
  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    if (session && session.user.id === useShoppingStore.getState().sessionUser?.id) {
      pullInitialData();
    }
  });

  // 2. Subscribe to real-time changes
  const listsChannel = client
    .channel('public:shopping_lists')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shopping_lists' },
      (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          store.upsertListFromRemote(mapRemoteList(newRow));
        } else if (eventType === 'DELETE') {
          store.deleteListFromRemote(oldRow.id);
        }
      }
    )
    .subscribe();

  const itemsChannel = client
    .channel('public:shopping_items')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shopping_items' },
      (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;

        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          store.upsertItemFromRemote(mapRemoteItem(newRow));
        } else if (eventType === 'DELETE') {
          store.deleteItemFromRemote(oldRow.id);
        }
      }
    )
    .subscribe();

  // Return unsubscribe cleanup handler
  return () => {
    client.removeChannel(listsChannel);
    client.removeChannel(itemsChannel);
    subscription.unsubscribe();
  };
};
