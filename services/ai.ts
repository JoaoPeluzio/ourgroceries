import { ParsedItem } from '../types';

// Predefined recipes for offline fallback expansion
const OFFLINE_RECIPES: Record<string, ParsedItem[]> = {
  tacos: [
    { name: 'Ground Beef', quantity: 1, unit: 'lb', category: 'Meat' },
    { name: 'Taco Shells / Tortillas', quantity: 1, unit: 'pack', category: 'Bakery' },
    { name: 'Shredded Cheddar', quantity: 1, unit: 'bag', category: 'Dairy' },
    { name: 'Shredded Lettuce', quantity: 1, unit: 'bag', category: 'Produce' },
    { name: 'Taco Salsa', quantity: 1, unit: 'jar', category: 'Pantry' },
    { name: 'Sour Cream', quantity: 1, unit: 'tub', category: 'Dairy' },
  ],
  pancakes: [
    { name: 'Pancake Mix', quantity: 1, unit: 'box', category: 'Pantry' },
    { name: 'Whole Milk', quantity: 1, unit: 'carton', category: 'Dairy' },
    { name: 'Large Eggs', quantity: 1, unit: 'dozen', category: 'Dairy' },
    { name: 'Maple Syrup', quantity: 1, unit: 'bottle', category: 'Pantry' },
    { name: 'Butter', quantity: 1, unit: 'pack', category: 'Dairy' },
  ],
  spaghetti: [
    { name: 'Spaghetti Pasta', quantity: 1, unit: 'pack', category: 'Pantry' },
    { name: 'Marinara Sauce', quantity: 1, unit: 'jar', category: 'Pantry' },
    { name: 'Ground Turkey or Beef', quantity: 1, unit: 'lb', category: 'Meat' },
    { name: 'Parmesan Cheese', quantity: 1, unit: 'shaker', category: 'Dairy' },
    { name: 'Garlic Bread', quantity: 1, unit: 'loaf', category: 'Bakery' },
  ],
  salad: [
    { name: 'Romaine Lettuce', quantity: 1, unit: 'head', category: 'Produce' },
    { name: 'Cherry Tomatoes', quantity: 1, unit: 'pint', category: 'Produce' },
    { name: 'Cucumbers', quantity: 2, category: 'Produce' },
    { name: 'Salad Dressing', quantity: 1, unit: 'bottle', category: 'Pantry' },
    { name: 'Garlic Croutons', quantity: 1, unit: 'bag', category: 'Pantry' },
  ],
};

// Heuristic offline categorizer
const guessCategory = (name: string): string => {
  const n = name.toLowerCase();
  
  // Produce
  if (/\b(apple|banana|orange|grape|avocado|lime|lemon|tomato|lettuce|salad|cabbage|onion|garlic|potato|carrot|spinach|berry|berries|strawberry|blueberry|mushroom|pepper|broccoli|cucumber|herb|cilantro)\b/.test(n)) {
    return 'Produce';
  }
  // Dairy
  if (/\b(milk|cheese|butter|cream|egg|yogurt|cream|sour cream|cheddar|mozzarella|parmesan)\b/.test(n)) {
    return 'Dairy';
  }
  // Meat
  if (/\b(beef|chicken|pork|turkey|meat|steak|fish|salmon|shrimp|bacon|sausage|ham|patty|lamb)\b/.test(n)) {
    return 'Meat';
  }
  // Bakery
  if (/\b(bread|loaf|bun|tortilla|wrap|bagel|croissant|bakery|muffin|donut|pita)\b/.test(n)) {
    return 'Bakery';
  }
  // Frozen
  if (/\b(frozen|ice cream|pizza|waffle|fries|frozen veggies)\b/.test(n)) {
    return 'Frozen';
  }
  // Pantry
  if (/\b(sauce|pasta|spaghetti|rice|cereal|soup|can|flour|sugar|oil|vinegar|salt|pepper|spice|chip|snack|cookie|cracker|bean|tuna|salsa|dressing|syrup)\b/.test(n)) {
    return 'Pantry';
  }

  return 'Other';
};

