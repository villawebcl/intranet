import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";

interface StatCardProps {
    label: string;
    value: string | number;
    hint?: string;
    href?: string;
}

export function StatCard({ label, value, hint, href }: StatCardProps) {
    const content = (
        <Card>
            <CardHeader>
                <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
            </CardContent>
        </Card>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }

    return content;
}
