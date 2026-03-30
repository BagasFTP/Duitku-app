import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface DynamicIconProps extends LucideProps {
    name: string;
}

const toPascalCase = (str: string) =>
    str.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');

export default function DynamicIcon({ name, ...props }: DynamicIconProps) {
    const key = toPascalCase(name);
    const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[key];
    if (!Icon) return <LucideIcons.CircleDashed {...props} />;
    return <Icon {...props} />;
}
