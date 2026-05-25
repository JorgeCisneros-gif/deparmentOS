"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimezoneService = void 0;
const common_1 = require("@nestjs/common");
let TimezoneService = class TimezoneService {
    parseToUTC(dateStr, buildingTimezone = 'America/Lima') {
        if (dateStr.includes('T') && (dateStr.includes('+') || dateStr.match(/-\d{2}:\d{2}$/))) {
            return new Date(dateStr);
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [y, m, d] = dateStr.split('-').map(Number);
            const offset = this.getOffsetMinutes(buildingTimezone, new Date(y, m - 1, d));
            const offsetMs = offset * 60 * 1000;
            const noonLocal = Date.UTC(y, m - 1, d, 12, 0, 0);
            return new Date(noonLocal - offsetMs);
        }
        return new Date(dateStr);
    }
    getOffsetMinutes(timezone, date = new Date()) {
        const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
        const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
        return (utcDate.getTime() - tzDate.getTime()) / 60000;
    }
    formatForDisplay(date, timezone, locale, options) {
        if (!date)
            return '—';
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleString(locale, {
            timeZone: timezone,
            ...options,
        });
    }
    diffDaysInTimezone(date1, date2, timezone) {
        const toMidnight = (d) => {
            const str = d.toLocaleDateString('en-CA', { timeZone: timezone });
            const [y, m, day] = str.split('-').map(Number);
            return Date.UTC(y, m - 1, day);
        };
        return Math.round((toMidnight(date1) - toMidnight(date2)) / 86400000);
    }
    todayInTimezone(timezone) {
        return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
    }
    nowUTC() {
        return new Date();
    }
};
exports.TimezoneService = TimezoneService;
exports.TimezoneService = TimezoneService = __decorate([
    (0, common_1.Injectable)()
], TimezoneService);
//# sourceMappingURL=timezone.service.js.map