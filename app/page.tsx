import InstallSettingsButton from "./InstallSettingsButton";
import MobilePerformanceGuard from "./MobilePerformanceGuard";
import PongV3 from "./PongV3";
import TouchSensitivityEnhancer from "./TouchSensitivityEnhancer";

export default function Home() {
  return (
    <>
      <MobilePerformanceGuard />
      <PongV3 />
      <TouchSensitivityEnhancer />
      <InstallSettingsButton />
    </>
  );
}
