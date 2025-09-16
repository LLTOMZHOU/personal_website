import ProjectCard from "@/components/ProjectCard";

export default function ProjectsPage() {
  return (
    <main className="space-y-8">
      <h1 className="text-3xl font-extrabold">Projects</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <ProjectCard
          title="Glitch Witch"
          description="UE5 capstone—custom subsystems (telemetry, quest manager), systems-heavy gameplay."
          dateRange="Jan–May 2025"
          href="/projects/glitch-witch"
          prettyLink="glitchwitch.site"
        />
        <ProjectCard
          title="Convoice AI"
          description="LLM voice-agent platform for businesses; verify, auth, vector search."
          dateRange="2024–Present"
          prettyLink="conv.ai"
        />
        <ProjectCard
          title="Ctrl+F (USC)"
          description="Research-matching portal; prize-winning student project; searchable faculty/projects."
          dateRange="2022"
          prettyLink="ctrlf.app"
        />
      </div>
    </main>
  );
}

