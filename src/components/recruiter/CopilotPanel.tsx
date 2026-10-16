"use client";

import { Sparkles, Lightbulb } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export interface CopilotPanelProps {
  brief: string;
  suggestion: string;
  fallback?: boolean;
  loading?: boolean;
}

export function CopilotPanel({ brief, suggestion, loading }: CopilotPanelProps) {
  return (
    <Card className="bg-gradient-to-br from-brand-purple/10 to-brand-cyan/5 border-brand-purple/15">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-brand-purple to-brand-cyan shrink-0 shadow-glow-sm">
            <Sparkles size={15} className="text-white" />
          </span>
          AI Recruiter Copilot
        </CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white/70 leading-relaxed">{brief}</p>
            <div className="flex items-start gap-2.5 bg-white/5 rounded-xl p-3">
              <Lightbulb size={15} className="text-brand-cyan-light shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1">
                  Recommended Action
                </p>
                <p className="text-sm text-white/85 leading-snug">{suggestion}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
