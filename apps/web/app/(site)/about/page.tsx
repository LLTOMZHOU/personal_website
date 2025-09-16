export default function AboutPage() {
  return (
    <main className="prose max-w-prose">
      <h1>About</h1>
      <p>I’m Yuxing (Tom). I build products, write, and take photos.</p>
      <p>
        Links: <a className="underline" href="https://github.com/yourname" target="_blank" rel="noreferrer">GitHub</a>
        {" "}•{" "}
        <a className="underline" href="https://www.linkedin.com/in/yourname" target="_blank" rel="noreferrer">LinkedIn</a>
        {" "}•{" "}
        <a className="underline" href="mailto:you@example.com">Email</a>
      </p>
    </main>
  );
}

