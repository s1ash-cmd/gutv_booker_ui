"use client";

import { useState } from "react";
import LogoDark from "@/assets/favicon-dark.svg";
import LogoLight from "@/assets/favicon-light.svg";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

import {
  Button,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  Surface,
  TextField,
  Checkbox,
} from "@heroui/react";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};

    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    alert("Form data as JSON:\n" + JSON.stringify(data, null, 2));
  };

  const validateName = (value: string) => {
    if (!value || value.trim() === "") {
      return "Имя не может быть пустым";
    }
    if (value.includes(" ")) {
      return "Имя не должно содержать пробелы";
    }
    return null;
  };

  const validateLogin = (value: string) => {
    if (!value || value.trim() === "") {
      return "Логин не может быть пустым";
    }
    if (value.includes(" ")) {
      return "Логин не должен содержать пробелы";
    }
    if (value.length < 4) {
      return "Логин должен содержать не менее 4 символов";
    }
    return null;
  };

  const validatePassword = (value: string) => {
    if (!value || value.trim() === "") {
      return "Пароль не может быть пустым";
    }
    if (value.includes(" ")) {
      return "Пароль не должен содержать пробелы";
    }
    if (value.length < 8) {
      return "Пароль должен содержать не менее 8 символов";
    }
    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-background-100 rounded-2xl p-6">
        <div className="flex justify-center">
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
        <Surface className="bg-background-100 w-full min-w-[280px] md:min-w-[400px] lg:min-w-[600px] max-w-md mx-auto">
          <Form onSubmit={onSubmit}>
            <Fieldset className="w-full">
              <Fieldset.Group>
                <TextField
                  isRequired
                  name="name"
                  type="text"
                  validate={validateName}
                >
                  <Label className="text-base">Имя</Label>
                  <Input className="text-base" placeholder="Ваше имя" />
                  <FieldError />
                </TextField>

                <TextField
                  isRequired
                  name="login"
                  type="text"
                  validate={validateLogin}
                >
                  <Label className="text-base">Логин</Label>
                  <Input className="text-base" placeholder="Ваш логин" />
                  <FieldError />
                </TextField>

                <TextField
                  isRequired
                  name="password"
                  type={showPassword ? "text" : "password"}
                  validate={validatePassword}
                >
                  <Label className="text-base">Пароль</Label>
                  <div className="relative w-full">
                    <Input
                      placeholder="Не менее 8 символов"
                      className="pr-12 w-full text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-foreground-500 hover:text-foreground-700 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                  <FieldError />
                </TextField>

                <Checkbox id="ronin">
                  <Checkbox.Control className="border border-outlinecolor">
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <Label htmlFor="ronin">Есть разрешение на Ronin</Label>
                  </Checkbox.Content>
                </Checkbox>

              </Fieldset.Group>

              <div className="flex justify-center mt-4 pb-6">
                <Button type="submit" className="w-full text-lg" size="lg">
                  Зарегистрироваться
                </Button>
              </div>
            </Fieldset>
          </Form>
        </Surface>
      </div>
    </div>
  );
}
