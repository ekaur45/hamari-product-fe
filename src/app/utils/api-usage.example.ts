/**
 * API Usage Examples
 * This file demonstrates how to use the API utilities in your components
 */

import { Component, OnInit } from '@angular/core';
import { ApiService, ApiHelper } from './index';
import { ApiResponse, PaginatedApiResponse } from '../shared/models';

// Example User interface
interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// Example Product interface
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  stock: number;
}

@Component({
  selector: 'app-example',
  template: '<div>API Usage Examples Component</div>'
})
export class ApiUsageExampleComponent implements OnInit {
  users: User[] = [];
  products: Product[] = [];
  isLoading = false;
  error: string | null = null;
  pagination: any = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadUsers();
    this.loadProducts();
  }

  /**
   * Example 1: Basic GET request
   */
  loadUsers() {
    this.apiService.get<User[]>('/users')
      .subscribe({
        next: (response: ApiResponse<User[]>) => {
          if (ApiHelper.isSuccess(response)) {
            this.users = ApiHelper.extractData(response);
            this.error = null;
          } else {
            this.error = ApiHelper.getErrorMessage(response);
          }
        },
        error: (error) => {
          this.error = ApiHelper.formatErrorMessage(error);
        }
      });
  }

  /**
   * Example 2: Paginated GET request
   */
  loadProducts(page: number = 1, limit: number = 10) {
    this.apiService.getPaginated<Product>('/products', page, limit)
      .subscribe({
        next: (response: PaginatedApiResponse<Product>) => {
          if (ApiHelper.isSuccess(response)) {
            this.products = ApiHelper.extractData(response);
            this.pagination = ApiHelper.getPaginationInfo(response);
            this.error = null;
          } else {
            this.error = ApiHelper.getErrorMessage(response);
          }
        },
        error: (error) => {
          this.error = ApiHelper.formatErrorMessage(error);
        }
      });
  }

  /**
   * Example 3: POST request with data
   */
  createUser(userData: Partial<User>) {
    this.apiService.post<User>('/users', userData)
      .subscribe({
        next: (response: ApiResponse<User>) => {
          if (ApiHelper.isSuccess(response)) {
            const newUser = ApiHelper.extractData(response);
            this.users.push(newUser);
          } else {
            this.error = ApiHelper.getErrorMessage(response);
          }
        },
        error: (error) => {
          this.error = ApiHelper.formatErrorMessage(error);
        }
      });
  }

  /**
   * Example 4: PUT request to update data
   */
  updateUser(userId: number, userData: Partial<User>) {
    this.apiService.put<User>(`/users/${userId}`, userData)
      .subscribe({
        next: (response: ApiResponse<User>) => {
          if (ApiHelper.isSuccess(response)) {
            const updatedUser = ApiHelper.extractData(response);
            const index = this.users.findIndex(u => u.id === userId);
            if (index !== -1) {
              this.users[index] = updatedUser;
            }
          } else {
            this.error = ApiHelper.getErrorMessage(response);
          }
        },
        error: (error) => {
          this.error = ApiHelper.formatErrorMessage(error);
        }
      });
  }

  /**
   * Example 5: DELETE request
   */
  deleteUser(userId: number) {
    this.apiService.delete(`/users/${userId}`)
      .subscribe({
        next: (response: ApiResponse<any>) => {
          if (ApiHelper.isSuccess(response)) {
            this.users = this.users.filter(u => u.id !== userId);
          } else {
            this.error = ApiHelper.getErrorMessage(response);
          }
        },
        error: (error) => {
          this.error = ApiHelper.formatErrorMessage(error);
        }
      });
  }

  /**
   * Example 6: File upload
   */
  uploadAvatar(file: File, userId: number) {
    this.apiService.uploadFile<User>(`/users/${userId}/avatar`, file)
      .subscribe({
        next: (response: ApiResponse<User>) => {
          if (ApiHelper.isSuccess(response)) {
            const updatedUser = ApiHelper.extractData(response);
            const index = this.users.findIndex(u => u.id === userId);
            if (index !== -1) {
              this.users[index] = updatedUser;
            }
          } else {
            this.error = ApiHelper.getErrorMessage(response);
          }
        },
        error: (error) => {
          this.error = ApiHelper.formatErrorMessage(error);
        }
      });
  }

  /**
   * Example 7: File download
   */
  downloadFile(fileId: string, filename: string) {
    this.apiService.downloadFile(`/files/${fileId}`)
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          this.error = ApiHelper.formatErrorMessage(error);
        }
      });
  }

  /**
   * Example 8: Using query parameters
   */
  searchUsers(query: string) {
    const params = { search: query, limit: 20 };
    this.apiService.get<User[]>('/users', { params })
      .subscribe({
        next: (response: ApiResponse<User[]>) => {
          if (ApiHelper.isSuccess(response)) {
            this.users = ApiHelper.extractData(response);
          } else {
            this.error = ApiHelper.getErrorMessage(response);
          }
        },
        error: (error) => {
          this.error = ApiHelper.formatErrorMessage(error);
        }
      });
  }

  /**
   * Example 9: Using custom headers
   */
  getUsersWithAuth() {
    const headers = {
      'Authorization': 'Bearer your-token-here',
      'X-Custom-Header': 'custom-value'
    };

    this.apiService.get<User[]>('/users', { headers })
      .subscribe({
        next: (response: ApiResponse<User[]>) => {
          if (ApiHelper.isSuccess(response)) {
            this.users = ApiHelper.extractData(response);
          } else {
            this.error = ApiHelper.getErrorMessage(response);
          }
        },
        error: (error) => {
          this.error = ApiHelper.formatErrorMessage(error);
        }
      });
  }

  /**
   * Example 10: Error handling with specific error types
   */
  handleApiError(error: any) {
    if (ApiHelper.isNetworkError(error)) {
      this.error = 'Network error. Please check your connection.';
    } else if (ApiHelper.isAuthError(error)) {
      this.error = 'Please login again.';
      // Redirect to login page
    } else if (ApiHelper.isValidationError(error)) {
      this.error = 'Please check your input.';
    } else if (ApiHelper.isNotFoundError(error)) {
      this.error = 'Resource not found.';
    } else {
      this.error = ApiHelper.formatErrorMessage(error);
    }
  }

  /**
   * Example 11: Using loading state
   */
  loadDataWithLoading() {
    this.isLoading = true;
    this.error = null;

    this.apiService.get<User[]>('/users')
      .subscribe({
        next: (response: ApiResponse<User[]>) => {
          this.isLoading = false;
          if (ApiHelper.isSuccess(response)) {
            this.users = ApiHelper.extractData(response);
          } else {
            this.error = ApiHelper.getErrorMessage(response);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.error = ApiHelper.formatErrorMessage(error);
        }
      });
  }

  /**
   * Example 12: Using global loading state
   */
  loadDataWithGlobalLoading() {
    this.apiService.get<User[]>('/users')
      .subscribe({
        next: (response: ApiResponse<User[]>) => {
          if (ApiHelper.isSuccess(response)) {
            this.users = ApiHelper.extractData(response);
          } else {
            this.error = ApiHelper.getErrorMessage(response);
          }
        },
        error: (error) => {
          this.error = ApiHelper.formatErrorMessage(error);
        }
      });

    // Check loading state
    this.apiService.loading$.subscribe(loading => {
      this.isLoading = loading;
    });
  }
}
