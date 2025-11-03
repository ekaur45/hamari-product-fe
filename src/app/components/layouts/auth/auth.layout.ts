import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-auth.layout',
  imports: [RouterOutlet],
  templateUrl: './auth.layout.html',
  styleUrl: './auth.layout.css',
  providers: [MessageService]
})
export class AuthLayout {

}
