import React from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import FirstTimeSetupForm from '../../components/auth/FirstTimeSetupForm';

export default function FirstTimeSetupPage() {
  return (
    <AuthLayout currentScreen="first-time-setup">
      <FirstTimeSetupForm />
    </AuthLayout>
  );
}
