import * as React from "react";

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7b6a5f]"
      {...props}
    />
  );
}
