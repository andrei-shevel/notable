import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';
import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import styles from './Menu.module.scss';

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

const Root = RadixMenu.Root;
const Trigger = RadixMenu.Trigger;
const Sub = RadixMenu.Sub;
const RadioGroup = RadixMenu.RadioGroup;

const Content = forwardRef<
  ElementRef<typeof RadixMenu.Content>,
  ComponentPropsWithoutRef<typeof RadixMenu.Content>
>(function MenuContent({ className, sideOffset = 6, ...rest }, ref) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cx(styles.content, className)}
        {...rest}
      />
    </RadixMenu.Portal>
  );
});

const SubContent = forwardRef<
  ElementRef<typeof RadixMenu.SubContent>,
  ComponentPropsWithoutRef<typeof RadixMenu.SubContent>
>(function MenuSubContent({ className, ...rest }, ref) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.SubContent ref={ref} className={cx(styles.content, className)} {...rest} />
    </RadixMenu.Portal>
  );
});

type ItemProps = ComponentPropsWithoutRef<typeof RadixMenu.Item> & {
  danger?: boolean;
};

const Item = forwardRef<ElementRef<typeof RadixMenu.Item>, ItemProps>(function MenuItem(
  { className, danger, ...rest },
  ref,
) {
  return (
    <RadixMenu.Item
      ref={ref}
      className={cx(styles.item, danger && styles['item-danger'], className)}
      {...rest}
    />
  );
});

const CheckboxItem = forwardRef<
  ElementRef<typeof RadixMenu.CheckboxItem>,
  ComponentPropsWithoutRef<typeof RadixMenu.CheckboxItem>
>(function MenuCheckboxItem({ className, ...rest }, ref) {
  return <RadixMenu.CheckboxItem ref={ref} className={cx(styles.item, className)} {...rest} />;
});

const RadioItem = forwardRef<
  ElementRef<typeof RadixMenu.RadioItem>,
  ComponentPropsWithoutRef<typeof RadixMenu.RadioItem>
>(function MenuRadioItem({ className, ...rest }, ref) {
  return <RadixMenu.RadioItem ref={ref} className={cx(styles.item, className)} {...rest} />;
});

const SubTrigger = forwardRef<
  ElementRef<typeof RadixMenu.SubTrigger>,
  ComponentPropsWithoutRef<typeof RadixMenu.SubTrigger>
>(function MenuSubTrigger({ className, ...rest }, ref) {
  return <RadixMenu.SubTrigger ref={ref} className={cx(styles.item, className)} {...rest} />;
});

const Label = forwardRef<
  ElementRef<typeof RadixMenu.Label>,
  ComponentPropsWithoutRef<typeof RadixMenu.Label>
>(function MenuLabel({ className, ...rest }, ref) {
  return <RadixMenu.Label ref={ref} className={cx(styles.label, className)} {...rest} />;
});

const Separator = forwardRef<
  ElementRef<typeof RadixMenu.Separator>,
  ComponentPropsWithoutRef<typeof RadixMenu.Separator>
>(function MenuSeparator({ className, ...rest }, ref) {
  return <RadixMenu.Separator ref={ref} className={cx(styles.separator, className)} {...rest} />;
});

export const Menu = {
  Root,
  Trigger,
  Content,
  Item,
  CheckboxItem,
  RadioItem,
  RadioGroup,
  Label,
  Separator,
  Sub,
  SubTrigger,
  SubContent,
};
