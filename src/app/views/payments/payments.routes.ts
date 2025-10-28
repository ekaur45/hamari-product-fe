import { Routes } from '@angular/router';
import { PaymentsList } from './payments-list/payments-list';
import { PaymentDetail } from './payment-detail/payment-detail';
import { PaymentForm } from './payment-form/payment-form';
import { RoleGuard } from '../../shared/guards/auth.guard';
import { UserRole } from '../../shared/models';

export const paymentRoutes: Routes = [
  {
    path: '',
    component: PaymentsList
  },
  {
    path: 'new',
    component: PaymentForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER] } // Only admin and academy owner can create payments
  },
  {
    path: ':id',
    component: PaymentDetail
  },
  {
    path: ':id/edit',
    component: PaymentForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER] } // Only admin and academy owner can edit payments
  }
];
