import { db } from '@/lib/db';
import { ScheduleJob } from '@/lib/types';
import CalendarClient from './CalendarClient';

export function getSchedules(): ScheduleJob[] {
    return db.prepare('SELECT * FROM schedule_jobs').all() as ScheduleJob[];
}

export default function CalendarPage() {
    const schedules = getSchedules();
    return <CalendarClient schedules={schedules} />;
}
