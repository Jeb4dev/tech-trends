import { useState, useRef, useLayoutEffect } from "react";
import { Category } from "@/types";

interface SkillsProps {
  skills: Category[] | null;
  category?: string;
  updateFilter?: any;
  setLoading?: any;
}

export const Skills = ({ skills, category, updateFilter, setLoading }: SkillsProps) => {
  const [showAll, setShowAll] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLUListElement | null>(null);
  const [maxHeight, setMaxHeight] = useState<string>("0px");
  const COLLAPSED_COUNT = 5;

  skills?.sort((a, b) => b.filteredOpenings.length - a.filteredOpenings.length);

  // Measure and set maxHeight for animation
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    const listItems = Array.from(contentRef.current.children) as HTMLElement[];
    if (listItems.length === 0) {
      setMaxHeight("0px");
      return;
    }
    // Determine target height
    if (showAll) {
      setMaxHeight(contentRef.current.scrollHeight + "px");
    } else {
      // Height of first N items
      let h = 0;
      for (let i = 0; i < Math.min(COLLAPSED_COUNT, listItems.length); i++) {
        h += listItems[i].offsetHeight;
      }
      setMaxHeight(h + "px");
    }
  }, [showAll, skills]);

  if (!skills) {
    return (
      <ul>
        {Array.from({ length: 5 }).map((_, i) => (
          <li className="flex flex-row" key={i}>
            <span className="loading-animation m-1 w-6 h-3 bg-zinc-400 rounded" />
            <span className="animate-pulse m-1 w-16 h-3 bg-zinc-400 rounded" />
          </li>
        ))}
      </ul>
    );
  }

  const visibleSkills = showAll ? skills.filter((s) => s.filteredOpenings.length > 0) : skills.slice(0, COLLAPSED_COUNT);

  return (
    <div ref={containerRef} className="group/skills">
      <div
        style={{ maxHeight, transition: "max-height 400ms ease", overflow: "hidden" }}
      >
        <ul ref={contentRef} className="relative">
          {skills.filter(s => showAll || skills.indexOf(s) < COLLAPSED_COUNT).map((skill) => (
            <li
              className={`flex flex-row cursor-pointer select-none py-0.5 ${
                skill.active
                  ? "text-green-500 hover:text-red-500 hover:line-through"
                  : "hover:text-green-400"
              }`}
              key={skill.label}
              onClick={() => {
                if (!updateFilter) return;
                setLoading?.(true);
                updateFilter(category, skill.label.toLowerCase());
                setLoading?.(false);
              }}
            >
              <span className="text-gray-500 mr-1">({skill.filteredOpenings.length})</span>
              <span className="max-w-full truncate" title={skill.label}>{skill.label}</span>
            </li>
          ))}
        </ul>
      </div>
      {skills.length > COLLAPSED_COUNT && (
        <button
          type="button"
          className="mt-1 text-gray-400 hover:text-gray-200 text-xs tracking-wide transition-colors focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          aria-label={showAll ? `Collapse ${category}` : `Expand ${category}`}
        >
          {showAll ? "Show less" : `Show more (${skills.length - COLLAPSED_COUNT})`}
        </button>
      )}
    </div>
  );
};
