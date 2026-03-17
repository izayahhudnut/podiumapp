import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing } from '../theme';

type AuthVariant = 'sign-in' | 'sign-up' | 'complete-profile';

type AuthScreenProps = {
  variant: AuthVariant;
  email: string;
  password: string;
  name: string;
  avatarUri: string | null;
  errorMessage: string | null;
  submitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  onSwitchVariant: (variant: 'sign-in' | 'sign-up') => void;
  onPickAvatar: () => void;
};

export function AuthScreen({
  variant,
  email,
  password,
  name,
  avatarUri,
  errorMessage,
  submitting,
  onEmailChange,
  onPasswordChange,
  onNameChange,
  onSubmit,
  onSwitchVariant,
  onPickAvatar,
}: AuthScreenProps) {
  const isSignIn = variant === 'sign-in';
  const isSignUp = variant === 'sign-up';
  const isCompleteProfile = variant === 'complete-profile';

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.brand}>Podium</Text>
        <Text style={styles.title}>
          {isCompleteProfile ? 'Complete your profile' : 'Welcome back'}
        </Text>

        {isCompleteProfile ? (
          <Text style={styles.subtitle}>Add your name and profile picture.</Text>
        ) : null}

        {isCompleteProfile ? (
          <View style={styles.profileBlock}>
            <View style={styles.avatarBlock}>
              <Pressable
                style={({ pressed }) => [styles.avatarPicker, pressed && styles.pressed]}
                onPress={onPickAvatar}
                disabled={submitting}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarPlaceholder}>+</Text>
                )}
              </Pressable>

              <Text style={styles.avatarHint}>Upload profile picture</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                placeholder="Your name"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                value={name}
                onChangeText={onNameChange}
                editable={!submitting}
              />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                value={email}
                onChangeText={onEmailChange}
                editable={!submitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete={isSignIn ? 'password' : 'new-password'}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                value={password}
                onChangeText={onPasswordChange}
                editable={!submitting}
              />
            </View>
          </>
        )}

        {isSignIn ? <Text style={styles.forgotText}>Forgot password?</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={onSubmit}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>
            {submitting
              ? 'Please wait...'
              : isCompleteProfile
                ? 'Finish setup'
                : isSignIn
                  ? 'Sign In'
                  : 'Sign Up'}
          </Text>
        </Pressable>

        {!isCompleteProfile ? (
          <>
            <Text style={styles.switchText}>
              {isSignIn ? "Don't have an account?" : 'Already have an account?'}{' '}
              <Text
                style={styles.switchLink}
                onPress={() => onSwitchVariant(isSignIn ? 'sign-up' : 'sign-in')}
              >
                {isSignIn ? 'Sign Up' : 'Sign In'}
              </Text>
            </Text>

            <Text style={styles.legalText}>
              By continuing, you agree to Podium&apos;s Terms of Service and Privacy Policy
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  brand: {
    color: colors.textPrimary,
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '300',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '500',
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '400',
  },
  forgotText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.textPrimary,
    marginTop: spacing.xs,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '500',
  },
  switchText: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  switchLink: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  legalText: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '300',
    textAlign: 'center',
  },
  profileBlock: {
    gap: spacing.md,
  },
  avatarBlock: {
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarPicker: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    color: colors.textSecondary,
    fontSize: 36,
    lineHeight: 36,
    fontWeight: '300',
  },
  avatarFilled: {
    width: '100%',
    height: '100%',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarHint: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '400',
  },
  errorText: {
    color: '#FF7A7A',
    fontSize: 13,
    fontWeight: '400',
  },
  pressed: {
    opacity: 0.88,
  },
});
