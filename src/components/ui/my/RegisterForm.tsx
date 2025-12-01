"use client";

import LogoDark from "@/assets/favicon-dark.svg";
import LogoLight from "@/assets/favicon-light.svg";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { userApi } from "@/lib/userApi";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 2011 + 1 },
    (_, i) => currentYear - i
  );

  const validateForm = (formData: FormData): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    const name = formData.get("name") as string;
    const login = formData.get("login") as string;
    const password = formData.get("password") as string;
    const year = formData.get("year") as string;

    if (!name || name.trim() === "") {
      newErrors.name = "Имя не может быть пустым";
    } else if (name.includes(" ")) {
      newErrors.name = "Имя не должно содержать пробелы";
    }

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

    if (!year) {
      newErrors.year = "Выберите год вступления";
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
      const name = formData.get("name") as string;
      const login = formData.get("login") as string;
      const password = formData.get("password") as string;
      const joinYear = parseInt(formData.get("year") as string);
      const ronin = formData.get("ronin") === "on";

      await userApi.create_user({
        login,
        password,
        name,
        joinYear,
        ronin
      });

      router.push('/login');
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'Ошибка при регистрации'
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-[350px] md:w-[400px] lg:w-[600px]">
        <CardContent className="pt-6">
          <div className="flex justify-center mb-6">
            <Image
              src={LogoDark}
              alt="Logo"
              width={180}
              height={180}
              className="dark:hidden"
            />
            <Image
              src={LogoLight}
              alt="Logo"
              width={180}
              height={180}
              className="hidden dark:block"
            />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {errors.form && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                {errors.form}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                Имя <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Ваше имя"
                onChange={() => clearError("name")}
                className={errors.name ? "border-destructive" : ""}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login">
                Логин <span className="text-destructive">*</span>
              </Label>
              <Input
                id="login"
                name="login"
                type="text"
                placeholder="Ваш логин"
                onChange={() => clearError("login")}
                className={errors.login ? "border-destructive" : ""}
                disabled={isLoading}
              />
              {errors.login && (
                <p className="text-sm text-destructive">{errors.login}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Пароль <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Не менее 8 символов"
                  onChange={() => clearError("password")}
                  className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-14">
              <div className="flex items-center space-x-2 h-10">
                <Label
                  htmlFor="ronin"
                  className="text-sm font-medium leading-none cursor-pointer whitespace-nowrap pr-2"
                >
                  Есть разрешение на Ronin
                </Label>
                <Checkbox id="ronin" name="ronin" disabled={isLoading} />
              </div>

              <div className="w-full lg:flex-1">
                <div className="flex items-center gap-2 justify-between lg:justify-start">
                  <Label htmlFor="year" className="whitespace-nowrap">
                    Год вступления в студию<span className="text-destructive">*</span>
                  </Label>

                  <Select name="year" onValueChange={() => clearError("year")} disabled={isLoading}>
                    <SelectTrigger
                      className={`w-[100px] lg:w-full ${errors.year ? "border-destructive" : ""}`}
                    >
                      <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errors.year && (
                  <p className="text-sm text-destructive mt-1 text-right">
                    {errors.year}
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Регистрация..." : "Зарегистрироваться"}
            </Button>
          </form>

          <div className="text-center mt-6 text-sm">
            <span className="text-muted-foreground">Уже есть аккаунт? </span>
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Войти
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
