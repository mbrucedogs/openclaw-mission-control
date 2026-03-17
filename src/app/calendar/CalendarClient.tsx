'use client';

import { useState } from 'react';
import { ScheduleJob } from '@/lib/types';
import {
    Zap,
    RefreshCcw,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Clock,
    LayoutGrid,
    CalendarDays,
    Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CronExpressionParser } from 'cron-parser';

interface ParsedJob {
    time: string;
    name: string;
    color: string;
}

const colors = [
    'bg-orange-500/10 text-orange-500 border-orange-500/20',
    'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'bg-pink-500/10 text-pink-500 border-pink-500/20',
    'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
];

export default function CalendarClient({ schedules }: { schedules: ScheduleJob[] }) {
    const [view, setView] = useState<'week' | 'today'>('week');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayIndex = new Date().getDay();

    const alwaysRunning: { name: string, interval: string, active?: boolean }[] = [];
    const dayJobs: Record<number, ParsedJob[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

    schedules.forEach((job, idx) => {
        const color = colors[idx % colors.length];

        if (!job.cron) {
            if (job.nextRunAt) {
                const date = new Date(job.nextRunAt);
                const displayTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                dayJobs[date.getDay()].push({ time: displayTime, name: job.name, color });
            } else {
                alwaysRunning.push({ name: job.name, interval: 'Manual/Unknown' });
            }
            return;
        }

        try {
            const interval = CronExpressionParser.parse(job.cron);
            const next1 = interval.next().toDate();
            const next2 = interval.next().toDate();
            const diffMs = next2.getTime() - next1.getTime();

            if (diffMs <= 60 * 60 * 1000) {
                let intervalStr = 'Frequent';
                if (diffMs === 60 * 1000) intervalStr = 'Every minute';
                else if (diffMs === 5 * 60 * 1000) intervalStr = 'Every 5 min';
                else if (diffMs === 30 * 60 * 1000) intervalStr = 'Every 30 min';
                else if (diffMs === 60 * 60 * 1000) intervalStr = 'Hourly';
                
                alwaysRunning.push({ name: job.name, interval: intervalStr, active: true });
            } else {
                const displayTime = CronExpressionParser.parse(job.cron).next().toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                const dayChecker = CronExpressionParser.parse(job.cron);
                const activeDays = new Set<number>();
                for (let i = 0; i < 30; i++) {
                    activeDays.add(dayChecker.next().toDate().getDay());
                }
                
                const daysToRun = activeDays.size > 0 ? Array.from(activeDays) : [0,1,2,3,4,5,6];
                for (const d of daysToRun) {
                    dayJobs[d].push({ time: displayTime, name: job.name, color });
                }
            }
        } catch (e) {
            alwaysRunning.push({ name: job.name, interval: 'Invalid Cron' });
        }
    });

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a]">
            <div className="px-12 py-10 border-b border-[#1a1a1a] bg-[#09090b] mb-8">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                        <Calendar className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white uppercase tracking-[0.2em] leading-none">Calendar</h1>
                        <p className="text-[10px] font-bold text-slate-500 mt-1.5 uppercase tracking-wider italic opacity-70">Scheduled tasks and system routines</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="bg-[#101010] border border-[#1a1a1a] rounded-lg p-1 flex space-x-1">
                        <button 
                            onClick={() => setView('week')}
                            className={cn(
                                "px-3 py-1 text-[11px] font-black uppercase tracking-widest transition-all rounded-md",
                                view === 'week' ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:bg-[#1a1a1a]/50"
                            )}
                        >
                            Week
                        </button>
                        <button 
                            onClick={() => setView('today')}
                            className={cn(
                                "px-3 py-1 text-[11px] font-black uppercase tracking-widest transition-all rounded-md",
                                view === 'today' ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:bg-[#1a1a1a]/50"
                            )}
                        >
                            Today
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto px-12 pb-20 relative">
            {alwaysRunning.length > 0 && (
                <div className="bg-[#0c0c0e] border border-[#1a1a1a] rounded-2xl p-6">
                    <div className="flex items-center space-x-4 mb-6">
                        <Zap className="w-4 h-4 text-blue-500" />
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-white">Always Running</h3>
                    </div>
                    <div className="flex items-center space-x-3 flex-wrap gap-y-3">
                        {alwaysRunning.map((job, idx) => (
                            <RunningTag key={idx} name={job.name} interval={job.interval} active={job.active} />
                        ))}
                    </div>
                </div>
            )}

            <div className={cn(
                "grid gap-4",
                view === 'week' ? "grid-cols-7" : "grid-cols-1 max-w-2xl"
            )}>
                {days.map((day, i) => {
                    const isToday = i === todayIndex;
                    if (view === 'today' && !isToday) return null;

                    return (
                        <div key={day} className={cn(
                            "flex flex-col space-y-4",
                            view === 'week' ? "min-h-[600px] opacity-80" : "w-full opacity-100",
                            isToday && view === 'week' && "opacity-100"
                        )}>
                            <div className="mb-4">
                                <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{day}</h3>
                                <div className={cn(
                                    "h-0.5 w-full rounded-full transition-all",
                                    isToday ? "bg-blue-600" : "bg-transparent"
                                )} />
                            </div>

                            <div className="space-y-2">
                                {dayJobs[i].map((slot, idx) => (
                                    <div key={idx} className={cn(
                                        "p-3 rounded-xl border text-[11px] space-y-1 transition-all hover:scale-[1.02] cursor-pointer",
                                        slot.color,
                                        view === 'today' && "text-sm p-4"
                                    )}>
                                        <div className="font-black uppercase tracking-widest opacity-80">{slot.name}</div>
                                        <div className="font-bold tracking-tight">{slot.time}</div>
                                    </div>
                                ))}
                                {dayJobs[i].length === 0 && (
                                    <div className="text-[11px] text-slate-600 font-bold italic py-4 opacity-40">No tasks scheduled</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
);
}

function RunningTag({ name, interval, active }: { name: string, interval: string, active?: boolean }) {
    return (
        <div className={cn(
            "px-4 py-2 border rounded-xl flex items-center space-x-3 transition-all",
            active
                ? "bg-orange-500/10 border-orange-500/40 text-orange-500"
                : "bg-[#101010] border-[#1a1a1a] text-slate-500"
        )}>
            <span className="text-[13px] font-bold">{name}</span>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">• {interval}</span>
        </div>
    )
}
