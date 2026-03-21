import Link from "next/link";

const AGE_GROUPS = [
  { slug: "under-18", label: "Under 18" },
  { slug: "18-25", label: "18–25" },
  { slug: "26-35", label: "26–35" },
  { slug: "36-50", label: "36–50" },
  { slug: "51-65", label: "51–65" },
  { slug: "over-65", label: "Over 65" },
];

export default function LifeAdvice() {
  return (
    <main>
      <Link href="/">← Home</Link>
      <h1>Life Advice</h1>
      <p>Choose an age group:</p>
      <ul>
        {AGE_GROUPS.map((group) => (
          <li key={group.slug}>
            <Link href={`/life-advice/${group.slug}`}>{group.label}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
