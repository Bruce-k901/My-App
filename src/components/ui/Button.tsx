import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({ children, ...props }: ButtonProps) {
  return (
    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" {...props}>
      {children}
    </button>
  );
}
