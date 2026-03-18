

import { db } from '@/lib/db';
import { getTasks } from '@/lib/domain/tasks';
import { getProjects } from '@/lib/domain/projects';
import {
  Zap,
  Target,
  Activity,
  CheckSquare,
  Calendar,
  FolderKanban,
  Cpu,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  History,
  Terminal,
  Brain,
  Link as LinkIcon,
  Users,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

import { Task, Project } from '@/lib/types';
import { isSystemReady } from '@/lib/domain/agents';

export default function DashboardPage() {
  const tasks = getTasks();
  const projects = getProjects();
  const ready = isSystemReady();

  const stats = {
    totalTasks: tasks.length,
    activeDomains: projects.length,
    stuckTasks: tasks.filter(t => t.isStuck).length
  };

  if (!ready) {
    return (
      <div className="max-w-[1400px] p-4 sm:p-8 lg:p-12 space-y-8 sm:space-y-12 animate-in fade-in duration-1000">
        <div className="relative p-8 sm:p-12 lg:p-16 border border-orange-500/20 rounded-[2rem] sm:rounded-[3rem] lg:rounded-[4rem] bg-orange-500/[0.02] overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl opacity-50" />

          <div className="relative z-10 flex flex-col items-center text-center space-y-8 py-12">
            <div className="bg-orange-500/20 p-4 rounded-3xl border border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.1)]">
              <ShieldAlert className="w-12 h-12 text-orange-400 animate-pulse" />
            </div>

            <div className="space-y-4 max-w-2xl text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter">
                System <span className="text-orange-500 italic">Initialization</span>
              </h1>
              <p className="text-xl text-slate-400 font-medium leading-relaxed">
                Mission Control is online, but your agent roster requires registration. 
                Assign <span className="text-white font-bold underline decoration-orange-500/50 decoration-4 underline-offset-4">System Types</span> to your discovered agents to unlock orchestration capabilities.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-8">
              <Link 
                href="/team" 
                className="px-10 py-5 bg-orange-500 hover:bg-orange-400 text-black text-sm font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:scale-105 active:scale-95 flex items-center group"
              >
                Go to Team Registry
                <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2 animate-ping" />
                Setup Required for Orchestration
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder/Disabled Grid Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 opacity-40 grayscale pointer-events-none">
          <StatCard label="Pipeline Tasks" value="--" icon={Target} color="text-slate-500" sub="Offline" />
          <StatCard label="Stuck Recovery" value="--" icon={AlertTriangle} color="text-slate-500" sub="Offline" />
          <StatCard label="Uptime" value="0%" icon={Activity} color="text-slate-500" sub="Offline" />
          <StatCard label="Agent Roster" value="!" icon={Users} color="text-orange-500" sub="Unassigned" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] p-6 sm:p-10 lg:p-12 space-y-8 sm:space-y-12 animate-in fade-in duration-700">
      {/* Command Center Header */}
      <div className="relative p-8 sm:p-10 lg:p-12 border border-[#1a1a1a] rounded-[2rem] sm:rounded-[3rem] bg-[#101010] overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl opacity-50" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600/20 p-2 rounded-xl border border-blue-500/20">
                <Zap className="w-5 h-5 text-blue-400 animate-pulse" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Autonomous Orchestration Layer Active</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
              Mission <span className="text-blue-500">Control</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 font-medium max-w-2xl leading-relaxed">
              Canonical system online. Managing <span className="text-white font-black">{stats.totalTasks}</span> durable tasks across <span className="text-white font-black">{stats.activeDomains}</span> active domains.
            </p>
          </div>

          <div className="flex items-center md:justify-end">
            <div className="bg-[#09090b] border border-[#1a1a1a] rounded-2xl p-4 sm:p-6 flex flex-col items-center min-w-[120px]">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Status</span>
              <span className="text-lg sm:text-xl font-black text-emerald-500">NOMINAL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Orchestration Pulse Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6">
        <StatCard label="Pipeline Tasks" value={stats.totalTasks} icon={Target} color="text-blue-500" sub="Durable" href="/tasks" />
        <StatCard label="Stuck Recovery" value={stats.stuckTasks} icon={AlertTriangle} color="text-red-500" sub="Alerts active" href="/tasks" />
        <StatCard label="Uptime" value="100%" icon={Activity} color="text-emerald-500" sub="Real-time" href="/office" />
        <StatCard label="Agent Roster" value="6" icon={Users} color="text-indigo-500" sub="Canonical" href="/team" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* Left: Pipeline Insight */}
        <div className="lg:col-span-2 space-y-8">
          <SectionHeader title="Active Pipeline" icon={History} link="/tasks" />
          <div className="grid grid-cols-1 gap-4">
            {tasks.slice(0, 5).map((task) => (
              <Link key={task.id} href="/tasks" className="group p-6 bg-[#101010] border border-[#1a1a1a] rounded-2xl hover:border-slate-700 transition-all flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-6">
                  <div className={cn(
                    "w-3 h-3 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]",
                    task.status === 'Complete' ? "bg-emerald-500" : task.isStuck ? "bg-red-500 shadow-red-500/40 animate-pulse" : "bg-blue-500 shadow-blue-500/40"
                  )} />
                  <div>
                    <h3 className="font-black text-white text-base group-hover:text-blue-400 transition-colors uppercase tracking-tight">{task.title}</h3>
                    <div className="flex items-center space-x-3 mt-1.5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{task.owner}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-800" />
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{task.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  {task.evidence && <LinkIcon className="w-4 h-4 text-emerald-500/50" />}
                  <ArrowRight className="w-5 h-5 text-slate-800 group-hover:text-white transition-all group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Domain Pulse */}
        <div className="space-y-8">
          <SectionHeader title="Domain Progress" icon={Cpu} link="/projects" />
          <div className="space-y-8 p-8 bg-[#101010] border border-[#1a1a1a] rounded-3xl shadow-xl">
            {projects.slice(0, 4).map((project) => (
              <Link key={project.id} href="/projects" className="block space-y-3 group/project transition-all hover:opacity-80">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black text-white uppercase tracking-widest group-hover/project:text-blue-400">{project.name}</span>
                  <span className="text-[10px] font-black text-slate-500">{Math.round(project.progress)}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#09090b] rounded-full overflow-hidden border border-[#1a1a1a]">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(37,99,235,0.4)] group-hover/project:bg-blue-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </Link>
            ))}
            <Link href="/projects" className="block text-center py-4 bg-[#09090b] border border-[#1a1a1a] rounded-2xl text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-white hover:border-slate-700 transition-all mt-4">
              Access All Domains
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub, href }: any) {
  const content = (
    <>
      <div className="absolute -bottom-4 -right-4 opacity-[0.02] group-hover:opacity-10 transition-opacity text-white">
        <Icon className="w-24 h-24" />
      </div>
      <div className={cn("p-3 rounded-2xl w-fit mb-6 bg-[#09090b] border border-[#1a1a1a]", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-4xl font-black text-white tracking-tighter">{value}</div>
      <div className="flex items-center space-x-2 mt-2">
        <div className="w-1 h-1 rounded-full bg-slate-700" />
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</div>
      </div>
      <div className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mt-4 group-hover:text-slate-400">{sub}</div>
    </>
  );

  return (
    <div className="relative group">
      {href ? (
        <Link href={href} className="block p-8 bg-[#101010] border border-[#1a1a1a] rounded-3xl shadow-xl hover:border-slate-700 transition-all overflow-hidden">
          {content}
        </Link>
      ) : (
        <div className="p-8 bg-[#101010] border border-[#1a1a1a] rounded-3xl shadow-xl hover:border-slate-700 transition-all overflow-hidden">
          {content}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, icon: Icon, link }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Icon className="w-5 h-5 text-slate-400" />
        <h2 className="text-base font-black text-white uppercase tracking-[0.2em]">{title}</h2>
      </div>
      {link && (
        <Link href={link} className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors border-b border-blue-500/20 pb-1">
          View Detail
        </Link>
      )}
    </div>
  );
}
