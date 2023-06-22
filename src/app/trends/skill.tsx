import { useState } from "react";
import { Category } from "@/types";

interface SkillsProps {
  skills: Category[] | null;
  category?: string;
  updateFilter?: any;
  setLoading?: any;
}

export const Skills = ({ skills, category, updateFilter, setLoading }: SkillsProps) => {
  const [showAll, setShowAll] = useState(false);
  skills?.sort((a, b) => b.filteredOpenings.length - a.filteredOpenings.length);

  if (!skills) {
    return (
      <>
        <ul>
          {Array.from({ length: 5 }).map((_, i) => (
            <li className={"flex flex-row"} key={i}>
              <span className={"loading-animation m-1 w-6 h-3 bg-zinc-400 rounded"}></span>
              <span className={"animate-pulse m-1 w-16 h-3 bg-zinc-400 rounded"}></span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      <ul>
        {(showAll ? skills!.filter((skill) => skill.filteredOpenings.length > 0) : skills!.slice(0, 5)).map((skill) => (
          <li
            className={`flex flex-row cursor-pointer ${
              skill.active ? "text-green-600 hover:text-red-600 hover:line-through" : "hover:text-green-600"
            }`}
            key={skill.label}
            onClick={() => {
              if (!updateFilter) return;
              setLoading(true);
              updateFilter(category, skill.label.toLowerCase());
              setLoading(false);
            }}
          >
            ({skill.filteredOpenings.length})&nbsp;<span className={"max-w-full line-clamp-1"}>{skill.label}</span>
          </li>
        ))}
      </ul>
      <button className={"text-gray-400 hover:text-gray-200 text-sm"} onClick={() => setShowAll(!showAll)}>
        {showAll ? "Show less" : "Show more"}
      </button>
    </>
  );
};
