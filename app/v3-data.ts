export type StageModifier = "standard" | "velocity" | "pressure" | "fortress" | "chaos" | "boss";
export type Difficulty = "zen" | "arcade" | "legend";
export type GameMode = "solo" | "duel" | "campaign" | "survival" | "chaos" | "bossRush" | "hardcore" | "tutorial";
export type ElementSide = "ice" | "fire";
export type AiBehavior = "defensive" | "aggressive" | "predictive" | "impulsive" | "boss";
export type Rarity = "commun" | "rare" | "epique" | "legendaire";
export type PowerUpKind =
  | "overdrive"
  | "shield"
  | "titan"
  | "multiball"
  | "freeze"
  | "portal"
  | "phantom"
  | "magnet"
  | "reverse"
  | "clone"
  | "timeWarp"
  | "berserk"
  | "blackHole";

export type ObjectiveKind = "win" | "rally" | "perfect" | "noUltimate" | "maxConceded" | "time" | "smash" | "combo";

export type StageObjective = {
  id: string;
  kind: ObjectiveKind;
  target: number;
  label: string;
};

export type CampaignStage = {
  id: number;
  chapter: number;
  name: string;
  subtitle: string;
  aiSpeed: number;
  reaction: number;
  ballSpeed: number;
  winScore: number;
  playerHeight: number;
  enemyHeight: number;
  modifier: StageModifier;
  reward: number;
  aiBehavior: AiBehavior;
  objectives: [StageObjective, StageObjective, StageObjective];
  boss?: "KRYON" | "VORTEX" | "SOLARIS";
};

export type ElementSkin = {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  ice: string;
  iceLight: string;
  fire: string;
  fireLight: string;
  unlockLevel?: number;
};

export type PowerUpDefinition = {
  kind: PowerUpKind;
  symbol: string;
  label: string;
  description: string;
  color: string;
  rarity: Rarity;
  weight: number;
  duration: number;
};

export type MatchRecord = {
  id: string;
  timestamp: number;
  date: string;
  label: string;
  mode: GameMode;
  result: "victoire" | "défaite";
  ice: number;
  fire: number;
  rally: number;
  duration: number;
  difficulty: Difficulty;
  perfectHits: number;
  smashes: number;
};

export type Quality = "auto" | "performance" | "high" | "ultra";

export type GameSettings = {
  music: number;
  effects: number;
  vibrations: boolean;
  quality: Quality;
  screenShake: boolean;
  flashes: boolean;
  reduceEffects: boolean;
  tutorialEnabled: boolean;
};

export type DetailedStats = {
  matches: number;
  wins: number;
  losses: number;
  totalSeconds: number;
  totalRallyHits: number;
  bestRally: number;
  perfectHits: number;
  smashes: number;
  ultimates: number;
  powerUps: Record<string, number>;
  maxBallSpeed: number;
  bossesDefeated: string[];
  shardsEarned: number;
  survivalBest: number;
  survivalRally: number;
  bossRushBest: number;
};

export type ArsenalCategory = "paddles" | "balls" | "trails" | "impacts" | "victories" | "ultimates" | "arenas";

export type CosmeticItem = {
  id: string;
  category: ArsenalCategory;
  name: string;
  subtitle: string;
  price: number;
  color: string;
  accent: string;
  unlockLevel?: number;
  achievement?: string;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  stat: keyof DetailedStats | "campaignStars" | "campaignComplete" | "bossCount" | "level" | "winStreak" | "perfectWin" | "daily";
  target: number;
  reward: number;
  hidden?: boolean;
};

export type DailyChallenge = {
  date: string;
  id: string;
  title: string;
  description: string;
  stat: "wins" | "rally" | "perfect" | "smash" | "powerUps" | "matches";
  target: number;
  reward: number;
};

export type V3Profile = {
  profileVersion: 3;
  pseudo: string;
  avatar: string;
  level: number;
  xp: number;
  title: string;
  unlockedStage: number;
  stars: Record<string, number>;
  completedObjectives: Record<string, string[]>;
  shards: number;
  ownedSkins: string[];
  activeSkin: string;
  ownedCosmetics: Record<ArsenalCategory, string[]>;
  equippedCosmetics: Record<ArsenalCategory, string>;
  records: MatchRecord[];
  stats: DetailedStats;
  achievements: Record<string, number>;
  daily: { date: string; id: string; progress: number; completed: boolean; rewarded: boolean };
  tutorialCompleted: boolean;
  settings: GameSettings;
  winStreak: number;
};

export type LegacyV2Profile = {
  unlockedStage?: number;
  stars?: Record<string, number>;
  shards?: number;
  ownedSkins?: string[];
  activeSkin?: string;
  records?: Array<Partial<MatchRecord> & { rally?: number; ice?: number; fire?: number; date?: string; label?: string; result?: "victoire" | "défaite" }>;
};

export const PROFILE_KEY = "cr3atix-pong-v3-profile";
export const LEGACY_PROFILE_KEY = "elemental-pong-v2-profile";
export const LEGACY_STATS_KEY = "elemental-pong-stats";

export const DEFAULT_SETTINGS: GameSettings = {
  music: 24,
  effects: 72,
  vibrations: true,
  quality: "auto",
  screenShake: true,
  flashes: true,
  reduceEffects: false,
  tutorialEnabled: true,
};

export const DEFAULT_STATS: DetailedStats = {
  matches: 0,
  wins: 0,
  losses: 0,
  totalSeconds: 0,
  totalRallyHits: 0,
  bestRally: 0,
  perfectHits: 0,
  smashes: 0,
  ultimates: 0,
  powerUps: {},
  maxBallSpeed: 0,
  bossesDefeated: [],
  shardsEarned: 0,
  survivalBest: 0,
  survivalRally: 0,
  bossRushBest: 0,
};

export const DEFAULT_OWNED_COSMETICS: Record<ArsenalCategory, string[]> = {
  paddles: ["origin"],
  balls: ["core"],
  trails: ["ion"],
  impacts: ["spark"],
  victories: ["pulse"],
  ultimates: ["elemental"],
  arenas: ["ascension"],
};

export const DEFAULT_EQUIPPED_COSMETICS: Record<ArsenalCategory, string> = {
  paddles: "origin",
  balls: "core",
  trails: "ion",
  impacts: "spark",
  victories: "pulse",
  ultimates: "elemental",
  arenas: "ascension",
};

