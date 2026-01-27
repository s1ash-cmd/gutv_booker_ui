export interface LoginRequest {
  login: string
  password: string
}

export interface RefreshRequest {
  refreshToken: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
}

export interface AuthSettings {
  key: string
  issuer: string
  audience: string
  expireMinutes: number
}