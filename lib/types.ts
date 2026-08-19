export type AttributeKey = "forca" | "destreza" | "constituicao" | "inteligencia" | "sabedoria" | "carisma";

export type AppUser = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
};

export type Campaign = {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  memberIds: string[];
  inviteCode: string;
  createdAt: number;
  updatedAt: number;
};

export type Character = {
  id: string;
  ownerId: string;
  name: string;
  ancestry: string;
  characterClass: string;
  level: number;
  hp: number;
  maxHp: number;
  armorClass: number;
  attributes: Record<AttributeKey, number>;
  skills: string[];
  inventory: string;
  imageUrl?: string;
};

export type DiceValidationMode = "highest" | "lowest" | "sum";

export type DiceRoll = {
  id: string;
  userId: string;
  userName: string;
  sides: number;
  value: number;
  modifier: number;
  total: number;
  quantity?: number;
  results?: number[];
  validationMode?: DiceValidationMode;
  createdAt: number;
};

export type MapToken = {
  id: string;
  ownerId: string;
  name: string;
  initials: string;
  x: number;
  y: number;
  color: string;
  imageUrl?: string;
  visionRadius?: number;
  kind: "hero" | "monster";
};

export type MapFit = "contain" | "cover" | "stretch";

export type FogArea = {
  id: string;
  x: number;
  y: number;
  radius: number;
};

export type LightSource = {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  intensity: number;
  color: string;
  enabled: boolean;
};

export type Scene = {
  id: string;
  name: string;
  mapUrl: string;
  revealUrl: string;
  gridSize: number;
  mapFit?: MapFit;
  fogEnabled?: boolean;
  visionRadius?: number;
  revealedAreas?: FogArea[];
  dynamicLights?: LightSource[];
};

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  text: string;
  imageUrl?: string;
  driveFileId?: string;
  spoiler?: boolean;
  createdAt: number;
};

export type CampaignJournal = {
  content: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: number;
};

export type CampaignMusic = {
  youtubeUrl: string;
  title: string;
  loop: boolean;
  playing: boolean;
  position: number;
  startedAt?: number;
  updatedAt?: number;
};
