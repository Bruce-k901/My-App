"use client";
import Image from "next/image";
import { useState } from "react";

type CheckboxCustomProps = {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: number;
};

export default function CheckboxCustom({
  checked = false,
  onChange,
  size = 20,
}: CheckboxCustomProps) {
  const [isChecked, setIsChecked] = useState(checked);

  const toggle = () => {
    const newVal = !isChecked;
    setIsChecked(newVal);
    if (onChange) onChange(newVal);
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center justify-center rounded-sm border-2 transition-all duration-200 
        ${isChecked ? "border-green-500 bg-green-900/10" : "border-neutral-400 hover:border-green-500"}`}
      style={{ width: size, height: size }}
    >
      {isChecked && (
        <Image
          src="/assets/tick_icon.png"
          alt="checked"
          width={size - 4}
          height={size - 4}
          unoptimized
        />
      )}
    </button>
  );
}