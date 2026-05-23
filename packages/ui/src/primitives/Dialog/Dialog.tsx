import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef, ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import styles from './Dialog.module.scss';

export type DialogSize = 'sm' | 'md' | 'lg' | 'full';

const Root = RadixDialog.Root;
const Trigger = RadixDialog.Trigger;
const Close = RadixDialog.Close;
const Portal = RadixDialog.Portal;

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type ContentProps = ComponentPropsWithoutRef<typeof RadixDialog.Content> & {
  size?: DialogSize;
  overlayClassName?: string;
  children?: ReactNode;
};

const Content = forwardRef<ElementRef<typeof RadixDialog.Content>, ContentProps>(
  function DialogContent({ size = 'md', className, overlayClassName, children, ...rest }, ref) {
    return (
      <Portal>
        <RadixDialog.Overlay className={cx(styles.overlay, overlayClassName)} />
        <RadixDialog.Content
          ref={ref}
          className={cx(styles.content, styles[`size-${size}`], className)}
          {...rest}
        >
          {children}
        </RadixDialog.Content>
      </Portal>
    );
  },
);

const Title = forwardRef<
  ElementRef<typeof RadixDialog.Title>,
  ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(function DialogTitle({ className, ...rest }, ref) {
  return <RadixDialog.Title ref={ref} className={cx(styles.title, className)} {...rest} />;
});

const Description = forwardRef<
  ElementRef<typeof RadixDialog.Description>,
  ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(function DialogDescription({ className, ...rest }, ref) {
  return (
    <RadixDialog.Description ref={ref} className={cx(styles.description, className)} {...rest} />
  );
});

export const Dialog = {
  Root,
  Trigger,
  Content,
  Title,
  Description,
  Close,
};
