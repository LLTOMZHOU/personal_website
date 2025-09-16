import ProjectCard from "@/components/ProjectCard";

export default function Page() {
  return (
    <main className="space-y-10">
      <section>
        <h1 className="text-4xl font-extrabold">Hi, I’m Yuxing.</h1>
        <p className="mt-3 max-w-prose">
          I build products, write occasionally, and take photos. Explore a few recent projects and posts below.
        </p>
        <div className="mt-6 flex gap-3">
          <a className="underline" href="/projects">
            Projects
          </a>
          <a className="underline" href="/writing">
            Writing
          </a>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Featured Projects</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ProjectCard
            title="Glitch Witch"
            description="UE5 capstone—custom subsystems (telemetry, quest manager), systems-heavy gameplay."
            dateRange="Jan–May 2025"
            prettyLink="glitchwitch.site"
          />
          <ProjectCard
            title="Convoice AI"
            description="LLM voice-agent platform for businesses; verify, auth, vector search."
            dateRange="2024–Present"
            prettyLink="conv.ai"
          />
        </div>
      </section>
    </main>
  );
}
