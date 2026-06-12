# 🛒 VibeCart

**VibeCart** is a premium, real-time cooperative grocery shopping app designed for couples. Built on top of **React Native (Expo)**, **Supabase**, and **Zustand**, VibeCart allows couples to sync shopping lists instantly, assign item responsibilities, track item quantities and pricing, lock completed trips, and browse an accordion-style historical archive of past supermarket visits.

It features a custom-designed Dark Mode, haptic-driven feedback, local/remote data synchronization, and hardware-accelerated animations for a highly polished, native mobile experience.

---

## ✨ Features

### 👥 Couples Synchronization & Roles
- **Dual-Role Onboarding**: Log in via traditional credentials or Google OAuth and complete profile setup by selecting a role (**Husband** or **Wife**) and creating/joining a shared household using a unique Join Invite Code.
- **Cart Separation**: View unified lists containing all items, or filter views inline to display only the items assigned to your specific cart (**Joao's Cart** vs. **Wife's Cart**).
- **Assignee Cycling**: Assign list items to a specific partner dynamically with visual indicators.

### 📝 Smart List & Checkout Workflow
- **Inline Check Toggling**: Crossing off an item strikes it out inline without immediately archiving it, allowing you to easily uncheck items if clicked by mistake.
- **Complete List Mode**: One-tap completion lock that hides checkboxes, disables edit modals, and locks swipe gestures, presenting a clean read-only summary of the shopping trip.
- **Edit & Archive Controls**: Easily toggle the list back to "Edit" mode to add forgotten items, or click "Archive" to clear the Lists Screen and move the entire session to history.
- **Price & Cost Calculations**: Input unit prices on items to automatically compute sub-totals and a sticky, real-time list total sum in the active header.

### 🗄️ Structured Accordion Archive
- **Collapsible History Cards**: Rather than showing a long, unstructured list of loose items, past trips are grouped into clean, expandable cards displaying the list name, creation date, supermarket location, and overall trip cost.
- **Accordions & Categories**: Tap any card to expand details inline, showcasing items grouped neatly by category (Produce, Dairy, Bakery, Meat, etc.), quantities, units, and checked/unchecked statuses.
- **Historical Actions**: Restore any archived list back to active shopping, or delete lists permanently.

### ⚡ Premium UI & Micro-Interactions
- **Splash Preloader**: A beautiful, hardware-accelerated launching preloader screen featuring an animated, bouncing, scaling, and tilting shopping cart icon layered above pulsing purple and rose ripple rings.
- **Haptic Feedback**: Integrated haptic feedback (`expo-haptics`) on checkboxes, item creation, list deletion, and tab changes to build a satisfying tactile response.
- **Natural Language Parsing**: Add items instantly (e.g. typing `"3 avocados, sourdough bread"`) parsed locally or enhanced by Google Gemini AI.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Core**: React Native ( v0.81.5), Expo (v54.0.0), TypeScript, React 19.
- **State Management**: Zustand (Persisted locally with `AsyncStorage` for offline support, syncs dynamically with the cloud when online).
- **Backend-as-a-Service**: Supabase (Postgres, Database Realtime Listener channels, Google OAuth redirect handling).
- **Authentication & Security**: Supabase Auth combined with custom SQL functions to map Google User data into isolated household profiles.
- **Row-Level Security (RLS)**: Policies implemented inside PostgreSQL to ensure couples only read/write list items belonging to their shared household ID.
- **Icons & Typography**: Lucide Icons, Outfit Google Font.

---

## 📂 Database Schema Overview

VibeCart relies on a relational schema configured to support shared households:

```sql
-- 1. Households Table
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. User Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  role TEXT CHECK (role IN ('husband', 'wife', 'member')),
  name TEXT,
  avatar_url TEXT,
  is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ
);

-- 3. Shopping Lists
CREATE TABLE public.shopping_lists (
  id UUID PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  supermarket TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Shopping Items
CREATE TABLE public.shopping_items (
  id UUID PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT,
  category TEXT NOT NULL DEFAULT 'Uncategorized',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  assigned_to TEXT CHECK (assigned_to IN ('husband', 'wife', 'member', 'unassigned')),
  price NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);
```

### Row Level Security (RLS) Example
To prevent cross-user data leakage, RLS is active on shopping lists and items:
```sql
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow household access for lists" ON public.shopping_lists
  FOR ALL USING (household_id = (SELECT household_id FROM public.profiles WHERE id = auth.uid()));
```

---

## 🚀 Setup & Installation

Follow these steps to run the project locally on your machine:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/JoaoPeluzio/ourgroceries.git
   cd ourgroceries
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment API Keys**:
   Open [App.tsx](file:///c:/Users/jvpel/Documents/ourgroceries/App.tsx) and [useShoppingStore.ts](file:///c:/Users/jvpel/Documents/ourgroceries/store/useShoppingStore.ts) to define your Supabase endpoint and API keys.

4. **Launch the Development Server**:
   Start the Expo dev server:
   ```bash
   npx expo start --clear
   ```
   *Note: Press `i` to open in iOS simulator, `a` for Android, or scan the QR code using the Expo Go app on your physical device.*

---

## 📱 Building standalone iOS IPA (EAS)

To build a version for direct installation on your iPhone for testing:

1. **Install EAS globally**:
   ```bash
   npm install -g eas-cli
   ```
2. **Log into your Expo account**:
   ```bash
   eas login
   ```
3. **Register Project**:
   ```bash
   eas project:init
   ```
4. **Build the Standalone iOS App**:
   ```bash
   eas build --platform ios --profile preview
   ```
   Follow the CLI prompts to register your device's UDID using your Apple Developer account, and scan the QR code to install VibeCart locally.