// Parse a single item phrase using regex
// E.g., "2 cartons of milk" -> quantity 2, unit "cartons", name "milk"
const parseSingleItemPhrase = (phrase: string): ParsedItem => {
  let cleaned = phrase.trim().replace(/^(need|buy|get|want)\s+/i, '');
  
  // Regex pattern matching: [number] [optional unit/package descriptor] [item name]
  // Matches: "2 cartons of milk", "1 loaf bread", "3 apples", "a carton of eggs"
  const match = cleaned.match(/^(\d+|a|an)\s+(carton[s]?|bottle[s]?|can[s]?|loaf|loaves|pack[s]?|bag[s]?|box[es]?|lb[s]?|pound[s]?|gallon[s]?)?\s*(?:of\s+)?(.+)$/i);
  
  if (match) {
    let qtyStr = match[1].toLowerCase();
    let quantity = 1;
    if (qtyStr === 'a' || qtyStr === 'an') {
      quantity = 1;
    } else {
      quantity = parseInt(qtyStr, 10) || 1;
    }

    const unit = match[2] ? match[2].trim().toLowerCase() : undefined;
    const name = match[3].trim();
    
    // Capitalize name
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

    return {
      name: capitalizedName,
      quantity,
      unit,
      category: guessCategory(name),
    };
  }

  // Fallback: just return the whole phrase as the item name
  return {
    name: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
    quantity: 1,
    category: guessCategory(cleaned),
  };
};

// Offline parsing routine
const parseOffline = (input: string): ParsedItem[] => {
  const items: ParsedItem[] = [];
  const text = input.toLowerCase().trim();

  // 1. Check for recipe expansion
  for (const [recipeName, recipeItems] of Object.entries(OFFLINE_RECIPES)) {
    if (text.includes(recipeName) || text.includes(`ingredients for ${recipeName}`) || text.includes(`${recipeName} ingredients`)) {
      items.push(...recipeItems);
      // Remove the recipe keyword to parse any remaining parts
      input = input.replace(new RegExp(`(ingredients for\\s+)?${recipeName}(\\s+ingredients)?`, 'gi'), '');
    }
  }

  // 2. Split input by separators like "and", "plus", ",", "also"
  const segments = input.split(/\band\b|\bplus\b|\balso\b|,/i);

  segments.forEach((segment) => {
    const trimmed = segment.trim();
    if (trimmed.length > 1) {
      items.push(parseSingleItemPhrase(trimmed));
    }
  });

  return items.length > 0 ? items : [{ name: input, quantity: 1, category: 'Other' }];
};

// Main Exported Service Function
export const parseNaturalLanguageInput = async (
  input: string,
  geminiApiKey?: string
): Promise<ParsedItem[]> => {
  if (!input || input.trim().length === 0) {
    return [];
  }

  if (!geminiApiKey || geminiApiKey.trim() === '') {
    // Graceful offline fallback
    return parseOffline(input);
  }

  try {
    const systemInstruction = `You are a shopping list parser.
Convert the user's natural language grocery request into a JSON array of items.
Each item in the array must be an object with the following fields:
- "name": string (the item name, e.g. "Whole Milk", capitalized)
- "quantity": number (integer, default is 1)
- "unit": string (optional, e.g. "cartons", "lbs", "loaf", "bag", "pack")
- "category": string (choose from: "Produce", "Dairy", "Meat", "Bakery", "Frozen", "Pantry", "Kitchen", "Other")

CRITICAL: If the user asks for ingredients for a recipe (e.g. "tacos", "spaghetti", "chocolate chip cookies", "lasagna", "pancakes", "salad"), expand that recipe into its standard raw ingredients as separate items in the list.
Return ONLY a valid JSON array. Do not include markdown code block syntax (like \`\`\`json). Just return the raw JSON array string.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemInstruction}\n\nParse this input:\n"${input}"`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (textResponse) {
      const parsed = JSON.parse(textResponse.trim());
      if (Array.isArray(parsed)) {
        return parsed as ParsedItem[];
      }
    }
    
    // If response format is unexpected, fallback
    return parseOffline(input);
  } catch (error) {
    console.warn('Gemini API call failed, falling back to local heuristic parser.', error);
    return parseOffline(input);
  }
};



