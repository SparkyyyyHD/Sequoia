/**
 * Prerequisite-based skill trees for life advice and technical forums.
 * Technical posts use subcategory `fieldSlug__skillSlug`; life advice uses `skillSlug` only.
 */

export interface SkillTreeNode {
  slug: string;
  label: string;
  description: string;
  /** Slugs of prerequisite skills within the same tree (field or life). */
  requires: string[];
}

const TECHNICAL_SEPARATOR = "__";

export const TECHNICAL_FIELD_SLUGS = [
  "fishing",
  "hunting",
  "welding",
  "woodworking",
  "automotive",
  "electronics",
  "plumbing",
  "cooking",
] as const;

export type TechnicalFieldSlug = (typeof TECHNICAL_FIELD_SLUGS)[number];

export const TECHNICAL_SKILL_TREES: Record<TechnicalFieldSlug, SkillTreeNode[]> = {
  fishing: [
    {
      slug: "fish-rod-reel-line-baseline",
      label: "Tackle setup fundamentals",
      description: "Start by matching rod, reel, line, and drag well enough to fish without fighting your gear.",
      requires: [],
    },
    {
      slug: "fish-knot-palomar-double-uni",
      label: "Knots and terminal tackle",
      description: "Build confidence in the knots and connections that keep fish from being lost at the worst moment.",
      requires: ["fish-rod-reel-line-baseline"],
    },
    {
      slug: "fish-cast-overhead-roll",
      label: "Casting control",
      description: "Learn to place bait where you want it with fewer backlashes, tangles, and wasted casts.",
      requires: ["fish-rod-reel-line-baseline"],
    },
    {
      slug: "fish-mark-structure-map",
      label: "Reading water and structure",
      description: "Understand where fish hold by noticing current, depth, cover, and seasonal positioning.",
      requires: ["fish-rod-reel-line-baseline"],
    },
    {
      slug: "fish-hookset-landing-net",
      label: "Hooksets and landing fish",
      description: "Convert more bites into landed fish while handling them safely and confidently.",
      requires: ["fish-knot-palomar-double-uni", "fish-cast-overhead-roll"],
    },
    {
      slug: "fish-limits-laminate-wallet",
      label: "Regulations and local rules",
      description: "Fish responsibly by knowing limits, protected waters, invasive rules, and local restrictions.",
      requires: ["fish-mark-structure-map"],
    },
    {
      slug: "fish-seasonal-pattern-notes",
      label: "Seasonal fish behavior",
      description: "Track how fish location and feeding change across temperature, clarity, weather, and time of year.",
      requires: ["fish-hookset-landing-net", "fish-mark-structure-map"],
    },
    {
      slug: "fish-species-lure-matrix",
      label: "Targeting specific species",
      description: "Adjust bait choice, depth, and presentation to the species you actually want to catch.",
      requires: ["fish-seasonal-pattern-notes"],
    },
    {
      slug: "fish-finesse-wacky-ned",
      label: "Finesse and advanced presentations",
      description: "Refine subtle presentations for pressured fish, tough conditions, and slower bites.",
      requires: ["fish-species-lure-matrix"],
    },
    {
      slug: "fish-boat-kill-switch-pfd",
      label: "Boat safety and launch habits",
      description: "Develop the safety routines that keep a day on the water from turning into an emergency.",
      requires: ["fish-rod-reel-line-baseline"],
    },
    {
      slug: "fish-wade-felt-rules",
      label: "Wading safety",
      description: "Move through rivers and shorelines more safely by treating footing and current as real hazards.",
      requires: ["fish-rod-reel-line-baseline"],
    },
    {
      slug: "fish-teach-kid-rig",
      label: "Teaching a beginner",
      description: "Simplify your setup and expectations enough to help someone else enjoy the sport safely.",
      requires: ["fish-limits-laminate-wallet", "fish-hookset-landing-net"],
    },
  ],
  hunting: [
    {
      slug: "hunt-license-tag-wallet",
      label: "Legal readiness",
      description: "Start with tags, seasons, access rules, and visibility requirements so every hunt begins responsibly.",
      requires: [],
    },
    {
      slug: "hunt-zero-and-drop-data",
      label: "Weapon zero and shot confidence",
      description: "Know your effective range, your zero, and your drop before you ever take a shot on an animal.",
      requires: ["hunt-license-tag-wallet"],
    },
    {
      slug: "hunt-scouting-camis-map",
      label: "Scouting and patterning game",
      description: "Read sign, terrain, wind, and movement patterns well enough to hunt on purpose instead of hope.",
      requires: ["hunt-license-tag-wallet"],
    },
    {
      slug: "hunt-stand-harness-lines",
      label: "Stand and elevation safety",
      description: "Treat height and setup safety as core hunting skills, not optional extras.",
      requires: ["hunt-license-tag-wallet"],
    },
    {
      slug: "hunt-field-dress-glove-kit",
      label: "Field dressing and pack-out",
      description: "Handle the animal cleanly and efficiently from the shot site to transport.",
      requires: ["hunt-zero-and-drop-data", "hunt-stand-harness-lines"],
    },
    {
      slug: "hunt-blood-trail-grid",
      label: "Tracking wounded game",
      description: "Follow sign methodically, stay patient, and avoid rushing the most important part of recovery.",
      requires: ["hunt-zero-and-drop-data", "hunt-scouting-camis-map"],
    },
    {
      slug: "hunt-meat-aging-cooler",
      label: "Meat care and cooling",
      description: "Protect meat quality with better temperature control, timing, storage, and processing decisions.",
      requires: ["hunt-field-dress-glove-kit"],
    },
    {
      slug: "hunt-public-land-boundary-app",
      label: "Public land navigation",
      description: "Navigate boundaries, offline maps, and land-use rules with more confidence and less guesswork.",
      requires: ["hunt-license-tag-wallet"],
    },
    {
      slug: "hunt-mentor-observer-day",
      label: "Mentored hunt judgment",
      description: "Sharpen judgment by learning from experienced hunters before relying only on your own instincts.",
      requires: ["hunt-field-dress-glove-kit", "hunt-public-land-boundary-app"],
    },
    {
      slug: "hunt-process-ground-burger-fat",
      label: "Processing and preservation",
      description: "Finish the hunt well by turning recovered meat into food that stores, cooks, and tastes better.",
      requires: ["hunt-meat-aging-cooler"],
    },
  ],
  welding: [
    {
      slug: "weld-ppe-vent-checklist",
      label: "Shop safety fundamentals",
      description: "Begin with PPE, ventilation, fire awareness, and setup habits that make every process safer.",
      requires: [],
    },
    {
      slug: "weld-stick-6013-flat-vertical",
      label: "Stick welding basics",
      description: "Learn arc starts, bead control, and fusion on simple positions before chasing prettier welds.",
      requires: ["weld-ppe-vent-checklist"],
    },
    {
      slug: "weld-mig-short-arc-thin",
      label: "MIG on thin material",
      description: "Control heat, travel speed, and settings well enough to weld lighter stock without constant blow-through.",
      requires: ["weld-ppe-vent-checklist"],
    },
    {
      slug: "weld-tig-finger-fed-lap",
      label: "TIG torch and filler control",
      description: "Develop the coordination and cleanliness habits that make TIG feel precise instead of chaotic.",
      requires: ["weld-mig-short-arc-thin"],
    },
    {
      slug: "weld-vertical-up-fillet-bracket",
      label: "Out-of-position welding",
      description: "Move beyond flat work into vertical and multi-pass welds that demand better control.",
      requires: ["weld-mig-short-arc-thin"],
    },
    {
      slug: "weld-cut-grinder-guard-gloves",
      label: "Cutting and grinding discipline",
      description: "Handle prep, cleanup, and grinding safely enough that the supporting work stops causing avoidable mistakes.",
      requires: ["weld-ppe-vent-checklist"],
    },
    {
      slug: "weld-sq-tube-cart-project",
      label: "Fabrication fit-up",
      description: "Use layout, tack order, and squareness checks to build projects that come together accurately.",
      requires: ["weld-vertical-up-fillet-bracket", "weld-stick-6013-flat-vertical"],
    },
    {
      slug: "weld-farm-exhaust-patch",
      label: "Thin metal repair",
      description: "Repair worn, rusty, or damaged metal with better sequence, prep, and heat control.",
      requires: ["weld-mig-short-arc-thin", "weld-cut-grinder-guard-gloves"],
    },
    {
      slug: "weld-aluminum-tig-prep-nitrile",
      label: "Aluminum TIG preparation",
      description: "Handle the extra cleanliness and prep demands that make aluminum feel like its own discipline.",
      requires: ["weld-tig-finger-fed-lap"],
    },
  ],
  woodworking: [
    {
      slug: "ww-engineer-square-story-stick",
      label: "Layout and measurement",
      description: "Start with repeatable measuring and marking so later mistakes don't get built into every cut.",
      requires: [],
    },
    {
      slug: "ww-handplane-iron-refresh",
      label: "Edge tool setup",
      description: "Get chisels and planes sharp enough to make joinery, trimming, and cleanup far more controlled.",
      requires: ["ww-engineer-square-story-stick"],
    },
    {
      slug: "ww-sled-crosscut-jig",
      label: "Crosscut accuracy",
      description: "Use jigs and setup discipline to make machine cuts more accurate and more repeatable.",
      requires: ["ww-engineer-square-story-stick"],
    },
    {
      slug: "ww-router-dado-jig",
      label: "Router joinery fundamentals",
      description: "Learn how to cut cleaner dados, grooves, and shoulder work with more confidence and consistency.",
      requires: ["ww-sled-crosscut-jig"],
    },
    {
      slug: "ww-dovetail-practice-two-board",
      label: "Hand-cut joinery",
      description: "Slow down enough to understand fit, layout, and correction in more demanding hand joinery.",
      requires: ["ww-handplane-iron-refresh"],
    },
    {
      slug: "ww-finish-sample-boards",
      label: "Finishing systems",
      description: "Choose and apply finishes more intentionally so the last step improves the work instead of hiding mistakes.",
      requires: ["ww-router-dado-jig"],
    },
    {
      slug: "ww-dust-blast-gate-map",
      label: "Dust collection and shop flow",
      description: "Treat dust control and tool layout as part of woodworking skill, not just shop housekeeping.",
      requires: ["ww-sled-crosscut-jig"],
    },
    {
      slug: "ww-wall-shelf-anchor-load",
      label: "Installation and anchoring",
      description: "Take projects from bench to wall with better fastening, leveling, and load awareness.",
      requires: ["ww-finish-sample-boards", "ww-dovetail-practice-two-board"],
    },
    {
      slug: "ww-miter-saw-reciprocating-stop",
      label: "Repeatable trim work",
      description: "Improve speed and consistency on mitered work, trim, and repetitive cuts that punish sloppiness.",
      requires: ["ww-sled-crosscut-jig"],
    },
  ],
  automotive: [
    {
      slug: "auto-fluid-cap-map-photo",
      label: "Under-hood orientation",
      description: "Know the major systems, fluids, and service points before you try diagnosing anything deeper.",
      requires: [],
    },
    {
      slug: "auto-oil-drain-torque-card",
      label: "Routine service basics",
      description: "Handle simple recurring maintenance with less mess, less guessing, and fewer stripped parts.",
      requires: ["auto-fluid-cap-map-photo"],
    },
    {
      slug: "auto-brake-pad-template-mm",
      label: "Brake service",
      description: "Move into braking work with better inspection habits, safer support, and cleaner reassembly.",
      requires: ["auto-oil-drain-torque-card"],
    },
    {
      slug: "auto-obd-live-data-log",
      label: "Live-data diagnostics",
      description: "Go beyond codes and start reading what the engine is actually doing in real time.",
      requires: ["auto-fluid-cap-map-photo"],
    },
    {
      slug: "auto-shake-ball-joints",
      label: "Steering and suspension inspection",
      description: "Identify looseness, wear, and handling problems more methodically before replacing parts blindly.",
      requires: ["auto-brake-pad-template-mm"],
    },
    {
      slug: "auto-parasitic-draw-amps",
      label: "Battery drain diagnosis",
      description: "Chase electrical drains more systematically instead of just swapping batteries and hoping.",
      requires: ["auto-obd-live-data-log"],
    },
    {
      slug: "auto-charging-circuit-drop",
      label: "Charging system diagnosis",
      description: "Separate bad batteries, poor connections, and charging faults with better testing habits.",
      requires: ["auto-parasitic-draw-amps"],
    },
    {
      slug: "auto-timing-belt-window",
      label: "Major service planning",
      description: "Think ahead about timing components and other high-consequence maintenance before they fail expensively.",
      requires: ["auto-oil-drain-torque-card"],
    },
    {
      slug: "auto-spark-plug-torque-antiseize",
      label: "Ignition service details",
      description: "Handle plugs and related ignition work with the care aluminum threads and modern engines demand.",
      requires: ["auto-shake-ball-joints"],
    },
  ],
  electronics: [
    {
      slug: "ee-bench-esd-math-card",
      label: "Bench safety and basic theory",
      description: "Start with ESD habits, current/voltage basics, and a bench setup that protects parts and people.",
      requires: [],
    },
    {
      slug: "ee-datasheet-pinout-highlight",
      label: "Reading datasheets",
      description: "Learn to pull the essential information from datasheets before wiring or soldering anything.",
      requires: ["ee-bench-esd-math-card"],
    },
    {
      slug: "ee-breadboard-led-current",
      label: "Breadboarding and current limiting",
      description: "Build and test simple circuits in a way that makes power, current, and mistakes visible.",
      requires: ["ee-datasheet-pinout-highlight"],
    },
    {
      slug: "ee-solder-wick-bridges",
      label: "Soldering and rework",
      description: "Make cleaner joints and recover from bridges and bad joints without damaging the board.",
      requires: ["ee-breadboard-led-current"],
    },
    {
      slug: "ee-arduino-millis-fsm",
      label: "Embedded programming basics",
      description: "Move from simple circuits into microcontroller behavior, timing, and structured control logic.",
      requires: ["ee-solder-wick-bridges"],
    },
    {
      slug: "ee-uart-binary-log",
      label: "Serial communication debugging",
      description: "Understand how devices exchange data so you can diagnose protocol problems more effectively.",
      requires: ["ee-arduino-millis-fsm"],
    },
    {
      slug: "ee-scope-spring-ground",
      label: "Oscilloscope probing habits",
      description: "Measure signals more accurately by improving how you probe, reference ground, and interpret noise.",
      requires: ["ee-uart-binary-log"],
    },
    {
      slug: "ee-mixed-signal-gnd-star",
      label: "Mixed-signal layout judgment",
      description: "Start thinking about return paths, noise, and layout decisions that affect real-world board behavior.",
      requires: ["ee-scope-spring-ground", "ee-uart-binary-log"],
    },
    {
      slug: "ee-esd-safe-firmware-flash",
      label: "Safe flashing and bring-up",
      description: "Treat board bring-up like a process so you reduce avoidable failures during flashing and first power-on.",
      requires: ["ee-solder-wick-bridges"],
    },
  ],
  plumbing: [
    {
      slug: "plumb-photo-all-shutoffs",
      label: "Shutoffs and system orientation",
      description: "Start by knowing where water can be stopped and how the basic system is laid out.",
      requires: [],
    },
    {
      slug: "plumb-snake-trap-shower-hair",
      label: "Drain clearing basics",
      description: "Handle common clogs more effectively by understanding traps, hair, and simple mechanical clearing first.",
      requires: ["plumb-photo-all-shutoffs"],
    },
    {
      slug: "plumb-toilet-wax-torque-pattern",
      label: "Toilet reset and sealing",
      description: "Build confidence resetting toilets and sealing them correctly without creating new leaks.",
      requires: ["plumb-photo-all-shutoffs"],
    },
    {
      slug: "plumb-pex-crimp-gauge-log",
      label: "Supply-side PEX repairs",
      description: "Move from fixture work into cleaner, safer repairs on supply lines and fittings.",
      requires: ["plumb-photo-all-shutoffs"],
    },
    {
      slug: "plumb-psi-hose-bib-baseline",
      label: "Pressure diagnosis",
      description: "Measure pressure instead of guessing when fixtures, noise, or flow start acting strangely.",
      requires: ["plumb-pex-crimp-gauge-log"],
    },
    {
      slug: "plumb-prv-witness-mark",
      label: "Pressure regulation",
      description: "Adjust or evaluate regulators more carefully so you do not trade one pressure problem for another.",
      requires: ["plumb-psi-hose-bib-baseline"],
    },
    {
      slug: "plumb-wh-anode-flush",
      label: "Water heater service",
      description: "Extend equipment life by learning the maintenance steps that most systems quietly need.",
      requires: ["plumb-prv-witness-mark"],
    },
    {
      slug: "plumb-leak-sensor-grid",
      label: "Leak prevention and monitoring",
      description: "Reduce damage by catching small leaks earlier and planning for the times nobody is home.",
      requires: ["plumb-photo-all-shutoffs"],
    },
    {
      slug: "plumb-garbage-disposal-batch-feed",
      label: "Disposal troubleshooting",
      description: "Handle jams and bad habits around disposals without turning a minor issue into a larger mess.",
      requires: ["plumb-snake-trap-shower-hair"],
    },
  ],
  cooking: [
    {
      slug: "cook-dice-julienne-timer",
      label: "Knife skills and prep",
      description: "Start with safer, more consistent cutting so the rest of cooking gets easier and faster.",
      requires: [],
    },
    {
      slug: "cook-therm-pan-rippling",
      label: "Heat and temperature control",
      description: "Learn what pans, burners, and internal temperatures are doing instead of cooking by panic alone.",
      requires: ["cook-dice-julienne-timer"],
    },
    {
      slug: "cook-deglaze-fond-five",
      label: "Pan sauces and deglazing",
      description: "Use fond, stock, acid, and butter to turn ordinary cooked food into something more complete.",
      requires: ["cook-therm-pan-rippling"],
    },
    {
      slug: "cook-roux-bechamel-lump",
      label: "Base sauces and roux",
      description: "Build confidence in one of the foundational techniques behind a lot of comforting, flexible dishes.",
      requires: ["cook-therm-pan-rippling"],
    },
    {
      slug: "cook-sourdough-feed-log",
      label: "Starter and fermentation basics",
      description: "Understand the rhythm of feeding, rising, and timing before expecting bread to become predictable.",
      requires: ["cook-dice-julienne-timer"],
    },
    {
      slug: "cook-hydration-windowpane",
      label: "Dough structure and hydration",
      description: "Develop intuition for how flour, water, time, and handling shape dough behavior.",
      requires: ["cook-sourdough-feed-log"],
    },
    {
      slug: "cook-sunday-sheet-pan-matrix",
      label: "Meal prep and repetition",
      description: "Use planning and repeatable templates to make everyday cooking less exhausting and more reliable.",
      requires: ["cook-deglaze-fond-five"],
    },
    {
      slug: "cook-leftover-salt-acid-map",
      label: "Balancing flavor intuitively",
      description: "Train your palate to fix bland, flat, or heavy food by adjusting salt, acid, fat, and texture.",
      requires: ["cook-deglaze-fond-five", "cook-roux-bechamel-lump"],
    },
    {
      slug: "cook-knife-strop-honing",
      label: "Knife maintenance",
      description: "Keep your tools working well enough that prep stays safer, cleaner, and less frustrating.",
      requires: ["cook-dice-julienne-timer"],
    },
  ],
};

