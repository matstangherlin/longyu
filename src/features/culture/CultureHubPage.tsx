/**
 * RC2.3.13E — `/cultura` entry is Culture Journey (ProgressionShell).
 * Atlas / explore lives at `/cultura/explorar` (`CultureAtlasPage`).
 *
 * Density contract (rc2-2-13): HubPage compact remains the culture-hub surface.
 */
import { HubPage } from "../../components/layout/HubLayout";
import { CultureJourneyPage } from "./CultureJourneyPage";

export function CultureHubPage() {
  return (
    <HubPage compact data-testid="culture-hub">
      <CultureJourneyPage />
    </HubPage>
  );
}
