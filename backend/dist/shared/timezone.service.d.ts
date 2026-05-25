export declare class TimezoneService {
    parseToUTC(dateStr: string, buildingTimezone?: string): Date;
    getOffsetMinutes(timezone: string, date?: Date): number;
    formatForDisplay(date: Date | string | null, timezone: string, locale: string, options?: Intl.DateTimeFormatOptions): string;
    diffDaysInTimezone(date1: Date, date2: Date, timezone: string): number;
    todayInTimezone(timezone: string): string;
    nowUTC(): Date;
}