export interface LifeSkillPillar {
  slug: string;
  label: string;
  description: string;
  nodes: SkillTreeNode[];
}

/**
 * Life advice is split into separate pillar trees (each with its own hub on the skill map).
 * Slugs are prefixed by pillar (`rel-`, `edu-`, …) so every forum subcategory stays unique.
 */
export const LIFE_SKILL_PILLARS: LifeSkillPillar[] = [
  {
    slug: "relationships",
    label: "Relationships & intimacy",
    description: "A clearer arc from self-awareness to friendship, dating, conflict repair, and long-term partnership.",
    nodes: [
      {
        slug: "rel-journal-upset-one-page",
        label: "Emotional self-awareness",
        description: "Notice what you feel, what triggered it, and what you actually need before reacting.",
        requires: [],
      },
      {
        slug: "rel-move-water-before-reply",
        label: "Cooling down before reacting",
        description: "Build the habit of pausing, regulating, and responding instead of escalating.",
        requires: [],
      },
      {
        slug: "rel-i-need-because-sentence",
        label: "Asking for needs clearly",
        description: "Turn vague frustration into direct, respectful requests that other people can actually respond to.",
        requires: ["rel-journal-upset-one-page", "rel-move-water-before-reply"],
      },
      {
        slug: "rel-weekly-friend-text-rotation",
        label: "Maintaining friendships",
        description: "Stay in touch consistently, follow up, and keep relationships alive instead of waiting passively.",
        requires: ["rel-i-need-because-sentence"],
      },
      {
        slug: "rel-small-talk-question-bank",
        label: "Social confidence in groups",
        description: "Learn to enter conversations, ask good questions, and leave interactions without awkwardness.",
        requires: ["rel-weekly-friend-text-rotation"],
      },
      {
        slug: "rel-dating-app-photo-prompt-audit",
        label: "Presenting yourself honestly",
        description: "Show who you are clearly so the people you attract are actually a fit for you.",
        requires: ["rel-i-need-because-sentence"],
      },
      {
        slug: "rel-first-date-public-exit-plan",
        label: "Safe and grounded first dates",
        description: "Balance openness, judgment, and personal safety while getting to know someone new.",
        requires: ["rel-dating-app-photo-prompt-audit"],
      },
      {
        slug: "rel-define-exclusivity-bullets",
        label: "Defining the relationship",
        description: "Move from casual ambiguity to aligned expectations about labels, exclusivity, and pace.",
        requires: ["rel-first-date-public-exit-plan"],
      },
      {
        slug: "rel-meet-friends-or-meta",
        label: "Integrating each other's worlds",
        description: "Handle friends, social circles, and group dynamics without losing your own center.",
        requires: ["rel-define-exclusivity-bullets"],
      },
      {
        slug: "rel-long-distance-visit-rhythm",
        label: "Distance and rhythm planning",
        description: "Create consistency when logistics, travel, or mismatched schedules put strain on connection.",
        requires: ["rel-define-exclusivity-bullets"],
      },
      {
        slug: "rel-consent-checkin-phrases",
        label: "Sexual communication and consent",
        description: "Talk about comfort, desire, boundaries, and pace with more maturity and less guessing.",
        requires: ["rel-meet-friends-or-meta", "rel-long-distance-visit-rhythm"],
      },
      {
        slug: "rel-fight-pause-resume-contract",
        label: "Conflict de-escalation",
        description: "Learn how to pause arguments productively and come back without making things worse.",
        requires: ["rel-consent-checkin-phrases"],
      },
      {
        slug: "rel-apology-template-no-but",
        label: "Repair after conflict",
        description: "Take accountability, apologize well, and rebuild trust after something goes wrong.",
        requires: ["rel-fight-pause-resume-contract"],
      },
      {
        slug: "rel-shared-money-monthly-sync",
        label: "Shared routines and logistics",
        description: "Coordinate money, schedules, chores, and priorities without resentment quietly building.",
        requires: ["rel-apology-template-no-but"],
      },
      {
        slug: "rel-annual-couples-retreat-slot",
        label: "Long-term partnership growth",
        description: "Step back from daily logistics and make intentional decisions about the relationship's future.",
        requires: ["rel-shared-money-monthly-sync"],
      },
    ],
  },
  {
    slug: "family",
    label: "Family & caregiving",
    description: "A family arc from inherited patterns and partner alignment into parenting, caregiving, and coverage systems.",
    nodes: [
      {
        slug: "fam-one-page-family-map",
        label: "Family pattern awareness",
        description: "Understand the habits, wounds, and rules you bring from your own upbringing.",
        requires: [],
      },
      {
        slug: "fam-partner-three-nonnegotiables",
        label: "Partner alignment",
        description: "Get clear on values, timelines, money, location, and the kind of family life you want to build.",
        requires: [],
      },
      {
        slug: "fam-blended-custody-calendar",
        label: "Blended family coordination",
        description: "Handle custody, handoffs, and household rules without putting adult conflict onto children.",
        requires: ["fam-one-page-family-map"],
      },
      {
        slug: "fam-nursery-budget-shelf-list",
        label: "Preparing for a child",
        description: "Translate vague plans into housing, money, gear, and support that actually work.",
        requires: ["fam-partner-three-nonnegotiables"],
      },
      {
        slug: "fam-birth-preferences-one-pager",
        label: "Birth and postpartum planning",
        description: "Prepare for delivery, recovery, feeding choices, and support before everything gets harder.",
        requires: ["fam-nursery-budget-shelf-list"],
      },
      {
        slug: "fam-night-feed-split-log",
        label: "Newborn care systems",
        description: "Create routines for sleep, feeding, and role-sharing so exhaustion doesn't decide everything.",
        requires: ["fam-birth-preferences-one-pager"],
      },
      {
        slug: "fam-toddler-tantrum-script",
        label: "Toddler boundaries and regulation",
        description: "Set limits with consistency while helping young kids manage big feelings.",
        requires: ["fam-night-feed-split-log"],
      },
      {
        slug: "fam-iep-one-pager-meeting",
        label: "School advocacy",
        description: "Work with teachers and systems to get a child the support they actually need.",
        requires: ["fam-toddler-tantrum-script"],
      },
      {
        slug: "fam-teen-phone-contract",
        label: "Teen boundaries and independence",
        description: "Balance safety, trust, technology, and growing autonomy as kids get older.",
        requires: ["fam-iep-one-pager-meeting"],
      },
      {
        slug: "fam-aging-doc-wallet",
        label: "Aging parent readiness",
        description: "Prepare before a crisis by organizing medical, legal, and day-to-day caregiving information.",
        requires: ["fam-one-page-family-map"],
      },
      {
        slug: "fam-sibling-duty-roster",
        label: "Shared caregiving with siblings",
        description: "Distribute responsibility, communicate clearly, and reduce the resentment that caregiving can create.",
        requires: ["fam-aging-doc-wallet"],
      },
      {
        slug: "fam-pto-childcare-coverage",
        label: "Work and care coverage planning",
        description: "Build backup plans for childcare, leave, emergencies, and the real logistics of family life.",
        requires: ["fam-partner-three-nonnegotiables", "fam-night-feed-split-log"],
      },
    ],
  },
  {
    slug: "education",
    label: "Education & learning",
    description: "A learning arc from study habits into research, testing, applications, aid, and long-term skill building.",
    nodes: [
      {
        slug: "edu-weekly-timeblock-template",
        label: "Study routine and focus",
        description: "Build a repeatable schedule for deep work instead of relying on motivation or panic.",
        requires: [],
      },
      {
        slug: "edu-anki-or-quizlet-deck",
        label: "Active recall and memory",
        description: "Use spaced repetition and self-testing so material actually sticks.",
        requires: ["edu-weekly-timeblock-template"],
      },
      {
        slug: "edu-skim-abstract-conclusion",
        label: "Reading dense material efficiently",
        description: "Learn how to skim, evaluate, and extract the key ideas from hard texts without drowning in them.",
        requires: ["edu-weekly-timeblock-template"],
      },
      {
        slug: "edu-exam-week-sleep-food",
        label: "Exam preparation under pressure",
        description: "Prepare for high-stakes tests with better timing, practice, sleep, and stress management.",
        requires: ["edu-weekly-timeblock-template"],
      },
      {
        slug: "edu-net-price-calculator-round",
        label: "College cost awareness",
        description: "Understand real price, debt exposure, and affordability before falling in love with a school.",
        requires: ["edu-skim-abstract-conclusion"],
      },
      {
        slug: "edu-campus-tour-question-pdf",
        label: "Evaluating school fit",
        description: "Move beyond prestige and compare schools by environment, support, outcomes, and lived fit.",
        requires: ["edu-net-price-calculator-round"],
      },
      {
        slug: "edu-common-app-main-essay-v2",
        label: "Application storytelling",
        description: "Explain who you are and where you're going in a way that sounds real, not manufactured.",
        requires: ["edu-campus-tour-question-pdf"],
      },
      {
        slug: "edu-recommender-email-kit",
        label: "Managing recommendations",
        description: "Ask for support professionally and make it easy for recommenders to advocate for you well.",
        requires: ["edu-common-app-main-essay-v2"],
      },
      {
        slug: "edu-award-letter-compare-sheet",
        label: "Comparing aid offers",
        description: "Read the fine print on grants, loans, and total cost so you can compare offers honestly.",
        requires: ["edu-common-app-main-essay-v2"],
      },
      {
        slug: "edu-trade-apprenticeship-apply-pack",
        label: "Trades and apprenticeship path",
        description: "Treat trade routes as serious options with their own applications, timelines, and upside.",
        requires: ["edu-net-price-calculator-round"],
      },
      {
        slug: "edu-coursera-or-cert-30h",
        label: "Self-directed upskilling",
        description: "Keep learning after formal school by building skills with structure and proof of completion.",
        requires: ["edu-weekly-timeblock-template"],
      },
      {
        slug: "edu-proofread-with-style-guide",
        label: "Final polish and submission quality",
        description: "Bring your work to a finish with editing discipline instead of rushing the last mile.",
        requires: ["edu-anki-or-quizlet-deck", "edu-skim-abstract-conclusion"],
      },
    ],
  },
  {
    slug: "career",
    label: "Career & work",
    description: "A career arc from self-inventory into search, interviewing, negotiation, growth, and eventual pivots.",
    nodes: [
      {
        slug: "car-brag-sheet-bullets",
        label: "Career inventory",
        description: "Get clear on your strengths, wins, evidence, and the kind of work you actually want more of.",
        requires: [],
      },
      {
        slug: "car-resume-ats-one-pager",
        label: "Resume and application basics",
        description: "Translate your past work into credible, readable application material.",
        requires: ["car-brag-sheet-bullets"],
      },
      {
        slug: "car-linkedin-headline-about",
        label: "Professional online presence",
        description: "Show up clearly in public-facing spaces so people can understand your direction and value quickly.",
        requires: ["car-brag-sheet-bullets"],
      },
      {
        slug: "car-informational-chat-script",
        label: "Networking and outreach",
        description: "Build relationships intentionally instead of only reaching out when you need something urgently.",
        requires: ["car-resume-ats-one-pager"],
      },
      {
        slug: "car-behavioral-story-bank",
        label: "Interview storytelling",
        description: "Explain your experience through examples that prove judgment, initiative, and results.",
        requires: ["car-informational-chat-script"],
      },
      {
        slug: "car-salary-band-research-doc",
        label: "Compensation research",
        description: "Know your market value well enough to negotiate from information instead of fear.",
        requires: ["car-behavioral-story-bank"],
      },
      {
        slug: "car-offer-email-counter",
        label: "Offer negotiation",
        description: "Respond to offers with more clarity, more professionalism, and less panic.",
        requires: ["car-salary-band-research-doc"],
      },
      {
        slug: "car-30-60-90-first-days",
        label: "Onboarding with intention",
        description: "Start strong in a new role by mapping stakeholders, priorities, and early wins.",
        requires: ["car-offer-email-counter"],
      },
      {
        slug: "car-1-1-agenda-doc",
        label: "Feedback and visibility",
        description: "Create the systems that help your work get noticed, supported, and improved over time.",
        requires: ["car-30-60-90-first-days"],
      },
      {
        slug: "car-stretch-assignment-pitch",
        label: "Stretch opportunities and growth",
        description: "Seek out the projects that increase scope, trust, and long-term career momentum.",
        requires: ["car-1-1-agenda-doc"],
      },
      {
        slug: "car-departure-timeline-checklist",
        label: "Strategic exit planning",
        description: "Know how to leave a role cleanly and on your own terms when the time is right.",
        requires: ["car-1-1-agenda-doc"],
      },
      {
        slug: "car-burnout-escalation-plan",
        label: "Burnout prevention and recovery",
        description: "Recognize overload early and respond before your work, health, or relationships absorb the damage.",
        requires: ["car-30-60-90-first-days"],
      },
      {
        slug: "car-side-project-scope-5h",
        label: "Side work and boundaries",
        description: "Build outside your day job without letting side projects wreck your energy or create legal problems.",
        requires: ["car-linkedin-headline-about", "car-resume-ats-one-pager"],
      },
    ],
  },
  {
    slug: "money",
    label: "Money & taxes",
    description: "A money arc from basic accounts into budgeting, taxes, debt, investing, shared finances, and protection.",
    nodes: [
      {
        slug: "fin-checking-plus-hysa",
        label: "Basic banking setup",
        description: "Create a simple account structure that supports bills, savings, and everyday stability.",
        requires: [],
      },
      {
        slug: "fin-credit-report-annual-pull",
        label: "Credit awareness",
        description: "Understand your reports, catch mistakes early, and protect future borrowing options.",
        requires: ["fin-checking-plus-hysa"],
      },
      {
        slug: "fin-ynab-or-spreadsheet-30d",
        label: "Spending awareness and budgeting",
        description: "See where money is actually going and start making choices with real numbers.",
        requires: ["fin-checking-plus-hysa"],
      },
      {
        slug: "fin-w4-or-quarterly-estimates",
        label: "Tax setup and withholding",
        description: "Stay ahead of taxes instead of treating them like a surprise waiting at the end of the year.",
        requires: ["fin-checking-plus-hysa"],
      },
      {
        slug: "fin-renters-auto-quote-compare",
        label: "Insurance basics",
        description: "Protect yourself from the kind of financial hits that can undo years of progress.",
        requires: ["fin-checking-plus-hysa"],
      },
      {
        slug: "fin-emergency-fund-target-date",
        label: "Emergency fund",
        description: "Build cash reserves so a bad month doesn't become a crisis.",
        requires: ["fin-ynab-or-spreadsheet-30d"],
      },
      {
        slug: "fin-debt-avalanche-schedule",
        label: "Debt payoff strategy",
        description: "Choose a repayment plan that is realistic, math-aware, and sustainable under stress.",
        requires: ["fin-ynab-or-spreadsheet-30d"],
      },
      {
        slug: "fin-401k-match-then-roth",
        label: "Retirement contributions",
        description: "Move from saving vaguely to funding long-term accounts with a deliberate priority order.",
        requires: ["fin-emergency-fund-target-date"],
      },
      {
        slug: "fin-three-fund-or-target-date",
        label: "Investment allocation",
        description: "Pick a simple long-term investing approach you can understand and stick with.",
        requires: ["fin-401k-match-then-roth"],
      },
      {
        slug: "fin-car-loan-tco-sheet",
        label: "Major purchase analysis",
        description: "Evaluate big decisions by total cost, not just the monthly payment.",
        requires: ["fin-emergency-fund-target-date"],
      },
      {
        slug: "fin-couples-three-account",
        label: "Shared finances with a partner",
        description: "Create a structure for money conversations that reduces secrecy, confusion, and repetitive fights.",
        requires: ["fin-ynab-or-spreadsheet-30d"],
      },
      {
        slug: "fin-phishing-credit-freeze",
        label: "Fraud and identity protection",
        description: "Protect your accounts, credit, and attention from scams that are built to exploit haste.",
        requires: ["fin-credit-report-annual-pull", "fin-checking-plus-hysa"],
      },
    ],
  },
  {
    slug: "housing",
    label: "Housing & independence",
    description: "A housing arc from priorities and leases into maintenance, boundaries, and eventually buying.",
    nodes: [
      {
        slug: "home-commute-clean-scorecard",
        label: "Housing priorities",
        description: "Know what matters most in a living situation before you start comparing options emotionally.",
        requires: [],
      },
      {
        slug: "home-roommate-agreement-signed",
        label: "Roommate expectations",
        description: "Set norms around guests, noise, chores, and money before small irritations become permanent conflict.",
        requires: ["home-commute-clean-scorecard"],
      },
      {
        slug: "home-lease-annotation-pass",
        label: "Lease literacy",
        description: "Actually understand what you are signing so you know your rights, limits, and exit options.",
        requires: ["home-commute-clean-scorecard"],
      },
      {
        slug: "home-move-line-item-budget",
        label: "Move planning",
        description: "Prepare for the real cost and work of changing homes, not just the rent number.",
        requires: ["home-lease-annotation-pass"],
      },
      {
        slug: "home-filter-smoke-carbon-schedule",
        label: "Basic home maintenance",
        description: "Build a maintenance rhythm so your home stays safer, cleaner, and cheaper to run.",
        requires: ["home-commute-clean-scorecard"],
      },
      {
        slug: "home-drain-winterize-checklist",
        label: "Seasonal upkeep",
        description: "Handle recurring seasonal jobs before weather and neglect turn them into repairs.",
        requires: ["home-filter-smoke-carbon-schedule"],
      },
      {
        slug: "home-ladder-gfci-rules",
        label: "DIY safety boundaries",
        description: "Know what jobs you can do, what safety practices matter, and where the line is to call a pro.",
        requires: ["home-filter-smoke-carbon-schedule"],
      },
      {
        slug: "home-dti-down-payment-note",
        label: "Buying readiness",
        description: "Figure out whether buying is realistic yet before getting emotionally attached to listings.",
        requires: ["home-move-line-item-budget"],
      },
      {
        slug: "home-loan-estimate-compare",
        label: "Mortgage comparison",
        description: "Compare financing options with enough precision to catch expensive differences early.",
        requires: ["home-dti-down-payment-note"],
      },
      {
        slug: "home-inspection-punch-list",
        label: "Inspection and negotiation",
        description: "Use inspections to make better decisions and negotiate from evidence instead of panic.",
        requires: ["home-loan-estimate-compare"],
      },
      {
        slug: "home-utility-rate-shop",
        label: "Utility and efficiency management",
        description: "Pay attention to the systems that quietly shape your monthly cost of living.",
        requires: ["home-drain-winterize-checklist"],
      },
      {
        slug: "home-neighbor-boundary-script",
        label: "Neighbor boundaries",
        description: "Handle recurring tension with neighbors directly, politely, and before it becomes a feud.",
        requires: ["home-roommate-agreement-signed", "home-lease-annotation-pass"],
      },
    ],
  },
  {
    slug: "health",
    label: "Health, mind & body",
    description: "A health arc from basic habits into care access, mental health support, and long-term resilience.",
    nodes: [
      {
        slug: "hlth-sleep-wake-fixed",
        label: "Sleep consistency",
        description: "Start with the daily rhythm that affects energy, mood, appetite, and recovery most.",
        requires: [],
      },
      {
        slug: "hlth-steps-or-zone2",
        label: "Movement baseline",
        description: "Build a level of movement you can sustain before chasing more ambitious fitness goals.",
        requires: ["hlth-sleep-wake-fixed"],
      },
      {
        slug: "hlth-protein-glass-rule",
        label: "Nutrition basics",
        description: "Support energy, hunger, and recovery with a few foundational habits before overcomplicating food.",
        requires: ["hlth-sleep-wake-fixed"],
      },
      {
        slug: "hlth-hrv-breath-drill",
        label: "Stress regulation",
        description: "Learn to interrupt spirals and bring your nervous system down without waiting for a collapse.",
        requires: ["hlth-sleep-wake-fixed"],
      },
      {
        slug: "hlth-pcp-annual-slot",
        label: "Primary care access",
        description: "Get connected to routine medical care before you need urgent medical care.",
        requires: ["hlth-protein-glass-rule"],
      },
      {
        slug: "hlth-age-screening-checklist",
        label: "Preventive screening habits",
        description: "Stay current on the boring preventive steps that meaningfully change long-term health outcomes.",
        requires: ["hlth-pcp-annual-slot"],
      },
      {
        slug: "hlth-chronic-flare-one-pager",
        label: "Chronic condition management",
        description: "Move from reacting to symptoms to planning around them more effectively.",
        requires: ["hlth-pcp-annual-slot"],
      },
      {
        slug: "hlth-therapy-three-consults",
        label: "Mental health support access",
        description: "Find the right kind of professional support instead of waiting until things feel unmanageable.",
        requires: ["hlth-hrv-breath-drill"],
      },
      {
        slug: "hlth-med-management-journal",
        label: "Medication tracking and follow-up",
        description: "Use better observation and communication so treatment decisions are more informed.",
        requires: ["hlth-therapy-three-consults"],
      },
      {
        slug: "hlth-dry-january-or-count",
        label: "Substance use awareness",
        description: "Take an honest look at patterns around alcohol or other substances before they harden into a problem.",
        requires: ["hlth-therapy-three-consults"],
      },
      {
        slug: "hlth-5x5-or-couch25k",
        label: "Structured training plan",
        description: "Progress from general movement into a real program with recovery and injury awareness built in.",
        requires: ["hlth-steps-or-zone2"],
      },
      {
        slug: "hlth-social-media-mute-list",
        label: "Body image resilience",
        description: "Reduce the pressure of comparison and build a healthier relationship with your body over time.",
        requires: ["hlth-5x5-or-couch25k", "hlth-protein-glass-rule"],
      },
    ],
  },
  {
    slug: "community",
    label: "Community & purpose",
    description: "A community arc from personal values into service, civic life, creative contribution, and legacy.",
    nodes: [
      {
        slug: "com-values-sort-four-quadrant",
        label: "Values clarity",
        description: "Get more specific about what matters to you before you start giving time and energy away.",
        requires: [],
      },
      {
        slug: "com-food-bank-two-shifts",
        label: "Consistent volunteering",
        description: "Move from wanting to help into showing up regularly enough to actually be useful.",
        requires: ["com-values-sort-four-quadrant"],
      },
      {
        slug: "com-town-hall-question-written",
        label: "Civic participation",
        description: "Learn how to engage with local institutions instead of treating civic life like background noise.",
        requires: ["com-values-sort-four-quadrant"],
      },
      {
        slug: "com-faith-or-secular-visit-three",
        label: "Belonging and meaning",
        description: "Explore communities of meaning, reflection, and ritual without forcing certainty too early.",
        requires: ["com-values-sort-four-quadrant"],
      },
      {
        slug: "com-mentor-ask-email-sent",
        label: "Finding mentors",
        description: "Learn how to ask for guidance in a way that respects other people's time and builds trust.",
        requires: ["com-food-bank-two-shifts"],
      },
      {
        slug: "com-100-day-creative-streak",
        label: "Creative consistency",
        description: "Build a creative practice that survives perfectionism and the urge to wait for inspiration.",
        requires: ["com-values-sort-four-quadrant"],
      },
      {
        slug: "com-five-minute-lightning-talk",
        label: "Public speaking confidence",
        description: "Share ideas in front of other people with more structure, courage, and less avoidance.",
        requires: ["com-mentor-ask-email-sent"],
      },
      {
        slug: "com-privacy-audit-social",
        label: "Online safety and boundaries",
        description: "Show up publicly without giving platforms or strangers more access than they need.",
        requires: ["com-100-day-creative-streak"],
      },
      {
        slug: "com-activist-rest-calendar",
        label: "Sustainable activism",
        description: "Contribute to causes you care about without turning purpose into burnout.",
        requires: ["com-town-hall-question-written"],
      },
      {
        slug: "com-block-captain-intro",
        label: "Local leadership",
        description: "Take responsibility for a small part of your community and become someone people can rely on.",
        requires: ["com-food-bank-two-shifts"],
      },
      {
        slug: "com-daf-or-will-intake-started",
        label: "Legacy and giving",
        description: "Think beyond the present and shape how your values continue through money, planning, and contribution.",
        requires: ["com-block-captain-intro"],
      },
      {
        slug: "com-public-post-mortem-written",
        label: "Sharing lessons publicly",
        description: "Contribute back to others by telling the truth about what you tried, learned, and would do differently.",
        requires: ["com-five-minute-lightning-talk", "com-100-day-creative-streak"],
      },
    ],
  },
];

