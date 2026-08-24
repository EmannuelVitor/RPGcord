export const WORKSPACE_PANEL_WIDTHS = {
  sheet: 760,
  history: 470,
  chat: 480,
  journal: 680,
  notes: 600,
  initiative: 500,
  npcs: 860,
  settings: 500,
  gm: 640,
  table: 900,
} as const;

export type WorkspacePanelName = keyof typeof WORKSPACE_PANEL_WIDTHS;

export function workspacePanelWidth(tab: string) {
  if (tab.startsWith("whisper:")) return WORKSPACE_PANEL_WIDTHS.chat;
  return WORKSPACE_PANEL_WIDTHS[tab as WorkspacePanelName] ?? WORKSPACE_PANEL_WIDTHS.chat;
}
