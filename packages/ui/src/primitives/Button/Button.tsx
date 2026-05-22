import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { Spinner } from '../../blocks/Spinner';
import styles from './Button.module.scss';

export type ButtonVariant = 'solid' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  asChild?: boolean;
};

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'solid',
    size = 'md',
    iconOnly = false,
    leftIcon,
    rightIcon,
    loading = false,
    asChild = false,
    disabled,
    className,
    children,
    type,
    ...rest
  },
  ref,
) {
  const Component = asChild ? Slot : 'button';
  const spinnerSize = size === 'sm' ? 12 : 16;
  const showLeft = loading ? <Spinner size={spinnerSize} /> : leftIcon;

  return (
    <Component
      ref={ref}
      type={asChild ? undefined : (type ?? 'button')}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cx(
        styles.button,
        styles[`variant-${variant}`],
        styles[`size-${size}`],
        iconOnly && styles.iconOnly,
        className,
      )}
      {...rest}
    >
      {showLeft ? <span className={styles.icon}>{showLeft}</span> : null}
      <Slottable>{children}</Slottable>
      {rightIcon ? <span className={styles.icon}>{rightIcon}</span> : null}
    </Component>
  );
});
