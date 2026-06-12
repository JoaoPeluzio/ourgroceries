// VibeCart TypeScript Type Definitions

export interface ShoppingItem {
  id: string;
  listId: string;
  name: string;
  quantity: number;
  unit?: string;
  category: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  createdBy?: string;
  assignedTo?: 'husband' | 'wife' | 'member' | 'unassigned';
  price?: number;
}

export interface UserProfile {
  id: string;
  householdId: string | null;
  role: 'husband' | 'wife' | 'member';
  name: string;
  avatarUrl?: string;
  isSuperuser: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: string;
  icon?: string;
  isCompleted?: boolean;
  isArchived?: boolean;
  supermarket?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  userName: string;
  partnerName: string;
  currentUserRole?: 'husband' | 'wife' | 'member';
  supabaseUrl: string;
  supabaseAnonKey: string;
  geminiApiKey: string;
  isSyncEnabled: boolean;
}

export interface ParsedItem {
  name: string;
  quantity: number;
  unit?: string;
  category: string;
}

import 'lucide-react-native';

declare module 'lucide-react-native' {
  export interface LucideProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    style?: any;
  }
}



