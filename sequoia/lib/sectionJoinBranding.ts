/** Visual marks for join / discovery cards (emoji tile + accent hue). */

const LIFE_MARKS: Record<string, { emoji: string; hue: number }> = {
  relationships: { emoji: "💞", hue: 330 },
  family: { emoji: "🏠", hue: 28 },
  education: { emoji: "📚", hue: 210 },
  career: { emoji: "💼", hue: 200 },
  money: { emoji: "💰", hue: 45 },
  housing: { emoji: "🔑", hue: 35 },
  health: { emoji: "🧘", hue: 160 },
  community: { emoji: "🤝", hue: 265 },
};

const TECH_MARKS: Record<string, { emoji: string; hue: number }> = {
  fishing: { emoji: "🎣", hue: 200 },
  hunting: { emoji: "🦌", hue: 95 },
  welding: { emoji: "🧑‍🏭", hue: 15 },
  woodworking: { emoji: "🪚", hue: 30 },
  automotive: { emoji: "🚗", hue: 220 },
  electronics: { emoji: "⚡", hue: 280 },
  plumbing: { emoji: "🚰", hue: 195 },
  cooking: { emoji: "🍳", hue: 25 },
};

export function getLifeSectionMark(slug: string): { emoji: string; hue: number } {
  return LIFE_MARKS[slug] ?? { emoji: "✨", hue: 200 };
}

export function getTechnicalFieldMark(slug: string): { emoji: string; hue: number } {
  return TECH_MARKS[slug] ?? { emoji: "🛠️", hue: 200 };
}
