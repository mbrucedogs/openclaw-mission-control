'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  XCircle, 
  AlertCircle,
  ChevronRight,
  Play,
  Check,
  X,
  User,
  FileText,
  Clock3,
  GitBranch
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskWorkflowStep {
  id: string;
  taskId: string;
  stepNumber: number;
  workflowId: string;
  workflowName: string;
  agentId: string;
  agentName?: string;
  status: 'pending' | 'in-progress' | 'complete' | 'failed' | 'blocked';
  startedAt?: string;
  completedAt?: string;
  durationMinutes?: number;
  evidenceIds: string[];
  deliverables: string[];
  completionNotes?: string;
  blockers?: string;
  questions?: string;
  validatedBy?: string;
  validationNotes?: string;
  passFail?: 'pass' | 'fail';
  nextStepId?: string;
  handoffNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskWorkflowStepsProps {
  taskId: string;
  pipelineName?: string;
  pipelineDescription?: string;
}

const STATUS_CONFIG = {
  pending: { icon: Circle, color: 'text-slate-500', bg: 'bg-slate-900', border: 'border-slate-700' },
  'in-progress': { icon: Play, color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-700' },
  complete: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-700' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-700' },
  blocked: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-700' },
};

const PASS_FAIL_CONFIG = {
  pass: { icon: Check, color: 'text-green-400', label: 'PASS' },
  fail: { icon: X, color: 'text-red-400', label: 'FAIL' },
};

export function TaskWorkflowSteps({ taskId, pipelineName, pipelineDescription }: TaskWorkflowStepsProps) {
  const [steps, setSteps] = useState<TaskWorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  useEffect(() => {
    fetchSteps();
  }, [taskId]);

  const fetchSteps = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/steps`, {
      });
      if (res.ok) {
        const data = await res.json();
        setSteps(data);
      } else {
        setError('Failed to load steps');
      }
    } catch (err) {
      setError('Error loading steps');
    } finally {
      setLoading(false);
    }
  };

  const handleStartStep = async (stepId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'start' })
      });
      if (res.ok) {
        fetchSteps();
      }
    } catch (err) {
      console.error('Failed to start step:', err);
    }
  };

  const handleCompleteStep = async (stepId: string, passFail: 'pass' | 'fail') => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'complete',
          passFail,
          completionNotes: 'Step completed via UI'
        })
      });
      if (res.ok) {
        fetchSteps();
      }
    } catch (err) {
      console.error('Failed to complete step:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
        <p className="text-slate-400 text-sm">No workflow steps defined for this task.</p>
      </div>
    );
  }

  const completedSteps = steps.filter(s => s.status === 'complete').length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <div className="space-y-4">
      {/* Pipeline Header */}
      {(pipelineName || pipelineDescription) && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-4">
          {pipelineName && (
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">{pipelineName}</h3>
            </div>
          )}
          {pipelineDescription && (
            <p className="text-xs text-slate-400 ml-6">{pipelineDescription}</p>
          )}
        </div>
      )}

      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Pipeline Progress</h3>
          <p className="text-xs text-slate-400">
            {completedSteps} of {steps.length} steps complete
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-white">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-6">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const config = STATUS_CONFIG[step.status];
          const Icon = config.icon;
          const isExpanded = expandedStep === step.id;
          const isLast = index === steps.length - 1;

          return (
            <div 
              key={step.id}
              className={cn(
                'border rounded-xl overflow-hidden transition-all',
                config.border,
                config.bg
              )}
            >
              {/* Step Header */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Step Number */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border-2',
                    config.border,
                    config.bg
                  )}>
                    <span className={cn('text-xs font-bold', config.color)}>
                      {step.stepNumber}
                    </span>
                  </div>

                  {/* Status Icon */}
                  <Icon className={cn('w-5 h-5', config.color)} />

                  {/* Step Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white truncate">
                        {step.workflowName}
                      </h4>
                      {step.passFail && (
                        <span className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded',
                          step.passFail === 'pass' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                        )}>
                          {step.passFail.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {step.agentName || step.agentId}
                      </span>
                      {step.durationMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock3 className="w-3 h-3" />
                          {step.durationMinutes}m
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand/Collapse */}
                  <ChevronRight 
                    className={cn(
                      'w-4 h-4 text-slate-500 transition-transform',
                      isExpanded && 'rotate-90'
                    )} 
                  />
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-700/50 pt-4">
                  <div className="space-y-3">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-xs font-bold px-2 py-1 rounded uppercase',
                        config.bg,
                        config.color
                      )}>
                        {step.status}
                      </span>
                    </div>

                    {/* Evidence */}
                    {step.evidenceIds.length > 0 && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Evidence
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {step.evidenceIds.map((evId) => (
                            <span 
                              key={evId}
                              className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              {evId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deliverables */}
                    {step.deliverables.length > 0 && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Deliverables
                        </h5>
                        <ul className="space-y-1">
                          {step.deliverables.map((del, i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                              <Check className="w-3 h-3 text-green-400" />
                              {del}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Completion Notes */}
                    {step.completionNotes && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Notes
                        </h5>
                        <p className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded">
                          {step.completionNotes}
                        </p>
                      </div>
                    )}

                    {/* Blockers */}
                    {step.blockers && (
                      <div>
                        <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
                          Blockers
                        </h5>
                        <p className="text-xs text-red-300 bg-red-900/20 p-2 rounded border border-red-800">
                          {step.blockers}
                        </p>
                      </div>
                    )}

                    {/* Validation */}
                    {step.validatedBy && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Validation
                        </h5>
                        <div className="text-xs text-slate-300">
                          <p>Validated by: {step.validatedBy}</p>
                          {step.validationNotes && (
                            <p className="mt-1 text-slate-400">{step.validationNotes}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {step.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartStep(step.id);
                        }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        Start Step
                      </button>
                    )}

                    {step.status === 'in-progress' && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteStep(step.id, 'pass');
                          }}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          Complete (Pass)
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteStep(step.id, 'fail');
                          }}
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Complete (Fail)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
