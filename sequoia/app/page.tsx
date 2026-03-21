import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Sequoia</h1>
      <nav>
        <ul>
          <li>
            <Link href="/life-advice">Life Advice</Link>
          </li>
          <li>
            <Link href="/technical-advice">Technical Advice</Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