export const DEFAULT_PROFILE: V3Profile = {
  profileVersion: 3,
  pseudo: "PILOTE",
  avatar: "❄",
  level: 1,
  xp: 0,
  title: "ÉVEILLÉ DU GIVRE",
  unlockedStage: 1,
  stars: {},
  completedObjectives: {},
  shards: 0,
  ownedSkins: ["origin"],
  activeSkin: "origin",
  ownedCosmetics: DEFAULT_OWNED_COSMETICS,
  equippedCosmetics: DEFAULT_EQUIPPED_COSMETICS,
  records: [],
  stats: DEFAULT_STATS,
  achievements: {},
  daily: { date: "", id: "", progress: 0, completed: false, rewarded: false },
  tutorialCompleted: false,
  settings: DEFAULT_SETTINGS,
  winStreak: 0,
};

export const CHAPTERS = [
  { id: 1, label: "CHAPITRE I", name: "Royaume boréal", color: "#3de7ff", description: "Cristaux, neige et brume cyan." },
  { id: 2, label: "CHAPITRE II", name: "Faille thermique", color: "#a77dff", description: "Portails, distorsions et éclairs violets." },
  { id: 3, label: "CHAPITRE III", name: "Empire du brasier", color: "#ff6138", description: "Lave, braises et plasma solaire." },
  { id: 4, label: "CHAPITRE IV", name: "Orbite de cristal", color: "#3de7ff", description: "Arènes 13 à 17 · Défis avancés." },
  { id: 5, label: "CHAPITRE V", name: "Tempête du Rift", color: "#a77dff", description: "Arènes 18 à 22 · Défis avancés." },
  { id: 6, label: "CHAPITRE VI", name: "Couronne de plasma", color: "#ff6138", description: "Arènes 23 à 27 · Défis avancés." },
  { id: 7, label: "CHAPITRE VII", name: "Nuit polaire", color: "#3de7ff", description: "Arènes 28 à 32 · Défis avancés." },
  { id: 8, label: "CHAPITRE VIII", name: "Horizon fracturé", color: "#a77dff", description: "Arènes 33 à 37 · Défis avancés." },
  { id: 9, label: "CHAPITRE IX", name: "Cœur de supernova", color: "#ff6138", description: "Arènes 38 à 42 · Défis avancés." },
  { id: 10, label: "CHAPITRE X", name: "Ascension finale", color: "#ffd36c", description: "Arènes 43 à 50 · Défis avancés." },
] as const;

const win = (id: string, label = "Remporter le combat"): StageObjective => ({ id, kind: "win", target: 1, label });
const objective = (id: string, kind: ObjectiveKind, target: number, label: string): StageObjective => ({ id, kind, target, label });

