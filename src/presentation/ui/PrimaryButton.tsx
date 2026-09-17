'use client';

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-2xl bg-zinc-950 py-4 font-bold text-white disabled:opacity-30 ${props.className ?? ''}`}
    >
      {children}
    </button>
  );
}
