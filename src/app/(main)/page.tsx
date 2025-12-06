"use client";

export default function Home() {
  return (
    <main>
      <div>
        {Array.from({ length: 10 }).map((_, i) => (
          <p key={i}>Hello World {i + 1}</p>
        ))}
      </div>
    </main>
  );
}
