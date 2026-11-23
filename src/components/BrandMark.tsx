/** Square app mark used for icons: a gold "O" with a rising spark on rich black. */
export function BrandMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0D0D0D",
        position: "relative",
      }}
    >
      <div
        style={{
          width: size * 0.56,
          height: size * 0.56,
          borderRadius: "50%",
          border: `${Math.round(size * 0.07)}px solid #C9A962`,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: size * 0.17,
          right: size * 0.22,
          width: size * 0.12,
          height: size * 0.12,
          background: "#E8D5A3",
          transform: "rotate(45deg)",
          display: "flex",
        }}
      />
    </div>
  );
}
