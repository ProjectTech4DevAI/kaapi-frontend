import { APIKey } from "./credentials";

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface GoogleProfile {
  email?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: unknown;
}

export interface Project {
  id: number;
  name: string;
}

export interface GoogleAuthResponse {
  success: boolean;
  data: {
    access_token: string;
    token_type: string;
    user: User;
    google_profile: GoogleProfile;
    requires_project_selection: boolean;
    available_projects: Project[];
  };
  error?: string;
}

export interface AuthTokenResponse {
  success: boolean;
  data: {
    access_token: string;
    token_type: string;
  };
  error?: string;
}

export interface InviteVerifyResponse {
  success: boolean;
  data?: {
    access_token: string;
    token_type: string;
    user: User;
  };
  error?: string;
}

export interface Session {
  accessToken: string;
  user: User | null;
  googleProfile: GoogleProfile | null;
}

export interface AuthContextValue {
  apiKeys: APIKey[];
  activeKey: APIKey | null;
  isHydrated: boolean;
  currentUser: User | null;
  googleProfile: GoogleProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  addKey: (key: APIKey) => void;
  removeKey: (id: string) => void;
  setKeys: (keys: APIKey[]) => void;
  loginWithToken: (
    accessToken: string,
    user?: User,
    googleProfile?: GoogleProfile,
  ) => void;
  logout: () => Promise<void>;
}
