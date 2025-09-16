export default function WritingPage() {
  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-extrabold">Writing</h1>
      <ul className="space-y-4">
        <li>
          <a
            className="underline"
            target="_blank"
            rel="noreferrer"
            href="https://medium.com/@yuxing"
          >
            Why text-first project pages age better
          </a>
          <p className="text-sm opacity-80">
            A quick take on why optional images and flexible MDX win for longevity.
          </p>
        </li>
        <li>
          <a
            className="underline"
            target="_blank"
            rel="noreferrer"
            href="https://medium.com/@yuxing"
          >
            Building Glitch Witch subsystems
          </a>
          <p className="text-sm opacity-80">
            Notes from the UE5 capstone (telemetry & quest manager).
          </p>
        </li>
      </ul>
    </main>
  );
}

