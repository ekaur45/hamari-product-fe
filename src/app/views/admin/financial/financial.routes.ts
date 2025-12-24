import { Routes } from '@angular/router';
import { PayoutList } from './payout-list/payout-list';
import { RefundList } from './refund-list/refund-list';

export const financialRoutes: Routes = [
 {
    path:'',
    redirectTo: '/payouts',
    pathMatch: 'full'
 },
 {
    path: 'payouts',
    component: PayoutList
 },
 {
    path: 'refunds',
    component: RefundList
 },
];

