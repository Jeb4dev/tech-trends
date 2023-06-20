import { useState } from "react";

interface SkillsProps {
  skills: { label: string; count: number }[] | null;
}

export const Skills = ({ skills }: SkillsProps) => {
  const [showAll, setShowAll] = useState(false);

  if (!skills) {
    return (
      <>
        <ul>
          {Array.from({ length: 5 }).map((_, i) => (
            <li className={"flex flex-row"} key={i}>
              <span className={"loading-animation m-1 w-6 h-3 bg-zinc-400 rounded"}></span><span className={"animate-pulse m-1 w-16 h-3 bg-zinc-400 rounded"}></span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      <ul>
        {(showAll ? skills!.filter((skill) => skill.count > 0) : skills!.slice(0, 5)).map((skill) => (
          <li className={"flex flex-row"} key={skill.label}>
            ({skill.count})&nbsp;<span className={"max-w-full line-clamp-1"}>{skill.label}</span>
          </li>
        ))}
      </ul>
      <button className={"text-gray-400 text-sm"} onClick={() => setShowAll(!showAll)}>
        {showAll ? "Show less" : "Show more"}
      </button>
    </>
  );
};
