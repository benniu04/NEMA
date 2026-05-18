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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import type { RootStackScreenProps } from '../navigation/types';

type NavigationProp = RootStackScreenProps<'Login'>['navigation'];

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { login, isAuthenticated } = useAuth();
  const google = useGoogleSignIn();
  const [login_input, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Close the modal once auth state flips to signed-in (covers Google flow,
  // which completes asynchronously via the OAuth response handler).
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

  const handleLogin = async () => {
    if (!login_input.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    const result = await login({ login: login_input, password });
    setIsLoading(false);

    if (result.success) {
      navigation.goBack();
    } else {
      Alert.alert('Login Failed', result.error || 'Invalid credentials');
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
        <Ionicons name="close" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.title}>NEMA</Text>
          <Text style={styles.subtitle}>Welcome back</Text>
        </View>

        <View style={styles.form}>
          <View
            style={[
              styles.inputContainer,
              focusedInput === 'login' && styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={focusedInput === 'login' ? '#F59E0B' : '#6B7280'}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email or Username"
              placeholderTextColor="#6B7280"
              value={login_input}
              onChangeText={setLoginInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onFocus={() => setFocusedInput('login')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          <View
            style={[
              styles.inputContainer,
              focusedInput === 'password' && styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={focusedInput === 'password' ? '#F59E0B' : '#6B7280'}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#6B7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotPassword} activeOpacity={0.7}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Text style={styles.buttonText}>Sign In</Text>
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
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.replace('Register')} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 52,
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
    marginBottom: 16,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    marginVertical: 24,
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
    marginBottom: 32,
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
});

export default LoginScreen;
