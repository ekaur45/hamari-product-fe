import { CommonModule } from "@angular/common";
import { Component, computed, HostListener, signal } from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { SubjectService } from "../../../shared";
import { Subject, TeacherSubject } from "../../../shared/models";
import BookingCalendar from "../../../components/misc/booking-calendar/booking-calendar";



@Component({
    selector: 'app-book-class',
    standalone: true,
    templateUrl: './book-class.html',
    imports: [CommonModule, RouterModule, BookingCalendar],
})
export default class BookClass {
    subjectId = signal<string>('');
    subject = signal<Subject | null>(null);
    selectedTeacher = signal<TeacherSubject | null>(null);
    isLoading = signal(false);
    
    
    
    
    
    
   

    
    
    availableTeachers = computed(() => {
        const subj = this.subject();
        return subj?.teacherSubjects?.filter(ts => ts.teacher) || [];
    });

 

    

    constructor(
        private route: ActivatedRoute,
        private subjectService: SubjectService
    ) {
        this.route.params.subscribe(params => {
            this.subjectId.set(params['id']);
            this.getSubjectById();
        });
    }

    getSubjectById(): void {
        this.isLoading.set(true);
        this.subjectService.getSubjectById(this.subjectId()).subscribe({
            next: (subject) => {
                this.subject.set(subject);
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error(error);
                this.isLoading.set(false);
            }
        });
    }

    selectTeacher(teacherSubject: TeacherSubject): void {
        this.selectedTeacher.set(teacherSubject);
    }

    getGroupedAvailabilitySlots(availabilities: any[] | undefined): { day: string; slots: any[] }[] {
        if (!availabilities || availabilities.length === 0) return [];
        
        const grouped = availabilities.reduce((acc, slot) => {
            const day = slot.dayOfWeek?.toLowerCase() || '';
            if (!acc[day]) {
                acc[day] = [];
            }
            acc[day].push(slot);
            return acc;
        }, {} as Record<string, any[]>);

        Object.keys(grouped).forEach(day => {
            grouped[day].sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || ''));
        });

        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        return Object.entries(grouped)
            .map(([day, slots]) => ({ day, slots: slots as any[] }))
            .sort((a, b) => {
                const aIndex = dayOrder.indexOf(a.day.toLowerCase());
                const bIndex = dayOrder.indexOf(b.day.toLowerCase());
                return aIndex - bIndex;
            });
    }

    

    formatDayName(day: string): string {
        const dayMap: Record<string, string> = {
            'monday': 'Monday',
            'tuesday': 'Tuesday',
            'wednesday': 'Wednesday',
            'thursday': 'Thursday',
            'friday': 'Friday',
            'saturday': 'Saturday',
            'sunday': 'Sunday'
        };
        return dayMap[day.toLowerCase()] || day;
    }

    

    

    

    

   

    

    

    

   

    

    
}