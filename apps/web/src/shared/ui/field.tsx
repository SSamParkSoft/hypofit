import type {
  AriaAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cloneElement, isValidElement, useId } from "react";

import { cn } from "./cn";

interface FieldProps {
  children: ReactNode;
  className?: string;
  error?: string | null;
  hint?: string;
  label: string;
}

export function Field({ children, className, error, hint, label }: FieldProps) {
  const generatedId = useId();
  const existingControlId = isValidElement<FieldControlProps>(children) ? children.props.id : undefined;
  const controlId = existingControlId ?? `field-${generatedId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement<FieldControlProps>(children)
    ? cloneElement(children, {
        "aria-describedby": [children.props["aria-describedby"], describedBy]
          .filter(Boolean)
          .join(" ") || undefined,
        "aria-invalid": error ? true : children.props["aria-invalid"],
        id: children.props.id ?? controlId,
      })
    : children;

  return (
    <div className={cn("grid gap-2", className)}>
      <label className="ui-label text-hypo-text" htmlFor={controlId}>
        {label}
      </label>
      {control}
      {hint ? (
        <span id={hintId} className="ui-metadata text-hypo-text-soft">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="ui-metadata text-hypo-danger" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: AriaAttributes["aria-describedby"];
  "aria-invalid"?: AriaAttributes["aria-invalid"];
} & Record<string, unknown>;

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-hypo-md border border-hypo-border bg-hypo-surface px-3 text-base leading-5 text-hypo-text outline-none transition-[border-color,box-shadow,background-color] placeholder:text-hypo-text-soft focus:border-hypo-brand focus:ring-[3px] focus:ring-hypo-brand/15 disabled:cursor-not-allowed disabled:bg-hypo-bg disabled:text-hypo-text-muted disabled:opacity-100 md:h-10",
        className,
      )}
      {...props}
    />
  );
}

export function SelectInput({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-hypo-md border border-hypo-border bg-hypo-surface px-3 text-base leading-5 text-hypo-text outline-none transition-[border-color,box-shadow,background-color] focus:border-hypo-brand focus:ring-[3px] focus:ring-hypo-brand/15 disabled:cursor-not-allowed disabled:bg-hypo-bg disabled:text-hypo-text-muted disabled:opacity-100 md:h-10",
        className,
      )}
      {...props}
    />
  );
}

export function TextareaInput({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-hypo-md border border-hypo-border bg-hypo-surface px-3 py-2.5 text-base leading-6 text-hypo-text outline-none transition-[border-color,box-shadow,background-color] placeholder:text-hypo-text-soft focus:border-hypo-brand focus:ring-[3px] focus:ring-hypo-brand/15 disabled:cursor-not-allowed disabled:bg-hypo-bg disabled:text-hypo-text-muted disabled:opacity-100",
        className,
      )}
      {...props}
    />
  );
}
