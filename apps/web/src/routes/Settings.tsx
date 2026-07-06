import { useCallback, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import cx from 'clsx';

import { ArrowLeft, Check, Monitor, Moon, Sun } from 'natural/icons';
import { Button, Icon, Input } from 'natural';
import { ConfirmModal } from '@/components/notes/ConfirmModal';

import { useCurrentUser } from '@/hooks/data/useCurrentUser';
import { useConfirmEmailChange } from '@/hooks/services/useConfirmEmailChange';
import { useDeleteAccount } from '@/hooks/services/useDeleteAccount';
import { useRequestEmailChange } from '@/hooks/services/useRequestEmailChange';
import { useTheme, type Theme } from '@/hooks/useTheme';

import styles from './Settings.module.scss';

const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

type EmailStep = 'idle' | 'verify' | 'done';

export function Settings() {
  const user = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const requestEmailChange = useRequestEmailChange();
  const confirmEmailChange = useConfirmEmailChange();
  const deleteAccount = useDeleteAccount();

  const [step, setStep] = useState<EmailStep>('idle');
  const [pendingEmail, setPendingEmail] = useState('');
  const [emailInput, setEmailInput] = useState(user.email);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const dirty = emailInput.trim().toLowerCase() !== user.email.toLowerCase();

  const handleRequest = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setEmailError(null);
      setBusy(true);
      try {
        const target = emailInput.trim();
        await requestEmailChange(target);
        setPendingEmail(target);
        setCode('');
        setStep('verify');
      } catch (err) {
        setEmailError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [emailInput, requestEmailChange],
  );

  const handleConfirm = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setEmailError(null);
      setBusy(true);
      try {
        await confirmEmailChange(pendingEmail, code);
        setStep('done');
        setEmailInput(pendingEmail);
        setPendingEmail('');
        setCode('');
      } catch (err) {
        setEmailError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [confirmEmailChange, pendingEmail, code],
  );

  const cancelVerify = useCallback(() => {
    setStep('idle');
    setCode('');
    setEmailError(null);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Button variant="ghost" leftIcon={<ArrowLeft size={16} />} asChild>
            <Link href="/">Back</Link>
          </Button>
          <h1 className={styles.title}>Settings</h1>
        </header>

        <section className={styles.section} aria-labelledby="settings-appearance">
          <div className={styles.sectionHead}>
            <h2 id="settings-appearance" className={styles.sectionTitle}>
              Appearance
            </h2>
            <p className={styles.sectionLede}>Choose how Notable looks on this device.</p>
          </div>
          <div className={styles.themeGroup} role="radiogroup" aria-label="Theme">
            {THEME_OPTIONS.map((opt) => {
              const selected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cx(styles.themeOption, selected && styles.themeOptionSelected)}
                  onClick={() => setTheme(opt.value)}
                >
                  <Icon icon={opt.icon} />
                  <span>{opt.label}</span>
                  {selected ? <Icon icon={Check} className={styles.themeCheck} /> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="settings-account">
          <div className={styles.sectionHead}>
            <h2 id="settings-account" className={styles.sectionTitle}>
              Account
            </h2>
            <p className={styles.sectionLede}>
              We&apos;ll send a 6-digit code to your new address to confirm the change.
            </p>
          </div>

          {step === 'verify' ? (
            <form className={styles.form} onSubmit={handleConfirm} noValidate>
              <p className={styles.sectionLede}>
                Enter the code we sent to <strong>{pendingEmail}</strong>. It expires in 10 minutes.
              </p>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="settings-code">
                  Verification code
                </label>
                <Input
                  id="settings-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.currentTarget.value.replace(/\D/g, ''))}
                  disabled={busy}
                  error={Boolean(emailError)}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? 'settings-email-error' : undefined}
                />
                {emailError ? (
                  <p id="settings-email-error" role="alert" className={styles.error}>
                    {emailError}
                  </p>
                ) : null}
              </div>
              <div className={styles.formActions}>
                <Button type="button" variant="ghost" onClick={cancelVerify} disabled={busy}>
                  Cancel
                </Button>
                <Button type="submit" loading={busy} disabled={code.length !== 6}>
                  Confirm change
                </Button>
              </div>
            </form>
          ) : (
            <form className={styles.form} onSubmit={handleRequest} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="settings-email">
                  Email
                </label>
                <Input
                  id="settings-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.currentTarget.value);
                    setEmailError(null);
                    if (step === 'done') setStep('idle');
                  }}
                  disabled={busy}
                  error={Boolean(emailError)}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? 'settings-email-error' : undefined}
                />
                {emailError ? (
                  <p id="settings-email-error" role="alert" className={styles.error}>
                    {emailError}
                  </p>
                ) : null}
                {step === 'done' ? <p className={styles.saved}>Email updated.</p> : null}
              </div>
              <div className={styles.formActions}>
                <Button type="submit" loading={busy} disabled={!dirty || !emailInput.trim()}>
                  Send code
                </Button>
              </div>
            </form>
          )}
        </section>

        <section className={cx(styles.section, styles.danger)} aria-labelledby="settings-danger">
          <div className={styles.sectionHead}>
            <h2 id="settings-danger" className={styles.sectionTitle}>
              Danger zone
            </h2>
            <p className={styles.sectionLede}>
              Permanently delete your account and all of your notes. This cannot be undone.
            </p>
          </div>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
        </section>
      </div>

      <ConfirmModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete your account?"
        description="This permanently removes your account, all notes, and tags. This cannot be undone."
        confirmButton="Delete account"
        onConfirm={deleteAccount}
      />
    </div>
  );
}