/** All life skills flattened — forum subcategories and lookups use this list. */
export const LIFE_SKILL_TREE: SkillTreeNode[] = LIFE_SKILL_PILLARS.flatMap((p) => p.nodes);

const lifeBySlug = new Map(LIFE_SKILL_TREE.map((n) => [n.slug, n]));

const technicalByFieldAndSlug = new Map<string, Map<string, SkillTreeNode>>();
for (const field of TECHNICAL_FIELD_SLUGS) {
  const m = new Map<string, SkillTreeNode>();
  for (const n of TECHNICAL_SKILL_TREES[field]) {
    m.set(n.slug, n);
  }
  technicalByFieldAndSlug.set(field, m);
}

export function getLifeSkillNode(slug: string): SkillTreeNode | undefined {
  return lifeBySlug.get(slug);
}

export function getLifeSkillPillarBySkillSlug(
  skillSlug: string
): LifeSkillPillar | undefined {
  return LIFE_SKILL_PILLARS.find((pillar) =>
    pillar.nodes.some((node) => node.slug === skillSlug)
  );
}

export function getTechnicalSkillNode(
  fieldSlug: string,
  skillSlug: string
): SkillTreeNode | undefined {
  return technicalByFieldAndSlug.get(fieldSlug)?.get(skillSlug);
}

