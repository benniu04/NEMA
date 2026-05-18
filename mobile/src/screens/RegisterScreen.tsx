import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import type { RootStackScreenProps } from '../navigation/types';

type NavigationProp = RootStackScreenProps<'Register'>['navigation'];

const RegisterScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { register, isAuthenticated } = useAuth();
  const google = useGoogleSignIn();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigation.goBack();
    }
  }, [isAuthenticated, navigation]);

  React.useEffect(() => {
    if (google.error) {
      Alert.alert('Google sign-in', google.error);
    }
  }, [google.error]);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!email.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const result = await register({
      email,
      username,
      password,
      displayName: displayName || username,
    });
    setIsLoading(false);

    if (result.success) {
      navigation.goBack();
    } else {
      Alert.alert('Registration Failed', result.error || 'Please try again');
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const renderInput = (
    icon: keyof typeof Ionicons.glyphMap,
    placeholder: string,
    value: string,
    onChange: (text: string) => void,
    inputKey: string,
    options?: {
      isPassword?: boolean;
      showPassword?: boolean;
      togglePassword?: () => void;
      keyboardType?: 'email-address' | 'default';
    }
  ) => (
    <View
      style={[
        styles.inputContainer,
        focusedInput === inputKey && styles.inputContainerFocused,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={focusedInput === inputKey ? '#F59E0B' : '#6B7280'}
        style={styles.inputIcon}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={options?.keyboardType || 'default'}
        secureTextEntry={options?.isPassword && !options?.showPassword}
        onFocus={() => setFocusedInput(inputKey)}
        onBlur={() => setFocusedInput(null)}
      />
      {options?.isPassword && (
        <TouchableOpacity
          style={styles.passwordToggle}
          onPress={options.togglePassword}
          activeOpacity={0.7}
        >
          <Ionicons
            name={options.showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
        <Ionicons name="close" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.title}>NEMA</Text>
            <Text style={styles.subtitle}>Create your account</Text>
          </View>

          <View style={styles.form}>
            {renderInput('mail-outline', 'Email *', email, setEmail, 'email', {
              keyboardType: 'email-address',
            })}

            {renderInput('at-outline', 'Username *', username, setUsername, 'username')}

            {renderInput('person-outline', 'Display Name (optional)', displayName, setDisplayName, 'displayName')}

            {renderInput('lock-closed-outline', 'Password *', password, setPassword, 'password', {
              isPassword: true,
              showPassword,
              togglePassword: () => setShowPassword(!showPassword),
            })}

            {renderInput('lock-closed-outline', 'Confirm Password *', confirmPassword, setConfirmPassword, 'confirmPassword', {
              isPassword: true,
              showPassword: showConfirmPassword,
              togglePassword: () => setShowConfirmPassword(!showConfirmPassword),
            })}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={20} color="#000" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={styles.socialButton}
              activeOpacity={0.7}
              onPress={google.signIn}
              disabled={!google.isReady || google.isPending}
            >
              {google.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="logo-google" size={22} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.replace('Login')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#F59E0B',
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  inputContainerFocused: {
    borderColor: '#F59E0B',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  passwordToggle: {
    padding: 8,
    marginRight: -8,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2A2A2A',
  },
  dividerText: {
    color: '#6B7280',
    fontSize: 13,
    marginHorizontal: 16,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
  footerLink: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '600',
  },
  termsText: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#F59E0B',
  },
});

export default RegisterScreen;