export const CAMPAIGN_STAGES: CampaignStage[] = [
  { id: 1, chapter: 1, name: "Éveil du givre", subtitle: "Maîtrise les fondamentaux", aiSpeed: 520, reaction: 70, ballSpeed: 570, winScore: 4, playerHeight: 188, enemyHeight: 164, modifier: "standard", reward: 28, aiBehavior: "defensive", objectives: [win("s1-win"), objective("s1-rally", "rally", 10, "Atteindre un rally de 10"), objective("s1-perfect", "perfect", 2, "Réaliser 2 Perfect Hits")] },
  { id: 2, chapter: 1, name: "Brise polaire", subtitle: "La vitesse monte à chaque échange", aiSpeed: 580, reaction: 54, ballSpeed: 625, winScore: 4, playerHeight: 180, enemyHeight: 170, modifier: "velocity", reward: 32, aiBehavior: "aggressive", objectives: [win("s2-win"), objective("s2-rally", "rally", 15, "Atteindre un rally de 15"), objective("s2-time", "time", 90, "Gagner en moins de 90 s")] },
  { id: 3, chapter: 1, name: "Cercle boréal", subtitle: "Le chaos devient contrôlable", aiSpeed: 630, reaction: 46, ballSpeed: 655, winScore: 5, playerHeight: 176, enemyHeight: 176, modifier: "chaos", reward: 38, aiBehavior: "impulsive", objectives: [win("s3-win"), objective("s3-power", "combo", 3, "Atteindre un combo ×3"), objective("s3-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 4, chapter: 1, name: "Sentinelle du Nord", subtitle: "KRYON dresse ses murs de glace", aiSpeed: 700, reaction: 34, ballSpeed: 690, winScore: 5, playerHeight: 174, enemyHeight: 218, modifier: "boss", reward: 70, aiBehavior: "boss", boss: "KRYON", objectives: [win("s4-win", "Vaincre KRYON"), objective("s4-smash", "smash", 2, "Réussir 2 Smashs"), objective("s4-ult", "noUltimate", 0, "Vaincre sans Ultimate")] },
  { id: 5, chapter: 2, name: "Rift instable", subtitle: "Les portails déforment le duel", aiSpeed: 720, reaction: 32, ballSpeed: 710, winScore: 5, playerHeight: 170, enemyHeight: 182, modifier: "chaos", reward: 45, aiBehavior: "impulsive", objectives: [win("s5-win"), objective("s5-rally", "rally", 20, "Atteindre un rally de 20"), objective("s5-perfect", "perfect", 4, "Réaliser 4 Perfect Hits")] },
  { id: 6, chapter: 2, name: "Pression violette", subtitle: "Ta défense se contracte par vagues", aiSpeed: 755, reaction: 29, ballSpeed: 740, winScore: 5, playerHeight: 166, enemyHeight: 184, modifier: "pressure", reward: 50, aiBehavior: "predictive", objectives: [win("s6-win"), objective("s6-concede", "maxConceded", 2, "Encaisser au maximum 2 points"), objective("s6-smash", "smash", 3, "Réussir 3 Smashs")] },
  { id: 7, chapter: 2, name: "Accélérateur Ω", subtitle: "Chaque retour nourrit la vélocité", aiSpeed: 805, reaction: 25, ballSpeed: 785, winScore: 6, playerHeight: 166, enemyHeight: 188, modifier: "velocity", reward: 56, aiBehavior: "aggressive", objectives: [win("s7-win"), objective("s7-rally", "rally", 25, "Atteindre un rally de 25"), objective("s7-combo", "combo", 4, "Atteindre un combo ×4")] },
  { id: 8, chapter: 2, name: "Maître de la Faille", subtitle: "VORTEX brise les trajectoires", aiSpeed: 735, reaction: 92, ballSpeed: 720, winScore: 5, playerHeight: 184, enemyHeight: 188, modifier: "boss", reward: 95, aiBehavior: "impulsive", boss: "VORTEX", objectives: [win("s8-win", "Vaincre VORTEX"), objective("s8-perfect", "perfect", 3, "Réaliser 3 Perfect Hits"), objective("s8-time", "time", 150, "Vaincre en moins de 150 s")] },
  { id: 9, chapter: 3, name: "Pluie de braises", subtitle: "Le plasma répond à chaque impact", aiSpeed: 875, reaction: 20, ballSpeed: 825, winScore: 6, playerHeight: 166, enemyHeight: 194, modifier: "standard", reward: 62, aiBehavior: "predictive", objectives: [win("s9-win"), objective("s9-rally", "rally", 30, "Atteindre un rally de 30"), objective("s9-concede", "maxConceded", 1, "Encaisser au maximum 1 point")] },
  { id: 10, chapter: 3, name: "Forteresse ardente", subtitle: "Un rempart destructible protège le feu", aiSpeed: 915, reaction: 17, ballSpeed: 845, winScore: 6, playerHeight: 162, enemyHeight: 218, modifier: "fortress", reward: 68, aiBehavior: "defensive", objectives: [win("s10-win"), objective("s10-smash", "smash", 5, "Réussir 5 Smashs"), objective("s10-ult", "noUltimate", 0, "Gagner sans Ultimate")] },
  { id: 11, chapter: 3, name: "Point de fusion", subtitle: "La balle frôle sa limite stable", aiSpeed: 955, reaction: 14, ballSpeed: 880, winScore: 7, playerHeight: 156, enemyHeight: 204, modifier: "velocity", reward: 76, aiBehavior: "aggressive", objectives: [win("s11-win"), objective("s11-rally", "rally", 40, "Atteindre un rally de 40"), objective("s11-combo", "combo", 5, "Atteindre un combo ×5")] },
  { id: 12, chapter: 3, name: "Trône solaire", subtitle: "SOLARIS libère ses trois phases", aiSpeed: 1010, reaction: 10, ballSpeed: 910, winScore: 7, playerHeight: 154, enemyHeight: 242, modifier: "boss", reward: 150, aiBehavior: "boss", boss: "SOLARIS", objectives: [win("s12-win", "Vaincre SOLARIS"), objective("s12-rally", "rally", 35, "Atteindre un rally de 35"), objective("s12-time", "time", 150, "Vaincre en moins de 150 s")] },
  { id: 13, chapter: 4, name: "Éclat orbital", subtitle: "Précision et maîtrise des échanges", aiSpeed: 940, reaction: 24, ballSpeed: 900, winScore: 7, playerHeight: 166, enemyHeight: 190, modifier: "standard", reward: 90, aiBehavior: "predictive", objectives: [win("s13-win"), objective("s13-perfect", "perfect", 3, "Réaliser 3 Perfect Hits"), objective("s13-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 14, chapter: 4, name: "Miroir de glace", subtitle: "Adapte tes retours aux distorsions", aiSpeed: 945, reaction: 24, ballSpeed: 905, winScore: 7, playerHeight: 166, enemyHeight: 190, modifier: "chaos", reward: 93, aiBehavior: "impulsive", objectives: [win("s14-win"), objective("s14-smash", "smash", 3, "Réussir 3 Smashs"), objective("s14-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 15, chapter: 4, name: "Anneaux givrés", subtitle: "Tiens bon sous la pression", aiSpeed: 950, reaction: 24, ballSpeed: 910, winScore: 7, playerHeight: 166, enemyHeight: 190, modifier: "pressure", reward: 96, aiBehavior: "predictive", objectives: [win("s15-win"), objective("s15-combo", "combo", 3, "Atteindre un combo ×3"), objective("s15-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 16, chapter: 4, name: "Bastion céleste", subtitle: "Perce la défense adverse", aiSpeed: 955, reaction: 23, ballSpeed: 915, winScore: 7, playerHeight: 165, enemyHeight: 191, modifier: "fortress", reward: 99, aiBehavior: "defensive", objectives: [win("s16-win"), objective("s16-perfect", "perfect", 3, "Réaliser 3 Perfect Hits"), objective("s16-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 17, chapter: 4, name: "Retour de KRYON", subtitle: "KRYON défend son arène", aiSpeed: 960, reaction: 23, ballSpeed: 920, winScore: 7, playerHeight: 165, enemyHeight: 224, modifier: "boss", reward: 172, aiBehavior: "boss", boss: "KRYON", objectives: [win("s17-win"), objective("s17-smash", "smash", 3, "Réussir 3 Smashs"), objective("s17-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 18, chapter: 5, name: "Fissure quantique", subtitle: "Précision et maîtrise des échanges", aiSpeed: 965, reaction: 23, ballSpeed: 925, winScore: 7, playerHeight: 165, enemyHeight: 191, modifier: "standard", reward: 105, aiBehavior: "predictive", objectives: [win("s18-win"), objective("s18-combo", "combo", 3, "Atteindre un combo ×3"), objective("s18-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 19, chapter: 5, name: "Danse des portails", subtitle: "Adapte tes retours aux distorsions", aiSpeed: 970, reaction: 22, ballSpeed: 930, winScore: 7, playerHeight: 164, enemyHeight: 192, modifier: "chaos", reward: 108, aiBehavior: "impulsive", objectives: [win("s19-win"), objective("s19-perfect", "perfect", 3, "Réaliser 3 Perfect Hits"), objective("s19-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 20, chapter: 5, name: "Écho violet", subtitle: "Tiens bon sous la pression", aiSpeed: 975, reaction: 22, ballSpeed: 935, winScore: 7, playerHeight: 164, enemyHeight: 192, modifier: "pressure", reward: 111, aiBehavior: "predictive", objectives: [win("s20-win"), objective("s20-smash", "smash", 3, "Réussir 3 Smashs"), objective("s20-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 21, chapter: 5, name: "Compression astrale", subtitle: "Perce la défense adverse", aiSpeed: 980, reaction: 22, ballSpeed: 940, winScore: 7, playerHeight: 164, enemyHeight: 192, modifier: "fortress", reward: 114, aiBehavior: "defensive", objectives: [win("s21-win"), objective("s21-combo", "combo", 3, "Atteindre un combo ×3"), objective("s21-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 22, chapter: 5, name: "Retour de VORTEX", subtitle: "VORTEX défend son arène", aiSpeed: 985, reaction: 21, ballSpeed: 945, winScore: 7, playerHeight: 163, enemyHeight: 224, modifier: "boss", reward: 187, aiBehavior: "boss", boss: "VORTEX", objectives: [win("s22-win"), objective("s22-perfect", "perfect", 3, "Réaliser 3 Perfect Hits"), objective("s22-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 23, chapter: 6, name: "Étincelle royale", subtitle: "Précision et maîtrise des échanges", aiSpeed: 990, reaction: 21, ballSpeed: 950, winScore: 7, playerHeight: 163, enemyHeight: 193, modifier: "standard", reward: 120, aiBehavior: "predictive", objectives: [win("s23-win"), objective("s23-smash", "smash", 4, "Réussir 4 Smashs"), objective("s23-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 24, chapter: 6, name: "Vague de plasma", subtitle: "Adapte tes retours aux distorsions", aiSpeed: 995, reaction: 21, ballSpeed: 955, winScore: 7, playerHeight: 163, enemyHeight: 193, modifier: "chaos", reward: 123, aiBehavior: "impulsive", objectives: [win("s24-win"), objective("s24-combo", "combo", 4, "Atteindre un combo ×4"), objective("s24-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 25, chapter: 6, name: "Rempart incandescent", subtitle: "Tiens bon sous la pression", aiSpeed: 1000, reaction: 20, ballSpeed: 960, winScore: 7, playerHeight: 162, enemyHeight: 194, modifier: "pressure", reward: 126, aiBehavior: "predictive", objectives: [win("s25-win"), objective("s25-perfect", "perfect", 4, "Réaliser 4 Perfect Hits"), objective("s25-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 26, chapter: 6, name: "Course des comètes", subtitle: "Perce la défense adverse", aiSpeed: 1005, reaction: 20, ballSpeed: 965, winScore: 8, playerHeight: 162, enemyHeight: 194, modifier: "fortress", reward: 129, aiBehavior: "defensive", objectives: [win("s26-win"), objective("s26-smash", "smash", 4, "Réussir 4 Smashs"), objective("s26-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 27, chapter: 6, name: "Retour de SOLARIS", subtitle: "SOLARIS défend son arène", aiSpeed: 1010, reaction: 20, ballSpeed: 970, winScore: 8, playerHeight: 162, enemyHeight: 224, modifier: "boss", reward: 202, aiBehavior: "boss", boss: "SOLARIS", objectives: [win("s27-win"), objective("s27-combo", "combo", 4, "Atteindre un combo ×4"), objective("s27-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 28, chapter: 7, name: "Veille des glaces", subtitle: "Précision et maîtrise des échanges", aiSpeed: 1015, reaction: 19, ballSpeed: 975, winScore: 8, playerHeight: 161, enemyHeight: 195, modifier: "standard", reward: 135, aiBehavior: "predictive", objectives: [win("s28-win"), objective("s28-perfect", "perfect", 4, "Réaliser 4 Perfect Hits"), objective("s28-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 29, chapter: 7, name: "Souffle nocturne", subtitle: "Adapte tes retours aux distorsions", aiSpeed: 1020, reaction: 19, ballSpeed: 980, winScore: 8, playerHeight: 161, enemyHeight: 195, modifier: "chaos", reward: 138, aiBehavior: "impulsive", objectives: [win("s29-win"), objective("s29-smash", "smash", 4, "Réussir 4 Smashs"), objective("s29-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 30, chapter: 7, name: "Mur de cristal", subtitle: "Tiens bon sous la pression", aiSpeed: 1025, reaction: 19, ballSpeed: 985, winScore: 8, playerHeight: 161, enemyHeight: 195, modifier: "pressure", reward: 141, aiBehavior: "predictive", objectives: [win("s30-win"), objective("s30-combo", "combo", 4, "Atteindre un combo ×4"), objective("s30-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 31, chapter: 7, name: "Bourrasque stellaire", subtitle: "Perce la défense adverse", aiSpeed: 1030, reaction: 18, ballSpeed: 990, winScore: 8, playerHeight: 160, enemyHeight: 196, modifier: "fortress", reward: 144, aiBehavior: "defensive", objectives: [win("s31-win"), objective("s31-perfect", "perfect", 4, "Réaliser 4 Perfect Hits"), objective("s31-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 32, chapter: 7, name: "KRYON éternel", subtitle: "KRYON défend son arène", aiSpeed: 1035, reaction: 18, ballSpeed: 995, winScore: 8, playerHeight: 160, enemyHeight: 224, modifier: "boss", reward: 217, aiBehavior: "boss", boss: "KRYON", objectives: [win("s32-win"), objective("s32-smash", "smash", 4, "Réussir 4 Smashs"), objective("s32-concede", "maxConceded", 3, "Encaisser au maximum 3 points")] },
  { id: 33, chapter: 8, name: "Parallaxe", subtitle: "Précision et maîtrise des échanges", aiSpeed: 1040, reaction: 18, ballSpeed: 1000, winScore: 8, playerHeight: 160, enemyHeight: 196, modifier: "standard", reward: 150, aiBehavior: "predictive", objectives: [win("s33-win"), objective("s33-combo", "combo", 5, "Atteindre un combo ×5"), objective("s33-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 34, chapter: 8, name: "Vertige spatial", subtitle: "Adapte tes retours aux distorsions", aiSpeed: 1045, reaction: 17, ballSpeed: 1005, winScore: 8, playerHeight: 159, enemyHeight: 197, modifier: "chaos", reward: 153, aiBehavior: "impulsive", objectives: [win("s34-win"), objective("s34-perfect", "perfect", 5, "Réaliser 5 Perfect Hits"), objective("s34-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 35, chapter: 8, name: "Prison du Rift", subtitle: "Tiens bon sous la pression", aiSpeed: 1050, reaction: 17, ballSpeed: 1010, winScore: 8, playerHeight: 159, enemyHeight: 197, modifier: "pressure", reward: 156, aiBehavior: "predictive", objectives: [win("s35-win"), objective("s35-smash", "smash", 5, "Réussir 5 Smashs"), objective("s35-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 36, chapter: 8, name: "Orage dimensionnel", subtitle: "Perce la défense adverse", aiSpeed: 1055, reaction: 17, ballSpeed: 1015, winScore: 8, playerHeight: 159, enemyHeight: 197, modifier: "fortress", reward: 159, aiBehavior: "defensive", objectives: [win("s36-win"), objective("s36-combo", "combo", 5, "Atteindre un combo ×5"), objective("s36-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 37, chapter: 8, name: "VORTEX absolu", subtitle: "VORTEX défend son arène", aiSpeed: 1060, reaction: 16, ballSpeed: 1020, winScore: 8, playerHeight: 158, enemyHeight: 224, modifier: "boss", reward: 232, aiBehavior: "boss", boss: "VORTEX", objectives: [win("s37-win"), objective("s37-perfect", "perfect", 5, "Réaliser 5 Perfect Hits"), objective("s37-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 38, chapter: 9, name: "Poussière solaire", subtitle: "Précision et maîtrise des échanges", aiSpeed: 1065, reaction: 16, ballSpeed: 1025, winScore: 8, playerHeight: 158, enemyHeight: 198, modifier: "standard", reward: 165, aiBehavior: "predictive", objectives: [win("s38-win"), objective("s38-smash", "smash", 5, "Réussir 5 Smashs"), objective("s38-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 39, chapter: 9, name: "Marée de feu", subtitle: "Adapte tes retours aux distorsions", aiSpeed: 1070, reaction: 16, ballSpeed: 1030, winScore: 9, playerHeight: 158, enemyHeight: 198, modifier: "chaos", reward: 168, aiBehavior: "impulsive", objectives: [win("s39-win"), objective("s39-combo", "combo", 5, "Atteindre un combo ×5"), objective("s39-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 40, chapter: 9, name: "Forge des étoiles", subtitle: "Tiens bon sous la pression", aiSpeed: 1075, reaction: 15, ballSpeed: 1035, winScore: 9, playerHeight: 157, enemyHeight: 199, modifier: "pressure", reward: 171, aiBehavior: "predictive", objectives: [win("s40-win"), objective("s40-perfect", "perfect", 5, "Réaliser 5 Perfect Hits"), objective("s40-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 41, chapter: 9, name: "Impact cosmique", subtitle: "Perce la défense adverse", aiSpeed: 1080, reaction: 15, ballSpeed: 1040, winScore: 9, playerHeight: 157, enemyHeight: 199, modifier: "fortress", reward: 174, aiBehavior: "defensive", objectives: [win("s41-win"), objective("s41-smash", "smash", 5, "Réussir 5 Smashs"), objective("s41-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 42, chapter: 9, name: "SOLARIS exalté", subtitle: "SOLARIS défend son arène", aiSpeed: 1085, reaction: 15, ballSpeed: 1045, winScore: 9, playerHeight: 157, enemyHeight: 224, modifier: "boss", reward: 247, aiBehavior: "boss", boss: "SOLARIS", objectives: [win("s42-win"), objective("s42-combo", "combo", 5, "Atteindre un combo ×5"), objective("s42-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 43, chapter: 10, name: "Seuil des légendes", subtitle: "Précision et maîtrise des échanges", aiSpeed: 1090, reaction: 14, ballSpeed: 1050, winScore: 9, playerHeight: 156, enemyHeight: 200, modifier: "standard", reward: 180, aiBehavior: "predictive", objectives: [win("s43-win"), objective("s43-perfect", "perfect", 6, "Réaliser 6 Perfect Hits"), objective("s43-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 44, chapter: 10, name: "Spirale ultime", subtitle: "Adapte tes retours aux distorsions", aiSpeed: 1095, reaction: 14, ballSpeed: 1055, winScore: 9, playerHeight: 156, enemyHeight: 200, modifier: "chaos", reward: 183, aiBehavior: "impulsive", objectives: [win("s44-win"), objective("s44-smash", "smash", 6, "Réussir 6 Smashs"), objective("s44-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 45, chapter: 10, name: "Citadelle du vide", subtitle: "Tiens bon sous la pression", aiSpeed: 1100, reaction: 14, ballSpeed: 1060, winScore: 9, playerHeight: 156, enemyHeight: 200, modifier: "pressure", reward: 186, aiBehavior: "predictive", objectives: [win("s45-win"), objective("s45-combo", "combo", 6, "Atteindre un combo ×6"), objective("s45-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 46, chapter: 10, name: "Dernière accélération", subtitle: "Perce la défense adverse", aiSpeed: 1105, reaction: 13, ballSpeed: 1065, winScore: 9, playerHeight: 155, enemyHeight: 201, modifier: "fortress", reward: 189, aiBehavior: "defensive", objectives: [win("s46-win"), objective("s46-perfect", "perfect", 6, "Réaliser 6 Perfect Hits"), objective("s46-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 47, chapter: 10, name: "Épreuve du givre", subtitle: "KRYON défend son arène", aiSpeed: 1110, reaction: 13, ballSpeed: 1070, winScore: 9, playerHeight: 155, enemyHeight: 224, modifier: "boss", reward: 262, aiBehavior: "boss", boss: "KRYON", objectives: [win("s47-win"), objective("s47-smash", "smash", 6, "Réussir 6 Smashs"), objective("s47-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 48, chapter: 10, name: "Épreuve de la faille", subtitle: "VORTEX défend son arène", aiSpeed: 1115, reaction: 13, ballSpeed: 1075, winScore: 9, playerHeight: 155, enemyHeight: 224, modifier: "boss", reward: 265, aiBehavior: "boss", boss: "VORTEX", objectives: [win("s48-win"), objective("s48-combo", "combo", 6, "Atteindre un combo ×6"), objective("s48-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 49, chapter: 10, name: "Épreuve du brasier", subtitle: "SOLARIS défend son arène", aiSpeed: 1120, reaction: 12, ballSpeed: 1080, winScore: 9, playerHeight: 154, enemyHeight: 224, modifier: "boss", reward: 268, aiBehavior: "boss", boss: "SOLARIS", objectives: [win("s49-win"), objective("s49-perfect", "perfect", 6, "Réaliser 6 Perfect Hits"), objective("s49-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
  { id: 50, chapter: 10, name: "Trône des éléments", subtitle: "SOLARIS défend son arène", aiSpeed: 1125, reaction: 12, ballSpeed: 1085, winScore: 9, playerHeight: 154, enemyHeight: 224, modifier: "boss", reward: 271, aiBehavior: "boss", boss: "SOLARIS", objectives: [win("s50-win"), objective("s50-smash", "smash", 6, "Réussir 6 Smashs"), objective("s50-concede", "maxConceded", 2, "Encaisser au maximum 2 points")] },
];

export const ELEMENT_SKINS: ElementSkin[] = [
  { id: "origin", name: "ORIGIN", subtitle: "Glace pure · Feu primal", price: 0, ice: "#3de7ff", iceLight: "#c8fbff", fire: "#ff522d", fireLight: "#ffd08b" },
  { id: "nebula", name: "NEBULA", subtitle: "Arc violet · Plasma rose", price: 120, ice: "#9b7dff", iceLight: "#e9e0ff", fire: "#ff4fa3", fireLight: "#ffd2e9" },
  { id: "toxic", name: "TOXIC RIFT", subtitle: "Éther acide · Or solaire", price: 240, ice: "#5cff9b", iceLight: "#d8ffe6", fire: "#ffd93d", fireLight: "#fff3ad", unlockLevel: 12 },
  { id: "chrome", name: "VOID CHROME", subtitle: "Cobalt lunaire · Magma blanc", price: 380, ice: "#77a9ff", iceLight: "#eef5ff", fire: "#ff786c", fireLight: "#fff0e8", unlockLevel: 24 },
  { id: "royal", name: "ROYAL RIFT", subtitle: "Cyan royal · Pourpre solaire", price: 560, ice: "#4fdcff", iceLight: "#ffffff", fire: "#ff3c83", fireLight: "#ffe7a8", unlockLevel: 40 },
];

export const POWER_UPS: PowerUpDefinition[] = [
  { kind: "overdrive", symbol: "»", label: "SURCHARGE", description: "Accélère la balle sans casser sa trajectoire.", color: "#be8cff", rarity: "commun", weight: 16, duration: 0 },
  { kind: "shield", symbol: "◇", label: "BOUCLIER", description: "Intercepte une balle derrière ta raquette.", color: "#8ff8ff", rarity: "commun", weight: 15, duration: 0 },
  { kind: "titan", symbol: "↕", label: "TITAN", description: "Agrandit temporairement ta raquette.", color: "#ffd36c", rarity: "commun", weight: 14, duration: 8 },
  { kind: "freeze", symbol: "❄", label: "FREEZE", description: "Ralentit brièvement la raquette adverse.", color: "#77ecff", rarity: "rare", weight: 9, duration: 4.5 },
  { kind: "portal", symbol: "◎", label: "PORTAL", description: "Ouvre une paire de portails lisibles.", color: "#a875ff", rarity: "rare", weight: 8, duration: 7 },
  { kind: "magnet", symbol: "∩", label: "MAGNET", description: "Attire légèrement la balle vers ta raquette.", color: "#ff8bd1", rarity: "rare", weight: 8, duration: 5.5 },
  { kind: "reverse", symbol: "↯", label: "REVERSE", description: "Inverse brièvement les commandes adverses.", color: "#ffcf66", rarity: "rare", weight: 7, duration: 3.5 },
  { kind: "berserk", symbol: "▲", label: "BERSERK", description: "Réduit et accélère la balle active.", color: "#ff603f", rarity: "rare", weight: 7, duration: 6 },
  { kind: "multiball", symbol: "◉", label: "MULTIBALL", description: "Ajoute jusqu’à deux balles sans double point.", color: "#fff29a", rarity: "epique", weight: 6, duration: 0 },
  { kind: "phantom", symbol: "◌", label: "PHANTOM", description: "Rend la balle semi-invisible mais jamais illisible.", color: "#d3c8ff", rarity: "epique", weight: 5, duration: 5 },
  { kind: "clone", symbol: "Ⅱ", label: "CLONE", description: "Ajoute une mini-raquette synchronisée.", color: "#77ffbd", rarity: "epique", weight: 5, duration: 7 },
  { kind: "timeWarp", symbol: "◷", label: "TIME WARP", description: "Ralentit le temps pour reprendre le contrôle.", color: "#e8f0ff", rarity: "legendaire", weight: 3, duration: 4 },
  { kind: "blackHole", symbol: "●", label: "BLACK HOLE", description: "Courbe toutes les trajectoires vers un noyau.", color: "#8e63ff", rarity: "legendaire", weight: 2, duration: 6 },
];

export const ARSENAL_CATEGORIES: Array<{ id: ArsenalCategory; label: string }> = [
  { id: "paddles", label: "RAQUETTES" },
  { id: "balls", label: "BALLES" },
  { id: "trails", label: "TRAÎNÉES" },
  { id: "impacts", label: "IMPACTS" },
  { id: "victories", label: "VICTOIRES" },
  { id: "ultimates", label: "ULTIMATES" },
  { id: "arenas", label: "ARÈNES" },
];

export const COSMETICS: CosmeticItem[] = [
  ...ELEMENT_SKINS.map((skin) => ({ id: skin.id, category: "paddles" as const, name: skin.name, subtitle: skin.subtitle, price: skin.price, color: skin.ice, accent: skin.fire, unlockLevel: skin.unlockLevel })),
  { id: "core", category: "balls", name: "NOYAU ORIGIN", subtitle: "Sphère élémentaire équilibrée", price: 0, color: "#ffffff", accent: "#9feeff" },
  { id: "prism", category: "balls", name: "PRISME", subtitle: "Anneaux chromatiques", price: 150, color: "#d7c8ff", accent: "#ff6c9e", unlockLevel: 8 },
  { id: "singularity", category: "balls", name: "SINGULARITÉ", subtitle: "Cœur noir à halo violet", price: 420, color: "#171027", accent: "#9c6cff", unlockLevel: 30 },
  { id: "ion", category: "trails", name: "ION", subtitle: "Traînée élémentaire nette", price: 0, color: "#68eaff", accent: "#ff6944" },
  { id: "comet", category: "trails", name: "COMÈTE", subtitle: "Poussière stellaire longue", price: 180, color: "#d9f8ff", accent: "#ffbf66", unlockLevel: 10 },
  { id: "rift", category: "trails", name: "RIFT", subtitle: "Fragments de faille violets", price: 330, color: "#9a72ff", accent: "#ff4f96", unlockLevel: 22 },
  { id: "spark", category: "impacts", name: "ÉTINCELLE", subtitle: "Impact arcade lisible", price: 0, color: "#ffffff", accent: "#7eeaff" },
  { id: "crystal", category: "impacts", name: "CRISTAL", subtitle: "Éclats boréaux anguleux", price: 210, color: "#bff9ff", accent: "#4bbcff", unlockLevel: 14 },
  { id: "plasma", category: "impacts", name: "PLASMA", subtitle: "Anneau de fusion brûlant", price: 360, color: "#fff2c7", accent: "#ff4d2f", unlockLevel: 26 },
  { id: "pulse", category: "victories", name: "PULSATION", subtitle: "Onde élémentaire finale", price: 0, color: "#8ff4ff", accent: "#ff6b45" },
  { id: "shatter", category: "victories", name: "SHATTER", subtitle: "L’arène se fragmente", price: 280, color: "#bdf8ff", accent: "#9c76ff", unlockLevel: 18 },
  { id: "supernova", category: "victories", name: "SUPERNOVA", subtitle: "Explosion solaire de prestige", price: 620, color: "#fff4aa", accent: "#ff3d22", achievement: "solaris" },
  { id: "elemental", category: "ultimates", name: "ÉLÉMENTAIRE", subtitle: "Zéro Absolu contre Éruption", price: 0, color: "#67eaff", accent: "#ff5c38" },
  { id: "royal-ultimate", category: "ultimates", name: "COURONNE DU RIFT", subtitle: "Runes et onde pourpre", price: 390, color: "#b291ff", accent: "#ff6cbd", unlockLevel: 28 },
  { id: "eclipse", category: "ultimates", name: "ÉCLIPSE", subtitle: "Climax noir et or", price: 720, color: "#17121e", accent: "#ffd86f", unlockLevel: 50 },
  { id: "ascension", category: "arenas", name: "ASCENSION", subtitle: "Thème automatique par chapitre", price: 0, color: "#3de7ff", accent: "#ff522d" },
  { id: "deep-space", category: "arenas", name: "ESPACE PROFOND", subtitle: "Étoiles froides et vide violet", price: 260, color: "#557cff", accent: "#a35cff", unlockLevel: 16 },
  { id: "neon-grid", category: "arenas", name: "NEON GRID", subtitle: "Grille rétro-futuriste", price: 480, color: "#20f3ff", accent: "#ff3ca6", unlockLevel: 34 },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-win", name: "PREMIÈRE ÉTINCELLE", description: "Remporter ton premier combat.", icon: "✦", stat: "wins", target: 1, reward: 20 },
  { id: "wins-5", name: "COMBATTANT", description: "Remporter 5 combats.", icon: "⚔", stat: "wins", target: 5, reward: 30 },
  { id: "wins-10", name: "DUELLISTE", description: "Remporter 10 combats.", icon: "◆", stat: "wins", target: 10, reward: 45 },
  { id: "wins-25", name: "VÉTÉRAN", description: "Remporter 25 combats.", icon: "♛", stat: "wins", target: 25, reward: 80 },
  { id: "wins-50", name: "LÉGENDE LOCALE", description: "Remporter 50 combats.", icon: "★", stat: "wins", target: 50, reward: 140 },
  { id: "rally-10", name: "ÉCHANGE", description: "Atteindre un rally de 10.", icon: "↔", stat: "bestRally", target: 10, reward: 20 },
  { id: "rally-25", name: "TENSION", description: "Atteindre un rally de 25.", icon: "≈", stat: "bestRally", target: 25, reward: 35 },
  { id: "rally-50", name: "INARRÊTABLE", description: "Atteindre un rally de 50.", icon: "∞", stat: "bestRally", target: 50, reward: 70 },
  { id: "rally-100", name: "CENTENAIRE", description: "Atteindre un rally de 100.", icon: "100", stat: "bestRally", target: 100, reward: 150 },
  { id: "perfect-1", name: "CENTRE ABSOLU", description: "Réussir un Perfect Hit.", icon: "◎", stat: "perfectHits", target: 1, reward: 18 },
  { id: "perfect-10", name: "PRÉCISION", description: "Réussir 10 Perfect Hits.", icon: "◉", stat: "perfectHits", target: 10, reward: 40 },
  { id: "perfect-50", name: "CHIRURGICAL", description: "Réussir 50 Perfect Hits.", icon: "⊙", stat: "perfectHits", target: 50, reward: 100 },
  { id: "perfect-100", name: "POINT ZÉRO", description: "Réussir 100 Perfect Hits.", icon: "⊕", stat: "perfectHits", target: 100, reward: 180 },
  { id: "smash-1", name: "FRAPPE LOURDE", description: "Réussir un Smash.", icon: "▲", stat: "smashes", target: 1, reward: 18 },
  { id: "smash-10", name: "BRISE-GLACE", description: "Réussir 10 Smashs.", icon: "◇", stat: "smashes", target: 10, reward: 45 },
  { id: "smash-50", name: "ONDE DE CHOC", description: "Réussir 50 Smashs.", icon: "✹", stat: "smashes", target: 50, reward: 110 },
  { id: "ultimate-1", name: "DÉCHAÎNÉ", description: "Déclencher un Ultimate.", icon: "⚡", stat: "ultimates", target: 1, reward: 20 },
  { id: "ultimate-25", name: "ÉNERGIE PURE", description: "Déclencher 25 Ultimates.", icon: "ϟ", stat: "ultimates", target: 25, reward: 80 },
  { id: "power-10", name: "COLLECTEUR", description: "Capturer 10 power-ups.", icon: "⬡", stat: "matches", target: 10, reward: 30 },
  { id: "speed-1200", name: "MUR DU SON", description: "Dépasser 1 200 de vitesse.", icon: "»", stat: "maxBallSpeed", target: 1200, reward: 50 },
  { id: "speed-1600", name: "LIMITE ROUGE", description: "Dépasser 1 600 de vitesse.", icon: "≫", stat: "maxBallSpeed", target: 1600, reward: 100 },
  { id: "stars-6", name: "CONSTELLATION", description: "Gagner 6 étoiles de campagne.", icon: "★", stat: "campaignStars", target: 6, reward: 35 },
  { id: "stars-18", name: "ASCENSION", description: "Gagner 18 étoiles de campagne.", icon: "★★", stat: "campaignStars", target: 18, reward: 75 },
  { id: "stars-36", name: "PERFECTION", description: "Gagner 36 étoiles de campagne.", icon: "★★★", stat: "campaignStars", target: 36, reward: 240 },
  { id: "kryon", name: "BRISEUR DE GLACE", description: "Vaincre KRYON.", icon: "❄", stat: "bossCount", target: 1, reward: 55 },
  { id: "vortex", name: "MAÎTRE DU RIFT", description: "Vaincre VORTEX.", icon: "◎", stat: "bossCount", target: 2, reward: 85 },
  { id: "solaris", name: "CHUTE DU SOLEIL", description: "Vaincre SOLARIS.", icon: "☀", stat: "bossCount", target: 3, reward: 160 },
  { id: "campaign", name: "CR3@TIX ASCENDANT", description: "Terminer les 50 arènes.", icon: "♛", stat: "campaignComplete", target: 1, reward: 220 },
  { id: "survival-60", name: "UNE MINUTE", description: "Survivre 60 secondes.", icon: "◷", stat: "survivalBest", target: 60, reward: 45 },
  { id: "survival-180", name: "SURVIVANT", description: "Survivre 180 secondes.", icon: "⌛", stat: "survivalBest", target: 180, reward: 120 },
  { id: "bossrush-300", name: "CHASSEUR DE GARDIENS", description: "Terminer Boss Rush en moins de 5 minutes.", icon: "♜", stat: "bossRushBest", target: 1, reward: 180 },
  { id: "level-10", name: "NIVEAU 10", description: "Atteindre le niveau 10.", icon: "10", stat: "level", target: 10, reward: 50 },
  { id: "level-25", name: "NIVEAU 25", description: "Atteindre le niveau 25.", icon: "25", stat: "level", target: 25, reward: 90 },
  { id: "level-50", name: "NIVEAU 50", description: "Atteindre le niveau 50.", icon: "50", stat: "level", target: 50, reward: 180 },
  { id: "level-100", name: "NIVEAU 100", description: "Atteindre le niveau maximal.", icon: "∞", stat: "level", target: 100, reward: 400 },
  { id: "streak-3", name: "SÉRIE CHAUDE", description: "Enchaîner 3 victoires.", icon: "3", stat: "winStreak", target: 3, reward: 35 },
  { id: "streak-10", name: "DOMINATION", description: "Enchaîner 10 victoires.", icon: "10", stat: "winStreak", target: 10, reward: 120 },
  { id: "perfect-win", name: "SANS FAILLE", description: "Gagner sans encaisser un point.", icon: "0", stat: "perfectWin", target: 1, reward: 60 },
  { id: "daily-1", name: "RENDEZ-VOUS", description: "Terminer un défi quotidien.", icon: "☷", stat: "daily", target: 1, reward: 35 },
  { id: "matches-100", name: "CENT COMBATS", description: "Jouer 100 combats.", icon: "100", stat: "matches", target: 100, reward: 200 },
];

export const DAILY_TEMPLATES: Array<Omit<DailyChallenge, "date" | "id">> = [
  { title: "PRÉCISION BORÉALE", description: "Réalise 6 Perfect Hits aujourd’hui.", stat: "perfect", target: 6, reward: 42 },
  { title: "LONGUE TRAJECTOIRE", description: "Atteins un rally de 22 aujourd’hui.", stat: "rally", target: 22, reward: 40 },
  { title: "IMPACT CONTRÔLÉ", description: "Réalise 5 Smashs aujourd’hui.", stat: "smash", target: 5, reward: 44 },
  { title: "ARSENAL OUVERT", description: "Capture 5 power-ups aujourd’hui.", stat: "powerUps", target: 5, reward: 38 },
  { title: "TRIPLE DUEL", description: "Joue 3 combats aujourd’hui.", stat: "matches", target: 3, reward: 36 },
  { title: "VICTOIRE ÉLÉMENTAIRE", description: "Remporte 2 combats aujourd’hui.", stat: "wins", target: 2, reward: 48 },
];

export const MODE_LABELS: Record<GameMode, string> = {
  solo: "SOLO",
  duel: "DUEL LOCAL",
  campaign: "CAMPAGNE",
  survival: "SURVIVAL",
  chaos: "CHAOS",
  bossRush: "BOSS RUSH",
  hardcore: "HARDCORE",
  tutorial: "TUTORIEL",
};

export const DIFFICULTIES: Record<Difficulty, { label: string; subtitle: string; ai: number; behavior: AiBehavior; error: number }> = {
  zen: { label: "ZEN", subtitle: "Défensive et permissive", ai: 600, behavior: "defensive", error: 72 },
  arcade: { label: "ARCADE", subtitle: "Prédictive et équilibrée", ai: 775, behavior: "predictive", error: 38 },
  legend: { label: "LÉGENDE", subtitle: "Agressive, jamais tricheuse", ai: 950, behavior: "aggressive", error: 19 },
};

export function xpForLevel(level: number) {
  return 160 + Math.max(0, level - 1) * 34;
}

export function titleForLevel(level: number) {
  if (level >= 100) return "ARCHON DES ÉLÉMENTS";
  if (level >= 75) return "MAÎTRE DU RIFT";
  if (level >= 50) return "LÉGENDE SOLAIRE";
  if (level >= 30) return "DUELLISTE DE PLASMA";
  if (level >= 15) return "SENTINELLE BORÉALE";
  if (level >= 5) return "COMBATTANT ÉLÉMENTAIRE";
  return "ÉVEILLÉ DU GIVRE";
}

export function normalizeProfile(raw?: Partial<V3Profile> | null): V3Profile {
  const ownedCosmetics = { ...DEFAULT_OWNED_COSMETICS };
  const equippedCosmetics = { ...DEFAULT_EQUIPPED_COSMETICS };
  for (const category of ARSENAL_CATEGORIES) {
    const owned = raw?.ownedCosmetics?.[category.id];
    if (Array.isArray(owned) && owned.length) ownedCosmetics[category.id] = Array.from(new Set(owned));
    const equipped = raw?.equippedCosmetics?.[category.id];
    if (typeof equipped === "string") equippedCosmetics[category.id] = equipped;
  }
  const stats = { ...DEFAULT_STATS, ...(raw?.stats ?? {}), powerUps: { ...(raw?.stats?.powerUps ?? {}) }, bossesDefeated: [...(raw?.stats?.bossesDefeated ?? [])] };
  return {
    ...DEFAULT_PROFILE,
    ...raw,
    profileVersion: 3,
    level: Math.min(100, Math.max(1, Number(raw?.level) || 1)),
    unlockedStage: Math.min(CAMPAIGN_STAGES.length, Math.max(1, Number(raw?.unlockedStage) || 1, ...CAMPAIGN_STAGES.filter((stage) => (raw?.completedObjectives?.[String(stage.id)] ?? []).includes(stage.objectives[0].id)).map((stage) => stage.id + 1))),
    xp: Math.max(0, Number(raw?.xp) || 0),
    stars: { ...(raw?.stars ?? {}) },
    completedObjectives: { ...(raw?.completedObjectives ?? {}) },
    ownedSkins: raw?.ownedSkins?.length ? Array.from(new Set(raw.ownedSkins)) : ["origin"],
    ownedCosmetics,
    equippedCosmetics,
    records: Array.isArray(raw?.records) ? raw.records.slice(0, 30) : [],
    stats,
    achievements: { ...(raw?.achievements ?? {}) },
    daily: { ...DEFAULT_PROFILE.daily, ...(raw?.daily ?? {}) },
    settings: { ...DEFAULT_SETTINGS, ...(raw?.settings ?? {}) },
  };
}

export function migrateV2Profile(legacy?: LegacyV2Profile | null, legacyStats?: Partial<DetailedStats> | null): V3Profile {
  const migratedRecords: MatchRecord[] = (legacy?.records ?? []).map((record, index) => ({
    id: record.id ?? `v2-${index}-${Date.now()}`,
    timestamp: record.timestamp ?? Date.now() - index,
    date: record.date ?? "ARCHIVE V2",
    label: record.label ?? "COMBAT V2",
    mode: record.mode ?? "solo",
    result: record.result ?? "défaite",
    ice: Number(record.ice) || 0,
    fire: Number(record.fire) || 0,
    rally: Number(record.rally) || 0,
    duration: Number(record.duration) || 0,
    difficulty: record.difficulty ?? "arcade",
    perfectHits: Number(record.perfectHits) || 0,
    smashes: Number(record.smashes) || 0,
  }));
  const activeSkin = legacy?.activeSkin && ELEMENT_SKINS.some((skin) => skin.id === legacy.activeSkin) ? legacy.activeSkin : "origin";
  const ownedSkins = legacy?.ownedSkins?.length ? Array.from(new Set(["origin", ...legacy.ownedSkins])) : ["origin"];
  return normalizeProfile({
    unlockedStage: Math.min(12, Math.max(1, Number(legacy?.unlockedStage) || 1)),
    stars: legacy?.stars ?? {},
    shards: Math.max(0, Number(legacy?.shards) || 0),
    ownedSkins,
    activeSkin,
    ownedCosmetics: { ...DEFAULT_OWNED_COSMETICS, paddles: ownedSkins },
    equippedCosmetics: { ...DEFAULT_EQUIPPED_COSMETICS, paddles: activeSkin },
    records: migratedRecords,
    stats: { ...DEFAULT_STATS, ...(legacyStats ?? {}), bestRally: Math.max(Number(legacyStats?.bestRally) || 0, ...migratedRecords.map((record) => record.rally)) },
  });
}
