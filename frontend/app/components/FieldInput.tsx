import type { Field } from "@/lib/document";

const INPUT_TYPES: Partial<Record<Field["type"], string>> = {
  date: "date",
  integer: "number",
  number: "number",
};

function hint(field: Field): string | undefined {
  if (field.default !== undefined) return `Default: ${field.default}`;
  if (field.example !== undefined) return `e.g. ${field.example}`;
  return undefined;
}

export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `field-${field.name}`;
  const className =
    "mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none";
  const common = {
    id,
    name: field.name,
    value,
    required: field.required,
    placeholder: hint(field),
    className,
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {field.type === "text" ? (
        <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          {...common}
          type={INPUT_TYPES[field.type] ?? "text"}
          min={field.type === "integer" ? 0 : undefined}
          step={field.type === "integer" ? 1 : "any"}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
