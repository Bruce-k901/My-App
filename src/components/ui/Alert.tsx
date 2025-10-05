import React from "react";

type AlertProps = {
  children: React.ReactNode;
  type?: "info" | "success" | "warning" | "error";
};

export default function Alert({ children, type = "info" }: AlertProps) {
  const base = "p-3 rounded text-sm font-medium";
  const styles = {
    info: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
  };

  return <div className={`${base} ${styles[type]}`}>{children}</div>;
}
