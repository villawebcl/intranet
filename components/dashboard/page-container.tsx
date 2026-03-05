import { type ReactNode } from "react";

type DashboardPageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardPageContainer({ children, className = "" }: DashboardPageContainerProps) {
  return (
    <div className={`w-full ${className}`}>
      {children}
    </div>
  );
}
