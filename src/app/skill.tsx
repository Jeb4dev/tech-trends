interface SkillsProps {
  skills: { label: string; count: number }[];
  data: any;
}

export const Skills = ({ skills, data }: SkillsProps) => {
  return (
    <>
      <ul>
        {skills.map((skill) => (
          <li>
            {skill.label} ({skill.count})
          </li>
        ))}
      </ul>
    </>
  );
};
