import { forwardRef, useState } from 'react';
import type { FocusEvent, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import cx from 'clsx';

import styles from './Input.module.scss';

export type InputVariant = 'default' | 'inline';
export type InputSize = 'sm' | 'md';

type CommonProps = {
  variant?: InputVariant;
  size?: InputSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  error?: boolean;
  containerClassName?: string;
};

type SingleLineProps = CommonProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
    as?: 'input';
  };

type MultiLineProps = CommonProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> & {
    as: 'textarea';
  };

export type InputProps = SingleLineProps | MultiLineProps;

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  function Input(props, ref) {
    const {
      variant = 'default',
      size = 'md',
      leftIcon,
      rightIcon,
      error = false,
      containerClassName,
      className,
      disabled,
      onFocus,
      onBlur,
      ...rest
    } = props;

    const [focused, setFocused] = useState(false);
    const multiline = props.as === 'textarea';

    const handleFocus = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFocused(true);
      // Cast is safe — caller's onFocus matches whichever element they chose.
      (onFocus as ((event: typeof e) => void) | undefined)?.(e);
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFocused(false);
      (onBlur as ((event: typeof e) => void) | undefined)?.(e);
    };

    const shellClass = cx(
      styles.field,
      styles[`variant-${variant}`],
      styles[`size-${size}`],
      focused && styles.focused,
      error && styles.error,
      disabled && styles.disabled,
      multiline && styles.multiline,
      containerClassName,
    );

    return (
      <div className={shellClass}>
        {leftIcon ? (
          <span className={cx(styles.adornment, styles['adornment-left'])}>{leftIcon}</span>
        ) : null}
        {multiline ? (
          <textarea
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            disabled={disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cx(styles.control, className)}
            aria-invalid={error || undefined}
          />
        ) : (
          <input
            {...(rest as InputHTMLAttributes<HTMLInputElement>)}
            ref={ref as React.Ref<HTMLInputElement>}
            disabled={disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cx(styles.control, className)}
            aria-invalid={error || undefined}
          />
        )}
        {rightIcon ? (
          <span className={cx(styles.adornment, styles['adornment-right'])}>{rightIcon}</span>
        ) : null}
      </div>
    );
  },
);
