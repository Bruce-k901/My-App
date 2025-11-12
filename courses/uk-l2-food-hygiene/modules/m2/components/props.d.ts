// Component prop definitions (stubs)

export type DragDropProps = {
  pairs: [string, string][];
  prompt: string;
  onDone: (correct: boolean) => void;
};

export type HotspotRoomProps = {
  image: string;
  spots: { x: number; y: number; label: string }[]; // coords 0..1
  prompt: string;
  onDone: (foundAll: boolean) => void;
};

export type BranchScenarioProps = {
  title: string;
  stem: string;
  options: { label: string; result: string }[];
  onDone: (pickedIndex: number, correct: boolean) => void;
};