type Props = {
  title: string;
  description: string;
  dateRange?: string;
  href?: string; // learn more route (optional)
  prettyLink?: string; // display-only external link (optional)
  imageUrl?: string; // optional
};

export default function ProjectCard({
  title,
  description,
  dateRange,
  href,
  prettyLink,
  imageUrl,
}: Props) {
  return (
    <article className="border-4 p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
      {imageUrl ? (
        <div className="mb-3 aspect-video bg-[canvas]">
          {/* <img src={imageUrl} alt="" className="h-full w-full object-cover" /> */}
        </div>
      ) : null}
      <h3 className="text-lg font-bold">{title}</h3>
      {dateRange ? (
        <p className="mt-1 text-xs opacity-75">{dateRange}</p>
      ) : null}
      <p className="mt-3 text-sm">{description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        {href ? (
          <a className="underline" href={href}>
            Learn more
          </a>
        ) : null}
        {prettyLink ? <span className="opacity-80">{prettyLink}</span> : null}
      </div>
    </article>
  );
}

