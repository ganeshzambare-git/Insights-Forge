import React, { useEffect, useRef } from 'react';
import type { GovernanceApproval } from '@/types/governance';

interface ExecutiveOverrideProps {
  approval: GovernanceApproval;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEscalate: (id: string) => void;
  onEmergencyOverride: (id: string) => void;
  onClose: () => void;
}

export const ExecutiveOverride: React.FC<ExecutiveOverrideProps> = ({
  approval,
  onApprove,
  onReject,
  onEscalate,
  onEmergencyOverride,
  onClose
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap and escape handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Restore focus to body (or previous active element in a real app hook)
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement;
    // Set focus to the dialog to trap it initially
    dialogRef.current?.focus();
    return () => {
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div 
        ref={dialogRef}
        role="dialog" 
        aria-modal="true"
        aria-labelledby="override-title"
        aria-describedby="override-desc"
        tabIndex={-1}
        className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg outline-none"
      >
        <h2 id="override-title" className="text-xl font-bold text-card-foreground mb-4">
          Executive Override Action Required
        </h2>
        
        <div id="override-desc" className="text-sm text-muted-foreground mb-6 space-y-2">
          <p><strong>Resource ID:</strong> {approval.resourceId}</p>
          <p><strong>Requested By:</strong> {approval.requestedBy}</p>
          <p><strong>Timestamp:</strong> {new Date(approval.timestamp).toLocaleString()}</p>
          <p><strong>Current Status:</strong> {approval.status}</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex gap-3 justify-end">
            <button 
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-muted"
            >
              Cancel
            </button>
            <button 
              onClick={() => onApprove(approval.id)}
              className="px-4 py-2 border border-brand-success text-brand-success rounded-none hover:bg-brand-success/10"
            >
              Approve
            </button>
            <button 
              onClick={() => onReject(approval.id)}
              className="px-4 py-2 border border-brand-error text-brand-error rounded-none hover:bg-brand-error/10"
            >
              Reject
            </button>
          </div>
          <hr className="border-border my-2" />
          <div className="flex gap-3 justify-between">
            <button 
              onClick={() => onEscalate(approval.id)}
              className="px-4 py-2 border border-brass text-brass rounded-none hover:bg-brass/10"
            >
              Escalate to Board
            </button>
            <button 
              onClick={() => onEmergencyOverride(approval.id)}
              className="px-4 py-2 border-2 border-destructive bg-destructive/10 text-destructive font-bold rounded-md hover:bg-destructive/20"
            >
              Emergency Override
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
