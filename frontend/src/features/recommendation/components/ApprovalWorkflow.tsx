import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { ApprovalWorkflow, ApprovalWorkflowStep } from '@/types/recommendation';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

interface ApprovalWorkflowProps {
  workflow: ApprovalWorkflow;
  className?: string;
}

export const ApprovalWorkflowComponent: React.FC<ApprovalWorkflowProps> = ({ workflow, className }) => {
  const getStatusConfig = (status: ApprovalWorkflowStep['status']) => {
    switch (status) {
      case 'approved':
        return { color: 'bg-brand-success/10 text-brand-success border-brand-success/20', icon: CheckCircle2 };
      case 'rejected':
        return { color: 'bg-brand-error/10 text-brand-error border-brand-error/20', icon: XCircle };
      case 'pending':
        return { color: 'bg-muted text-muted-foreground border-border', icon: Clock };
      case 'required':
        return { color: 'bg-brand-warning/10 text-brand-warning border-brand-warning/20', icon: AlertCircle };
      default:
        return { color: 'bg-muted text-muted-foreground border-border', icon: Clock };
    }
  };

  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-h4 font-medium flex items-center justify-between">
          <span>Approval Workflow</span>
          <Badge 
            variant="outline" 
            className={cn("capitalize", getStatusConfig(workflow.finalStatus as any).color)}
          >
            {workflow.finalStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {workflow.steps.map((step) => {
            const config = getStatusConfig(step.status);
            const Icon = config.icon;
            
            return (
              <div key={step.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                <span className="text-body font-medium">{step.role}</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className={cn("capitalize flex items-center space-x-1", config.color)}>
                    <Icon className="w-3 h-3 mr-1" />
                    {step.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
