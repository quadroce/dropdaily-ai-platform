import type { User } from "@shared/schema";

export async function loginUser(email: string, password: string): Promise<User> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Login failed");
  }

  return response.json();
}

export async function registerUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<User> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Registration failed");
  }

  return response.json();
}

export function getCurrentUser(): User | null {
  const storedUser = localStorage.getItem("dropdaily_user");
  if (storedUser) {
    try {
      return JSON.parse(storedUser);
    } catch (error) {
      console.error("Failed to parse stored user:", error);
      localStorage.removeItem("dropdaily_user");
    }
  }
  return null;
}

export function clearAuthData(): void {
  localStorage.removeItem("dropdaily_user");
}
