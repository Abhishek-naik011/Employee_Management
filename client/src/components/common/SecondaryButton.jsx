/**
 * SecondaryButton — reusable ghost / outlined cancel-style button.
 *
 * Props:
 *  - children   : button label / content (required)
 *  - onClick    : click handler
 *  - type       : "button" | "submit" | "reset"  (default "button")
 *  - disabled   : boolean
 *  - className  : extra Tailwind classes appended to the base (for one-off tweaks)
 *  - form       : HTML form id the button belongs to
 *  - ...rest    : any other native button attributes
 *
 * Base styles (preserved from existing pages):
 *   px-5 py-2.5 text-gray-700 font-medium
 *   hover:bg-gray-100 rounded-xl transition-colors
 *   disabled:opacity-50 disabled:cursor-not-allowed
 */
const SecondaryButton = ({
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  form,
  ...rest
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    form={form}
    className={[
      'px-5 py-2.5',
      'text-gray-700 font-medium',
      'hover:bg-gray-100 rounded-xl transition-colors',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...rest}
  >
    {children}
  </button>
);

export default SecondaryButton;
