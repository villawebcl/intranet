interface SectionHeaderProps {
    title: string;
    description?: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
    return (
        <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                {title}
            </h1>
            {description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>}
        </div>
    );
}
