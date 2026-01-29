import { Injectable } from "@angular/core";
import { io, Socket, SocketOptions } from "socket.io-client";
import { BehaviorSubject, Observable } from "rxjs";
import { AuthService } from "./auth.service";
import { environment } from "../../../environments/environment";
import { SOCKET } from "../constants/api.constants";

@Injectable({
  providedIn: 'root'
})
export class MainSocketService {
  private socket!: Socket;
  private readonly url = environment.apiUrl;
  private readonly options: SocketOptions = {  auth: { withCredentials: true } };

  // Reactive store for online users
  private onlineUsersSubject = new BehaviorSubject<{ [userId: string]: boolean }>({});
  public onlineUsers$: Observable<{ [userId: string]: boolean }> = this.onlineUsersSubject.asObservable();

  // Reactive store for individual user status
  private userStatusSubjects = new Map<string, BehaviorSubject<{ userId: string, isOnline: boolean }>>();
  private checkSocketConnection(): void {
    if (!this.socket) {
        const socketUrl = environment.socketUrl.endsWith('/')
            ? environment.socketUrl.slice(0, -1)
            : environment.socketUrl;
        console.log('✅ Socket URL', `${socketUrl}/${SOCKET.NAMESPACE.MAIN}`);
        this.socket = io(`${socketUrl}/${SOCKET.NAMESPACE.MAIN}`, {
            withCredentials: true // crucial for cookies
          });
    }
}
  constructor(private authService: AuthService) {
    
  }
  connectToSocket(): void {
    this.checkSocketConnection();

    if(this.socket){
        // Emit online when socket connects
    this.socket.on('connect', () => {
        const userId = this.authService.getCurrentUser()?.id;
        if (userId) {
          this.socket.emit('online-status', { userId });
          this.updateOnlineUsers(userId, true);
        }
      });
  
      // Listen to all online users on connect
      this.socket.on('all-online-users', (onlineUsers: { [userId: string]: boolean }) => {
        this.onlineUsersSubject.next(onlineUsers);
  
        // Initialize individual user status subjects
        Object.keys(onlineUsers).forEach(userId => {
          if (!this.userStatusSubjects.has(userId)) {
            this.userStatusSubjects.set(userId, new BehaviorSubject({ userId, isOnline: onlineUsers[userId] }));
          } else {
            this.userStatusSubjects.get(userId)!.next({ userId, isOnline: onlineUsers[userId] });
          }
        });
      });
    }
  }

  /** Subscribe to a specific user's online/offline status */
  listenToUserStatus(userId: string): Observable<{ userId: string, isOnline: boolean }> {
    this.checkSocketConnection();
    // Create subject if it doesn't exist
    if (!this.userStatusSubjects.has(userId)) {
      this.userStatusSubjects.set(userId, new BehaviorSubject<{ userId: string, isOnline: boolean }>({ userId, isOnline: false }));
    }

    // Listen to server events for this user
    this.socket.on(`online-status_${userId}`, (d) => {
      this.userStatusSubjects.get(userId)!.next({ ...d });
    });

    this.socket.on(`offline-status_${userId}`, (d) => {
      this.userStatusSubjects.get(userId)!.next({ ...d });
    });
    this.socket.onAny((event: string, data: any) => {
      console.log('✅ Event received', event, data);
      if(event.startsWith('online-status_')) {
        const userId = event.split('_')[1];
        this.userStatusSubjects.get(userId)!.next({ ...data });
        this.updateOnlineUsers(userId, data.isOnline);
      }
      if(event.startsWith('offline-status_')) {
        const userId = event.split('_')[1];
        this.userStatusSubjects.get(userId)!.next({ ...data });
        this.updateOnlineUsers(userId, false);
      }
    });

    return this.userStatusSubjects.get(userId)!.asObservable();
  }

  /** Generic method for subscribing to any server event */
  listenToEventsFromServer(event: string): Observable<any> {
    const subject = new BehaviorSubject<any>(null);
    this.socket.on(event, data => subject.next(data));
    return subject.asObservable();
  }

  /** Helper to update the global online users object */
  private updateOnlineUsers(userId: string, isOnline: boolean) {
    const current = this.onlineUsersSubject.value;
    this.onlineUsersSubject.next({ ...current, [userId]: isOnline });
  }
}
