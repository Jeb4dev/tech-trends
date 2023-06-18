interface SkillsProps {
  skills: { label: string; count: number }[];
  data: any;
}

export const Skills = ({ skills, data }: SkillsProps) => {
  return (
    <>
      {skills.map((skill) => {
        if (skill.count > 0) {
          <li>
            {skill.label} ({skill.count})
          </li>;
        }
      })}
    </>
  );
};

export const Skill = (label: string, count: number, data: any) => {
  const handleClick = () => {
    alert(label);
  };
  return (
    <li>
      {label} ({count})
    </li>
  );
};
