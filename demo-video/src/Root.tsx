import { Composition } from 'remotion';
import { AgentMashDemo, TOTAL_FRAMES } from './Video';

export const RemotionRoot: React.FC = () => (
  <Composition id="AgentMashDemo" component={AgentMashDemo} durationInFrames={TOTAL_FRAMES} fps={30} width={1920} height={1080} />
);
