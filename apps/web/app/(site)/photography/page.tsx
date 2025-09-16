export default function PhotographyPage() {
  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-extrabold">Photography</h1>
      {/* Show text-only placeholders if no images yet */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border-4 p-6">Album: Alps</div>
        <div className="border-4 p-6">Album: Coast</div>
        <div className="border-4 p-6">Album: City Night</div>
      </div>
    </main>
  );
}