export function isTechnicalFieldSlug(slug: string): slug is TechnicalFieldSlug {
  return (TECHNICAL_FIELD_SLUGS as readonly string[]).includes(slug);
}

export function buildTechnicalSkillSubsection(
  fieldSlug: string,
  skillSlug: string
): string {
  return `${fieldSlug}${TECHNICAL_SEPARATOR}${skillSlug}`;
}

export function parseTechnicalSkillSubsection(
  subsectionSlug: string
): { fieldSlug: string; skillSlug: string } | null {
  const parts = subsectionSlug.split(TECHNICAL_SEPARATOR);
  if (parts.length !== 2) return null;
  const [fieldSlug, skillSlug] = parts;
  if (!fieldSlug || !skillSlug) return null;
  if (!getTechnicalSkillNode(fieldSlug, skillSlug)) return null;
  return { fieldSlug, skillSlug };
}

/** Longest prerequisite depth (0 = root skills). */
export function getTechnicalSkillDepth(fieldSlug: string, skillSlug: string): number {
  const node = getTechnicalSkillNode(fieldSlug, skillSlug);
  if (!node) return 0;
  let max = 0;
  for (const r of node.requires) {
    max = Math.max(max, 1 + getTechnicalSkillDepth(fieldSlug, r));
  }
  return max;
}

export function getLifeSkillDepth(skillSlug: string): number {
  const node = getLifeSkillNode(skillSlug);
  if (!node) return 0;
  let max = 0;
  for (const r of node.requires) {
    max = Math.max(max, 1 + getLifeSkillDepth(r));
  }
  return max;
}

export function topoSortSkillTree(nodes: SkillTreeNode[]): SkillTreeNode[] {
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));
  const visiting = new Set<string>();
  const done = new Set<string>();
  const out: SkillTreeNode[] = [];

  function visit(slug: string) {
    if (done.has(slug)) return;
    if (visiting.has(slug)) return;
    const n = bySlug.get(slug);
    if (!n) return;
    visiting.add(slug);
    for (const r of n.requires) visit(r);
    visiting.delete(slug);
    done.add(slug);
    out.push(n);
  }

  for (const n of nodes) visit(n.slug);
  return out;
}
