import React from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import ResetPasswordForm from '../../components/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <AuthLayout currentScreen="reset-password">
      <ResetPasswordForm />
    </AuthLayout>
  );
}
