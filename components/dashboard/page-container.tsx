import { type ReactNode } from "react";

type DashboardPageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardPageContainer({ children, className = "" }: DashboardPageContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}
