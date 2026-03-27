import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface DynamicIconProps extends LucideProps {
    name: string;
}

export default function DynamicIcon({ name, ...props }: DynamicIconProps) {
    const Icon = (LucideIcons as Record<string, React.ComponentType<LucideProps>>)[name];
    if (!Icon) return <LucideIcons.CircleDashed {...props} />;
    return <Icon {...props} />;
}
