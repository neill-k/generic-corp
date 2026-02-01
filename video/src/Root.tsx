import { Composition } from "remotion";
import { Video } from "./Video";
import { FPS, WIDTH, HEIGHT, TOTAL_DURATION_FRAMES } from "./data/timing";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="GenericCorpLaunch"
      component={Video}
      durationInFrames={TOTAL_DURATION_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
