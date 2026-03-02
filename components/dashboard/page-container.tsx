import { type ReactNode } from "react";

type DashboardPageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardPageContainer({ children, className = "" }: DashboardPageContainerProps) {
  return (
    <div className={`w-full px-4 py-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}
