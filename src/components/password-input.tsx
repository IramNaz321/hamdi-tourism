"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function PasswordInput({
  name,
  autoComplete,
  minLength,
}: {
  name: string;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative">
      <Input
        name={name}
        type={visible ? "text" : "password"}
        required
        minLength={minLength}
        maxLength={128}
        autoComplete={autoComplete}
        className="pr-12"
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-1 top-0.5"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </span>
  );
}
