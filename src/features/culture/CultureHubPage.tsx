/**
 * RC2.3.13E — `/cultura` entry is Culture Journey (ProgressionShell).
 * Atlas / explore lives at `/cultura/explorar` (`CultureAtlasPage`).
 *
 * Density contract (rc2-2-13): HubPage compact remains the culture-hub surface.
 * Handoff contract (rc2-2-24): JourneyHandoffBanner on the Culture entry.
 */
import { HubPage } from "../../components/layout/HubLayout";
import { JourneyHandoffBanner } from "../../components/journey/JourneyHandoffBanner";
import { CultureJourneyPage } from "./CultureJourneyPage";

export function CultureHubPage() {
  return (
    <HubPage compact data-testid="culture-hub">
      <JourneyHandoffBanner source="CULTURE" />
      <CultureJourneyPage />
    </HubPage>
  );
}
