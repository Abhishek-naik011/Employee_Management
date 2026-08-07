/**
 * PrimaryButton — reusable solid blue action button.
 *
 * Props:
 *  - children       : button label / content (required)
 *  - onClick        : click handler
 *  - type           : "button" | "submit" | "reset"  (default "button")
 *  - disabled       : boolean
 *  - isLoading      : boolean — shows spinner and disables click
 *  - icon           : optional Lucide icon element rendered before the label
 *  - className      : extra Tailwind classes appended to the base (for one-off tweaks)
 *  - form           : HTML form id the button belongs to (for external submit buttons)
 *  - ...rest        : any other native button attributes (e.g. title, aria-*)
 *
 * Base styles (preserved from existing pages):
 *   bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-xl
 *   shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed
 *   flex items-center gap-2 px-5 py-2.5
 */
const PrimaryButton = ({
  children,
  onClick,
  type = 'button',
  disabled = false,
  isLoading = false,
  icon = null,
  className = '',
  form,
  ...rest
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      form={form}
      className={[
        'flex items-center gap-2 px-5 py-2.5',
        'bg-blue-600 text-white font-medium',
        'hover:bg-blue-700 rounded-xl shadow-sm transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {isLoading ? (
        <svg
          className="animate-spin w-4 h-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
};

export default PrimaryButton;
