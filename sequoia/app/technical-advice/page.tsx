import Link from "next/link";

const FIELDS = [
  { slug: "fishing", label: "Fishing" },
  { slug: "hunting", label: "Hunting" },
  { slug: "welding", label: "Welding" },
  { slug: "woodworking", label: "Woodworking" },
  { slug: "automotive", label: "Automotive" },
  { slug: "electronics", label: "Electronics" },
  { slug: "plumbing", label: "Plumbing" },
  { slug: "cooking", label: "Cooking" },
];

export default function TechnicalAdvice() {
  return (
    <main>
      <Link href="/">← Home</Link>
      <h1>Technical Advice</h1>
      <p>Choose a field:</p>
      <ul>
        {FIELDS.map((field) => (
          <li key={field.slug}>
            <Link href={`/technical-advice/${field.slug}`}>{field.label}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
