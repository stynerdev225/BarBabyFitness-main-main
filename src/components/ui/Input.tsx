// src/components/ui/Input.tsx
import React from "react";

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (
  props,
) => {
  return <input {...props} className={`input ${props.className}`} />;
};
