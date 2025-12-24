import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { ParentChildService } from "../../../shared/services/parent-child.service";
import { Assignment, StudentScheduleDto, StudentPerformanceDto } from "../../../shared";

@Component({
  selector: 'app-child-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './child-detail.html',
})
export class ChildDetail implements OnInit {
  childId = signal<string>('');
  activeTab = signal<'classes' | 'assignments' | 'schedule' | 'bookings' | 'performance'>('classes');
  
  // Classes
  classes = signal<any[]>([]);
  classesLoading = signal(false);
  
  // Assignments
  assignments = signal<Assignment[]>([]);
  assignmentsLoading = signal(false);
  assignmentsPagination = signal({ page: 1, limit: 10, total: 0 });
  
  // Schedule
  schedule = signal<StudentScheduleDto | null>(null);
  scheduleLoading = signal(false);
  
  // Bookings
  bookings = signal<any[]>([]);
  bookingsLoading = signal(false);
  bookingsPagination = signal({ page: 1, limit: 10, total: 0 });
  
  // Performance
  performance = signal<StudentPerformanceDto | null>(null);
  performanceLoading = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private parentChildService: ParentChildService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['childId']) {
        this.childId.set(params['childId']);
        this.loadActiveTab();
      }
    });
    
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab.set(params['tab'] as any);
        this.loadActiveTab();
      }
    });
  }

  setActiveTab(tab: 'classes' | 'assignments' | 'schedule' | 'bookings' | 'performance'): void {
    this.activeTab.set(tab);
    this.router.navigate([], { 
      relativeTo: this.route, 
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
    this.loadActiveTab();
  }

  loadActiveTab(): void {
    const tab = this.activeTab();
    switch (tab) {
      case 'classes':
        this.loadClasses();
        break;
      case 'assignments':
        this.loadAssignments();
        break;
      case 'schedule':
        this.loadSchedule();
        break;
      case 'bookings':
        this.loadBookings();
        break;
      case 'performance':
        this.loadPerformance();
        break;
    }
  }

  loadClasses(): void {
    this.classesLoading.set(true);
    this.parentChildService.getChildClasses(this.childId()).subscribe({
      next: (result) => {
        this.classes.set(result.classes);
        this.classesLoading.set(false);
      },
      error: () => {
        this.classesLoading.set(false);
      }
    });
  }

  loadAssignments(page: number = 1): void {
    this.assignmentsLoading.set(true);
    this.parentChildService.getChildAssignments(this.childId(), page, this.assignmentsPagination().limit).subscribe({
      next: (result) => {
        this.assignments.set(result.assignments);
        this.assignmentsPagination.set({ ...this.assignmentsPagination(), page, total: result.total });
        this.assignmentsLoading.set(false);
      },
      error: () => {
        this.assignmentsLoading.set(false);
      }
    });
  }

  loadSchedule(): void {
    this.scheduleLoading.set(true);
    this.parentChildService.getChildSchedule(this.childId()).subscribe({
      next: (result) => {
        this.schedule.set(result);
        this.scheduleLoading.set(false);
      },
      error: () => {
        this.scheduleLoading.set(false);
      }
    });
  }

  loadBookings(page: number = 1): void {
    this.bookingsLoading.set(true);
    this.parentChildService.getChildBookings(this.childId(), page, this.bookingsPagination().limit).subscribe({
      next: (result) => {
        this.bookings.set(result.bookings);
        this.bookingsPagination.set({ ...this.bookingsPagination(), page, total: result.total });
        this.bookingsLoading.set(false);
      },
      error: () => {
        this.bookingsLoading.set(false);
      }
    });
  }

  loadPerformance(): void {
    this.performanceLoading.set(true);
    this.parentChildService.getChildPerformance(this.childId()).subscribe({
      next: (result) => {
        this.performance.set(result);
        this.performanceLoading.set(false);
      },
      error: () => {
        this.performanceLoading.set(false);
      }
    });
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  }

  getSubmissionStatus(assignment: Assignment): { status: string; submission: any } {
    const submission = assignment.submissions?.find(s => s.studentId === this.childId());
    if (!submission) {
      return { status: 'not_submitted', submission: null };
    }
    return { status: submission.status, submission };
  }

  isPastDue(assignment: Assignment): boolean {
    if (!assignment.dueDate) return false;
    return new Date(assignment.dueDate) < new Date();
  }

  getPercentage(score: number | null, maxScore: number): number {
    if (score === null || maxScore === 0) return 0;
    return (score / maxScore) * 100;
  }
}

