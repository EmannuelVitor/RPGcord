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

export type CampaignMember = {
  userId: string;
  name: string;
  avatarUrl?: string;
  role: "gm" | "player";
  joinedAt?: number;
  lastSeenAt?: number;
  /** Falso quando a aba foi fechada de forma limpa. */
  present?: boolean;
  /** Personagem vinculado à conta; null representa uma opção explícita por jogar sem ficha. */
  characterId?: string | null;
  typingConversationId?: string;
  typingAt?: number;
};

export type Character = {
  id: string;
  ownerId: string;
  /** Contas que podem usar e editar a mesma personagem. */
  controllerIds?: string[];
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
  customFields?: Record<string, SheetFieldValue>;
};

export type SheetCategory = "attributes" | "skills" | "abilities" | "inventory";
export type SheetFieldType = "text" | "number" | "status" | "checkbox" | "counter" | "richtext";
export type SheetStatusValue = { current: number; max: number };
export type SheetFieldValue = string | number | boolean | SheetStatusValue;

export type SheetFieldDefinition = {
  id: string;
  category: SheetCategory;
  label: string;
  type: SheetFieldType;
  placeholder?: string;
  formula?: string;
  defaultValue?: string | number | boolean;
  defaultMax?: number;
  min?: number;
  max?: number;
};

export type SheetTemplate = {
  id: string;
  name: string;
  version: number;
  fields: SheetFieldDefinition[];
  updatedAt?: number;
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
  /** Contas autorizadas a controlar este pino de personagem. */
  controllerIds?: string[];
  name: string;
  initials: string;
  x: number;
  y: number;
  color: string;
  imageUrl?: string;
  visionRadius?: number;
  locked?: boolean;
  lockedBy?: string;
  /** Criatura visivel apenas para o mestre. */
  hidden?: boolean;
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
  radius?: number;
  brightRadius?: number;
  dimRadius?: number;
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
  gridEnabled?: boolean;
  mapFit?: MapFit;
  fogEnabled?: boolean;
  visionRadius?: number;
  revealedAreas?: FogArea[];
  visionMode?: "shared" | "individual";
  ambientLight?: number;
  movementBounds?: {
    enabled: boolean;
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
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
  recipientId?: string;
  recipientName?: string;
  participantIds?: string[];
  conversationId?: string;
  mentionIds?: string[];
  createdAt: number;
  editedAt?: number;
};

export type CampaignJournal = {
  content: string;

  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: number;
};

export type CharacterNotes = {
  content: string;
  shareWithGM: boolean;
  sharedWithPlayerIds: string[];
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

export type InitiativeEntry = {
  id: string;
  tokenId?: string;
  name: string;
  initiative: number;
};

export type InitiativeState = {
  entries: InitiativeEntry[];
  activeIndex: number;
  round: number;
  running: boolean;
  updatedAt?: number;
};
