export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-md overflow-hidden bg-white shadow-xl">
      {children}
    </main>
  );
}
