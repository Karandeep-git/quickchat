const BrandMark = ({ compact = false, className = "" }) => {
  return (
    <div className={`select-none ${className}`}>
      <span
        className={`font-semibold tracking-tight text-[var(--text-primary)] ${compact ? "text-2xl" : "text-4xl md:text-5xl"}`}
      >
        Quick
      </span>
      <span
        className={`font-semibold tracking-tight text-[var(--accent)] ${compact ? "text-2xl" : "text-4xl md:text-5xl"}`}
      >
        Chat
      </span>
    </div>
  );
};

export default BrandMark;
