export interface User {
  _id?: string;
  email: string;
  name?: string;
  passwordHash: string;
  provider: 'email' | 'google';
  subscription?: {
    active: boolean;
    type: 'monthly' | 'yearly' | null;
    startDate: string;
    endDate: string | null;
  };
  createdAt: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name?: string;
  provider: 'email' | 'google';
  subscription?: {
    active: boolean;
    type: 'monthly' | 'yearly' | null;
    startDate: string;
    endDate: string | null;
  };
  createdAt: string;
}

export function toUserResponse(user: any): UserResponse {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    provider: user.provider,
    subscription: user.subscription,
    createdAt: user.createdAt
  };
}

