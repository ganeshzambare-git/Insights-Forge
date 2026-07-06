import React from 'react';
import { cn } from '@/lib/utils';

interface OSLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const OSLayout: React.FC<OSLayoutProps> = ({ title, description, children, className }) => {
  return (
    <div className={cn("flex flex-col gap-24", className)}>
      {/* Hidden inside workspace bands (the band intro already names the OS) */}
      <div className="os-layout-header flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-foreground tracking-tight">{title}</h1>
          {description && <p className="text-body text-muted-foreground mt-2">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
};
