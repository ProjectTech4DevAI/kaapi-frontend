import { APIKey } from "./credentials";

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface GoogleProfile {
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
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
  loginWithGoogle: (
    accessToken: string,
    user?: User,
    googleProfile?: GoogleProfile,
  ) => void;
  logout: () => Promise<void>;
}
