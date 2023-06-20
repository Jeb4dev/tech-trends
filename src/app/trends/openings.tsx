import { useState } from "react";

interface type {
  openings:
    | {
        heading: string;
        date_posted: string;
        slug: string;
        municipality_name: string;
        export_image_url: string;
        company_name: string;
        descr: string;
        latitude: string | null;
        longitude: string | null;
      }[]
    | null;
}

export const Openings = ({ openings }: type) => {
  const [showCount, setShowCount] = useState(10);

  const handleShowMore = () => {
    if (showCount >= openings!.length) return;
    if (showCount + 100 >= openings!.length) return setShowCount(openings!.length);
    setShowCount(showCount + 100);
  };

  if (!openings) {
    return (
      <>
        <div className={"py-8"}>
          <h1 className={"pb-4"}>Filtered Job Listings</h1>
          {Array.from({ length: 5 }).map((_, i) => (
            <div className={"flex flex-col"} key={i}>
              <span className={"loading-animation m-1 w-96 h-4 bg-blue-400 rounded"}></span>
              <span className={"loading-animation m-1 w-48 h-3 bg-zinc-200 rounded"}></span>
              <span className={"loading-animation m-1 w-32 h-2 bg-gray-400 rounded"}></span>
              <span className={"loading-animation m-1 w-full h-3 bg-gray-400 rounded"}></span>
              <hr className={"loading-animation my-4 border-gray-400"} />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className={"py-8"}>
        <h1 className={"pb-4"}>Filtered Job Listings ({openings.length})</h1>
        <ul>
          {openings!.slice(0, showCount).map((result) => (
            <li key={result.slug}>
              <a href={`https://duunitori.fi/tyopaikat/tyo/${result.slug}`} className={"text-xl font-bold"}>
                {result.heading}
              </a>
              <p className={"text-gray-200"}>
                {result.company_name} - {result.municipality_name}
              </p>
              <p className={"text-sm text-gray-400"}>
                {new Date(result.date_posted).toLocaleDateString("fi-FI")} -{" "}
                {new Date(result.date_posted).toLocaleTimeString("fi-FI", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <details>
                <summary className={"line-clamp-1 text-sm text-gray-400 tracking-wider"}>{result.descr}</summary>
                <p className={"text-sm text-gray-400 tracking-wider"}>{result.descr}</p>
              </details>
              <hr className={"my-4 border-gray-400"} />
            </li>
          ))}
        </ul>
        <button
          className={"text-gray-400 text-sm text-center disabled:cursor-not-allowed"}
          onClick={handleShowMore}
          disabled={showCount >= openings.length}
        >
          Load more (
          <span className={"text-gray-200 font-bold"}>
            {showCount}/{openings.length}
          </span>
          )
        </button>
      </div>
    </>
  );
};
