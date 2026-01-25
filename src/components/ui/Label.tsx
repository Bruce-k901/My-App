import React from "react";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

function Label({ children, ...props }: LabelProps) {
  return (
    <label className="block text-sm font-medium text-gray-900 dark:text-gray-700" {...props}>
      {children}
    </label>
  );
}

export { Label };
export default Label;
