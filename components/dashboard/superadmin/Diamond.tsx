export function Diamond({ size = 5 }: { size?: number }) {
  return (
    <span
      className="inline-block shrink-0"
      style={{
        width: size,
        height: size,
        background: "var(--color-gold)",
        clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
      }}
    />
  );
}
