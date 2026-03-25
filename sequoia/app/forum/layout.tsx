import ForumSidebar from "@/components/ForumSidebar";

export default function ForumLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="forum-page forum-with-sidebar">
      <ForumSidebar />
      <div className="forum-main">
        <div className="forum-shell">{children}</div>
      </div>
    </main>
  );
}
