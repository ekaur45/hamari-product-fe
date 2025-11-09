import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
@Component({
    selector: 'app-test-payment',
    templateUrl: './test-payment.html',
    standalone: true,
    imports: [CommonModule, RouterModule]
})
export default class TestPayment implements OnInit {
    constructor() {
    }
    ngOnInit(): void {
    }
}