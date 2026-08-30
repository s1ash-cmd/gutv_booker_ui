"use client";

import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LogoDark from "@/assets/favicon-dark.svg";
import LogoLight from "@/assets/favicon-light.svg";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/authApi";
import { userApi } from "@/lib/userApi";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  const validateForm = (formData: FormData): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    const login = formData.get("login") as string;
    const password = formData.get("password") as string;

    if (!login || login.trim() === "") {
      newErrors.login = "Логин не может быть пустым";
    } else if (login.includes(" ")) {
      newErrors.login = "Логин не должен содержать пробелы";
    } else if (login.length < 4) {
      newErrors.login = "Логин должен содержать не менее 4 символов";
    }

    if (!password || password.trim() === "") {
      newErrors.password = "Пароль не может быть пустым";
    } else if (password.includes(" ")) {
      newErrors.password = "Пароль не должен содержать пробелы";
    } else if (password.length < 8) {
      newErrors.password = "Пароль должен содержать не менее 8 символов";
    }

    return newErrors;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const login = formData.get("login") as string;
      const password = formData.get("password") as string;

      await authApi.login(login, password);
      const authenticatedUser = await userApi.get_me();
      setUser({
        id: String(authenticatedUser.id),
        login: authenticatedUser.login,
        name: authenticatedUser.name,
        role: authenticatedUser.role,
        isTelegramLinked: authenticatedUser.isTelegramLinked,
        avatarSeed: authenticatedUser.avatarSeed,
      });

      router.push("/");
    } catch (error) {
      authApi.logout();
      setErrors({
        form: error instanceof Error ? error.message : "Ошибка при входе",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center p-4">
      <Card className="w-full max-w-[600px] md:max-w-[400px] lg:max-w-[600px]">
        <CardContent className="pt-6">
          <div className="flex justify-center mb-6">
            <Image
              src={LogoDark}
              alt="Logo"
              width={200}
              height={200}
              className="dark:hidden"
            />
            <Image
              src={LogoLight}
              alt="Logo"
              width={200}
              height={200}
              className="hidden dark:block"
            />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {errors.form && (
              <div
                className="text-sm md:text-base lg:text-lg text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20"
                role="alert"
              >
                {errors.form}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="login" className="md:text-base lg:text-lg">
                Логин <span className="text-destructive">*</span>
              </Label>
              <Input
                id="login"
                name="login"
                type="text"
                placeholder="Ваш логин"
                autoComplete="username"
                onChange={() => clearError("login")}
                className={`md:text-base lg:text-lg ${errors.login ? "border-destructive" : ""}`}
                disabled={isLoading}
                aria-invalid={Boolean(errors.login)}
                aria-describedby={errors.login ? "login-error" : undefined}
              />
              {errors.login && (
                <p
                  id="login-error"
                  className="text-sm md:text-base lg:text-lg text-destructive"
                  role="alert"
                >
                  {errors.login}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="md:text-base lg:text-lg">
                Пароль <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Не менее 8 символов"
                  autoComplete="current-password"
                  onChange={() => clearError("password")}
                  className={`pr-10 md:text-base lg:text-lg ${errors.password ? "border-destructive" : ""}`}
                  disabled={isLoading}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                  aria-label={
                    showPassword ? "Скрыть пароль" : "Показать пароль"
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p
                  id="password-error"
                  className="text-sm md:text-base lg:text-lg text-destructive"
                  role="alert"
                >
                  {errors.password}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full md:text-base lg:text-lg"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Загрузка..." : "Войти"}
            </Button>
          </form>

          <div className="text-center mt-6 text-sm md:text-base lg:text-lg">
            <span className="text-muted-foreground">Нет аккаунта? </span>
            <Link
              href="/register"
              className="text-primary hover:underline font-medium"
            >
              Зарегистрироваться
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
