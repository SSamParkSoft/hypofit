import type {
  AriaAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cloneElement, isValidElement, useId } from "react";

import { cn } from "./cn";

const fieldControlClassName =
  "w-full rounded-hypo-lg border border-hypo-border bg-hypo-surface text-base text-hypo-text outline-none transition-[background-color,border-color,box-shadow,color] placeholder:text-hypo-icon-muted focus:border-hypo-brand focus:ring-[3px] focus:ring-hypo-brand/15 disabled:cursor-not-allowed disabled:border-hypo-border disabled:bg-hypo-surface-muted disabled:text-hypo-text-soft disabled:opacity-100 aria-[invalid=true]:border-hypo-danger/40 aria-[invalid=true]:focus:border-hypo-danger aria-[invalid=true]:focus:ring-hypo-danger/12";

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
        fieldControlClassName,
        "h-11 px-3.5 leading-5 md:h-10",
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
        fieldControlClassName,
        "h-11 px-3.5 leading-5 md:h-10",
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
        fieldControlClassName,
        "min-h-28 px-3.5 py-3 leading-6",
        className,
      )}
      {...props}
    />
  );
}
