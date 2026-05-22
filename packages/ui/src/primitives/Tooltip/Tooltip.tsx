import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef, ReactNode } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import styles from './Tooltip.module.scss';

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

const Provider = RadixTooltip.Provider;
const Root = RadixTooltip.Root;
const Trigger = RadixTooltip.Trigger;

type ContentProps = ComponentPropsWithoutRef<typeof RadixTooltip.Content> & {
  children?: ReactNode;
  withArrow?: boolean;
};

const Content = forwardRef<ElementRef<typeof RadixTooltip.Content>, ContentProps>(
  function TooltipContent(
    { className, sideOffset = 6, withArrow = true, children, ...rest },
    ref,
  ) {
    return (
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cx(styles.content, className)}
          {...rest}
        >
          {children}
          {withArrow ? <RadixTooltip.Arrow className={styles.arrow} /> : null}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    );
  },
);

export const Tooltip = {
  Provider,
  Root,
  Trigger,
  Content,
};
