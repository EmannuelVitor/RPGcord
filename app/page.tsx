"use client";

import { useEffect, useState } from "react";
import { CampaignHub } from "@/components/CampaignHub";
import { GameWorkspace as WorkspaceView } from "@/components/GameWorkspace";
import { LoginScreen } from "@/components/LoginScreen";
import { TutorialModal } from "@/components/TutorialModal";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useCampaigns } from "@/hooks/useCampaigns";
import type { AppUser } from "@/lib/types";

export default function Home() {
  const authentication = useAuth();
  const appearance = useTheme();
  const [loginTutorialOpen, setLoginTutorialOpen] = useState(false);
  if (!authentication.user) {
    return (
      <>
        <LoginScreen context={authentication.context} loading={authentication.loading} error={authentication.error} onGoogleLogin={authentication.signInGoogle} onTutorial={() => setLoginTutorialOpen(true)} />
        {loginTutorialOpen && <TutorialModal onClose={() => setLoginTutorialOpen(false)} />}
      </>
    );
  }
  return <CampaignController user={authentication.user} appearance={appearance} onSignOut={authentication.signOutUser} />;
}

function CampaignController({ user, appearance, onSignOut }: { user: AppUser; appearance: ReturnType<typeof useTheme>; onSignOut: () => Promise<void> }) {
  const campaignState = useCampaigns(user);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem("rpgcord.tutorial.v1.seen")) setTutorialOpen(true);
  }, []);

  function closeTutorial() {
    window.localStorage.setItem("rpgcord.tutorial.v1.seen", "true");
    setTutorialOpen(false);
  }

  if (!campaignState.activeCampaign) {
    return (
      <>
        <CampaignHub
          user={user}
          campaigns={campaignState.campaigns}
          loading={campaignState.loading}
          error={campaignState.error}
          onSelect={campaignState.selectCampaign}
          onCreate={campaignState.createCampaign}
          onJoin={campaignState.joinCampaign}
          onLeave={campaignState.leaveCampaign}
          onDelete={campaignState.deleteCampaign}
          onSignOut={onSignOut}
          onTutorial={() => setTutorialOpen(true)}
        />
        {tutorialOpen && <TutorialModal onClose={closeTutorial} />}
      </>
    );
  }
  return (
    <>
      <WorkspaceView user={user} campaign={campaignState.activeCampaign} onCampaigns={() => campaignState.selectCampaign(undefined)} onLeaveCampaign={campaignState.leaveCampaign} onDeleteCampaign={campaignState.deleteCampaign} onRemoveMember={campaignState.removeMember} appearance={appearance} onSignOut={onSignOut} onTutorial={() => setTutorialOpen(true)} />
      {tutorialOpen && <TutorialModal onClose={closeTutorial} />}
    </>
  );
}
