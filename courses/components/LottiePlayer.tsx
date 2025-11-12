'use client';

import dynamic from "next/dynamic";

const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
  { ssr: false }
);

type Props = {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  width?: number;
  height?: number;
  className?: string;
};

export default function LottiePlayer({
  src,
  loop = false,
  autoplay = true,
  width = 600,
  height = 400,
  className = "",
}: Props) {
  return (
    <div className={className} style={{ width, height }}>
      <Player autoplay={autoplay} loop={loop} src={src} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
