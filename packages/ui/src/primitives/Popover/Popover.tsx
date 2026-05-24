import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';
import * as RadixPopover from '@radix-ui/react-popover';
import cx from 'clsx';

import styles from './Popover.module.scss';

const Root = RadixPopover.Root;
const Trigger = RadixPopover.Trigger;
const Anchor = RadixPopover.Anchor;
const Close = RadixPopover.Close;

type ContentProps = ComponentPropsWithoutRef<typeof RadixPopover.Content> & {
  withArrow?: boolean;
};

const Content = forwardRef<ElementRef<typeof RadixPopover.Content>, ContentProps>(
  function PopoverContent(
    { className, sideOffset = 6, withArrow = false, children, ...rest },
    ref,
  ) {
    return (
      <RadixPopover.Portal>
        <RadixPopover.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cx(styles.content, className)}
          {...rest}
        >
          {children}
          {withArrow ? <RadixPopover.Arrow className={styles.arrow} /> : null}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    );
  },
);

export const Popover = {
  Root,
  Trigger,
  Anchor,
  Content,
  Close,
};
