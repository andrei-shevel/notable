import { useCallback, useState, type SubmitEvent } from 'react';
import { Mail } from 'lucide-react';

import { Button, Input } from '@notable/ui';
import { AuthLayout } from '../components/AuthLayout';

import { useSignIn } from '../hooks/services/useSignIn';
import { useVerifyCode } from '../hooks/services/useVerifyCode';

import styles from './Login.module.scss';

type Step = 'email' | 'code';

export function Login() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useSignIn();
  const verifyCode = useVerifyCode();

  const handleSendCode = useCallback(
    async (e: SubmitEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);
      try {
        await signIn(email);
        setStep('code');
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [email],
  );

  const handleVerify = useCallback(
    async (e: SubmitEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);
      try {
        await verifyCode(email, code);
      } catch (err) {
        setError((err as Error).message);
        setIsSubmitting(false);
      }
    },
    [email, code],
  );

  if (step === 'code') {
    return (
      <AuthLayout title="Enter your code">
        <p className={styles.lede}>
          We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
        </p>
        <form onSubmit={handleVerify} className={styles.form} noValidate>
          <Input
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
            disabled={isSubmitting}
            error={Boolean(error)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
          />
          {error ? (
            <p id="login-error" role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={isSubmitting} disabled={code.length !== 6}>
            Sign in
          </Button>
        </form>
        <button
          type="button"
          className={styles.subtleAction}
          onClick={() => {
            setStep('email');
            setCode('');
            setError(null);
          }}
        >
          Use a different email
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Sign in to Notable">
      <p className={styles.lede}>
        Enter your email and we&apos;ll send you a 6-digit sign-in code.
      </p>
      <form onSubmit={handleSendCode} className={styles.form} noValidate>
        <Input
          type="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          leftIcon={<Mail size={16} />}
          disabled={isSubmitting}
          error={Boolean(error)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'login-error' : undefined}
        />
        {error ? (
          <p id="login-error" role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        <Button type="submit" loading={isSubmitting} disabled={!email.trim()}>
          Send code
        </Button>
      </form>
    </AuthLayout>
  );
}
