interface CalendarDay {
    date: Date;
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    hasAvailability: boolean;
    slots: any[];
}
export default CalendarDay;