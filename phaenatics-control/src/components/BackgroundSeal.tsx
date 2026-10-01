import sealUrl from "../assets/phaenatics-seal.svg";

export function BackgroundSeal() {
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${sealUrl})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
          backgroundSize: "min(90vmin, 900px)",
          opacity: 0.05,
          filter: "brightness(1.15)",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60vmax 50vmax at 50% 50%, transparent 0%, rgba(14,37,27,0.55) 70%, rgba(14,37,27,0.9) 100%)",
          zIndex: 0,
        }}
      />
    </>
  );
}
