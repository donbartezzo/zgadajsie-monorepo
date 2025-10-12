// User model
export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string; // ISO date
}

// Auth DTO
export interface AuthDto {
  email: string;
  password: string;
}
