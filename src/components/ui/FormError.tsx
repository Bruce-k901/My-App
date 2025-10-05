import React from "react";

type FormErrorProps = {
  message?: string;
};

export default function FormError({ message }: FormErrorProps) {
  if (!message) return null;
  return <p className="text-sm text-red-600">{message}</p>;
}
