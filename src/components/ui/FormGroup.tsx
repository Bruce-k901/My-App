import React from "react";

type FormGroupProps = {
  children: React.ReactNode;
};

export default function FormGroup({ children }: FormGroupProps) {
  return <div className="mb-4">{children}</div>;
}
