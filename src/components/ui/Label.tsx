import React from "react";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export default function Label({ children, ...props }: LabelProps) {
  return (
    <label className="block text-sm font-medium text-gray-700" {...props}>
      {children}
    </label>
  );
}
