export type StageModifier = "standard" | "velocity" | "pressure" | "fortress" | "chaos" | "boss";

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
  boss?: string;
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
};

export type MatchRecord = {
  id: string;
  date: string;
  label: string;
  result: "victoire" | "défaite";
  ice: number;
  fire: number;
  rally: number;
};

export type V2Profile = {
  unlockedStage: number;
  stars: Record<string, number>;
  shards: number;
  ownedSkins: string[];
  activeSkin: string;
  records: MatchRecord[];
};

export const DEFAULT_PROFILE: V2Profile = {
  unlockedStage: 1,
  stars: {},
  shards: 0,
  ownedSkins: ["origin"],
  activeSkin: "origin",
  records: [],
};

export const CHAPTERS = [
  { id: 1, label: "CHAPITRE I", name: "Royaume boréal", color: "#3de7ff" },
  { id: 2, label: "CHAPITRE II", name: "Faille thermique", color: "#a77dff" },
  { id: 3, label: "CHAPITRE III", name: "Empire du brasier", color: "#ff6138" },
];

export const CAMPAIGN_STAGES: CampaignStage[] = [
  { id: 1, chapter: 1, name: "Éveil du givre", subtitle: "Apprends à canaliser la glace", aiSpeed: 535, reaction: 62, ballSpeed: 590, winScore: 4, playerHeight: 188, enemyHeight: 164, modifier: "standard", reward: 28 },
  { id: 2, chapter: 1, name: "Brise polaire", subtitle: "La vitesse commence à monter", aiSpeed: 585, reaction: 50, ballSpeed: 635, winScore: 4, playerHeight: 180, enemyHeight: 170, modifier: "velocity", reward: 32 },
  { id: 3, chapter: 1, name: "Cercle boréal", subtitle: "Les pouvoirs apparaissent plus vite", aiSpeed: 640, reaction: 42, ballSpeed: 670, winScore: 5, playerHeight: 176, enemyHeight: 176, modifier: "chaos", reward: 38 },
  { id: 4, chapter: 1, name: "Sentinelle du Nord", subtitle: "Le premier gardien s’éveille", aiSpeed: 710, reaction: 32, ballSpeed: 700, winScore: 5, playerHeight: 174, enemyHeight: 218, modifier: "boss", reward: 70, boss: "KRYON" },
  { id: 5, chapter: 2, name: "Rift instable", subtitle: "Chaque échange devient imprévisible", aiSpeed: 730, reaction: 30, ballSpeed: 720, winScore: 5, playerHeight: 170, enemyHeight: 182, modifier: "chaos", reward: 45 },
  { id: 6, chapter: 2, name: "Pression violette", subtitle: "Ton espace de défense se réduit", aiSpeed: 770, reaction: 26, ballSpeed: 750, winScore: 5, playerHeight: 154, enemyHeight: 184, modifier: "pressure", reward: 50 },
  { id: 7, chapter: 2, name: "Accélérateur Ω", subtitle: "La balle refuse de ralentir", aiSpeed: 825, reaction: 23, ballSpeed: 800, winScore: 6, playerHeight: 166, enemyHeight: 188, modifier: "velocity", reward: 56 },
  { id: 8, chapter: 2, name: "Maître de la Faille", subtitle: "Le chaos a désormais un visage", aiSpeed: 880, reaction: 18, ballSpeed: 820, winScore: 6, playerHeight: 162, enemyHeight: 230, modifier: "boss", reward: 95, boss: "VORTEX" },
  { id: 9, chapter: 3, name: "Pluie de braises", subtitle: "L’empire du feu contre-attaque", aiSpeed: 900, reaction: 18, ballSpeed: 835, winScore: 6, playerHeight: 166, enemyHeight: 194, modifier: "standard", reward: 62 },
  { id: 10, chapter: 3, name: "Forteresse ardente", subtitle: "Une défense presque infranchissable", aiSpeed: 940, reaction: 14, ballSpeed: 855, winScore: 6, playerHeight: 162, enemyHeight: 238, modifier: "fortress", reward: 68 },
  { id: 11, chapter: 3, name: "Point de fusion", subtitle: "Aucune erreur ne sera pardonnée", aiSpeed: 990, reaction: 11, ballSpeed: 900, winScore: 7, playerHeight: 152, enemyHeight: 206, modifier: "velocity", reward: 76 },
  { id: 12, chapter: 3, name: "Trône solaire", subtitle: "Le duel final des éléments", aiSpeed: 1060, reaction: 7, ballSpeed: 930, winScore: 7, playerHeight: 152, enemyHeight: 250, modifier: "boss", reward: 150, boss: "SOLARIS" },
];

export const ELEMENT_SKINS: ElementSkin[] = [
  { id: "origin", name: "ORIGIN", subtitle: "Glace pure · Feu primal", price: 0, ice: "#3de7ff", iceLight: "#c8fbff", fire: "#ff522d", fireLight: "#ffd08b" },
  { id: "nebula", name: "NEBULA", subtitle: "Arc violet · Plasma rose", price: 120, ice: "#9b7dff", iceLight: "#e9e0ff", fire: "#ff4fa3", fireLight: "#ffd2e9" },
  { id: "toxic", name: "TOXIC RIFT", subtitle: "Éther acide · Or solaire", price: 240, ice: "#5cff9b", iceLight: "#d8ffe6", fire: "#ffd93d", fireLight: "#fff3ad" },
  { id: "chrome", name: "VOID CHROME", subtitle: "Cobalt lunaire · Magma blanc", price: 380, ice: "#77a9ff", iceLight: "#eef5ff", fire: "#ff786c", fireLight: "#fff0e8" },
];
