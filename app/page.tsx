import InstallSettingsButton from "./InstallSettingsButton";
import PongV3 from "./PongV3";
import TouchSensitivityEnhancer from "./TouchSensitivityEnhancer";

export default function Home() {
  return (
    <>
      <PongV3 />
      <TouchSensitivityEnhancer />
      <InstallSettingsButton />
    </>
  );
}
