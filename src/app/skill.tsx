import { Results } from "./page";

interface SkillsProps {
  skills: { label: string; count: number }[];
}

export const Skills = ({ skills }: SkillsProps) => {
  return (
    <>
      <ul>
        {skills.map((skill) => (
          <li key={skill.label}>
            {skill.label} ({skill.count})
          </li>
        ))}
      </ul>
    </>
  );
};
