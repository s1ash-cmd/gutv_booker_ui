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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { userApi } from "@/lib/userApi";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 2011 + 1 },
    (_, i) => currentYear - i,
  );

  const validateForm = (formData: FormData): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const login = formData.get("login") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const year = formData.get("year") as string;

    if (!firstName || firstName.trim() === "") {
      newErrors.firstName = "Имя не может быть пустым";
    } else if (firstName.includes(" ")) {
      newErrors.firstName = "Имя не должно содержать пробелы";
    }

    if (!lastName || lastName.trim() === "") {
      newErrors.lastName = "Фамилия не может быть пустой";
    } else if (lastName.includes(" ")) {
      newErrors.lastName = "Фамилия не должна содержать пробелы";
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

    if (!confirmPassword || confirmPassword.trim() === "") {
      newErrors.confirmPassword = "Подтвердите пароль";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Пароли не совпадают";
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
      const firstName = formData.get("firstName") as string;
      const lastName = formData.get("lastName") as string;
      const name = `${firstName.trim()} ${lastName.trim()}`;
      const login = formData.get("login") as string;
      const password = formData.get("password") as string;
      const joinYear = parseInt(formData.get("year") as string, 10);

      await userApi.create_user({
        login,
        password,
        name,
        joinYear,
      });

      router.push("/login");
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : "Ошибка при регистрации",
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
      <Card className="w-[350px] md:w-[500px] lg:w-[750px]">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="md:text-lg lg:text-lg">
                  Имя <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Иван"
                  onChange={() => clearError("firstName")}
                  className={`${errors.firstName ? "border-destructive" : ""} text-base lg:text-lg`}
                  disabled={isLoading}
                />
                {errors.firstName && (
                  <p className="text-sm md:text-base lg:text-base text-destructive">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="md:text-lg lg:text-lg">
                  Фамилия <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Иванов"
                  onChange={() => clearError("lastName")}
                  className={`${errors.lastName ? "border-destructive" : ""} text-base lg:text-lg`}
                  disabled={isLoading}
                />
                {errors.lastName && (
                  <p className="text-sm md:text-base lg:text-base text-destructive">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login" className="md:text-lg lg:text-lg">
                Логин <span className="text-destructive">*</span>
              </Label>
              <Input
                id="login"
                name="login"
                type="text"
                placeholder="Ваш логин"
                onChange={() => clearError("login")}
                className={`${errors.login ? "border-destructive" : ""} text-base lg:text-lg`}
                disabled={isLoading}
              />
              {errors.login && (
                <p className="text-sm md:text-base lg:text-base text-destructive">
                  {errors.login}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="md:text-lg lg:text-lg">
                Пароль <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Не менее 8 символов"
                  onChange={() => clearError("password")}
                  className={`pr-10 ${errors.password ? "border-destructive" : ""} text-base lg:text-lg`}
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
                <p className="text-sm md:text-base lg:text-base text-destructive">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="md:text-lg lg:text-lg"
              >
                Повторите пароль <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Введите пароль ещё раз"
                  onChange={() => clearError("confirmPassword")}
                  className={`pr-10 ${errors.confirmPassword ? "border-destructive" : ""} text-base lg:text-lg`}
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
              {errors.confirmPassword && (
                <p className="text-sm md:text-base lg:text-base text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="w-full">
              <div className="flex items-center">
                <Label htmlFor="year" className="md:text-lg lg:text-lg">
                  Год вступления в студию
                  <span className="text-destructive">*</span>
                </Label>

                <Select
                  name="year"
                  onValueChange={() => clearError("year")}
                  disabled={isLoading}
                >
                  <SelectTrigger
                    className={`w-[100px] ml-auto lg:w-[100px] ${errors.year ? "border-destructive" : ""}`}
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
                <p className="text-sm md:text-base lg:text-lg text-destructive mt-1 text-right">
                  {errors.year}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full text-base lg:text-lg"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Регистрация..." : "Зарегистрироваться"}
            </Button>
          </form>

          <div className="text-center mt-6 text-sm md:text-base lg:text-lg">
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
