import { Routes } from '@angular/router';
import { PayoutList } from './payout-list/payout-list';
import { RefundList } from './refund-list/refund-list';
import { Currency } from './currency/currency';
import { FinancialLayout } from './financial-layout/financial-layout';

export const financialRoutes: Routes = [
 {
   path: '',
   component: FinancialLayout,
   children: [
      {
         path:'',
         redirectTo: 'payouts',
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
      {
         path: 'currency',
         component: Currency
      },
   ]
 }
];

