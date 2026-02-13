// ============================================
// Profile Page — /profile
// ============================================

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Camera, Save, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/components/providers/AuthProvider';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    router.replace('/auth');
    return null;
  }

  const initials = user.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? '?';

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSaving(true);
    setSaved(false);

    try {
      await updateProfile(user, { displayName: displayName.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  const createdDate = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  const lastSign = user.metadata.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Unknown';

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Back */}
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account details
        </p>

        {/* Avatar & Info */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {initials}
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {user.displayName || 'User'}
              </h2>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Member since {createdDate}
              </p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">
            Edit Profile
          </h3>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          {saved && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle className="h-4 w-4" />
              Profile updated successfully!
            </div>
          )}

          {/* Display Name */}
          <div className="mb-4">
            <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-foreground">
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={user.email ?? ''}
                disabled
                className="w-full rounded-lg border border-border bg-secondary py-2.5 pl-10 pr-3 text-sm text-muted-foreground"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || displayName.trim() === (user.displayName ?? '')}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </form>

        {/* Account Details */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">
            Account Details
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Provider</dt>
              <dd className="font-medium text-foreground capitalize">
                {user.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Email & Password'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Member since</dt>
              <dd className="font-medium text-foreground">{createdDate}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Last sign in</dt>
              <dd className="font-medium text-foreground">{lastSign}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">User ID</dt>
              <dd className="font-mono text-xs text-muted-foreground">{user.uid}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
