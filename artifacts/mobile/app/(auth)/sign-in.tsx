import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

WebBrowser.maybeCompleteAuthSession();

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/capabilities`)
      .then((r) => r.json())
      .then((d) => setGoogleEnabled(!!(d?.google)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  const canSubmit = !!email && !!password && !loading;

  const handleSignIn = async () => {
    if (!canSubmit) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError("");
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace("/(home)");
  };

  const handleGoogleSignIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError("");
    setGoogleLoading(true);
    try {
      // The server-side mobile-callback route converts the cookie session
      // to a bearer token and redirects to mobile://auth-callback?token=...
      const callbackURL = `${API_BASE}/api/mobile-callback`;
      const authURL = `${API_BASE}/api/auth/sign-in/social?provider=google&callbackURL=${encodeURIComponent(callbackURL)}`;

      // Open browser — will intercept any redirect to the "mobile://" scheme
      const result = await WebBrowser.openAuthSessionAsync(authURL, "mobile://auth-callback");

      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const token = url.searchParams.get("token");
        const err = url.searchParams.get("error");
        if (token) {
          const signInResult = await signIn("", "", token);
          if (!signInResult.error) {
            router.replace("/(home)");
            return;
          }
          setError(signInResult.error ?? "Sign in failed");
        } else {
          setError(err === "auth_failed" ? "Google sign-in failed. Please try again." : "Sign in cancelled.");
        }
      } else if (result.type !== "cancel") {
        setError("Google sign-in failed. Please try again.");
      }
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const styles = makeStyles(colors, insets);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.wordmark}>
          <Text style={styles.wordmarkKuot}>Kuot</Text>
          <Text style={styles.wordmarkFlow}>Flow</Text>
        </Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
      </View>

      <View style={styles.form}>
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            testID="email-input"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPassword}
              autoComplete="password"
              testID="password-input"
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowPassword((v) => !v)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            !canSubmit && styles.primaryButtonDisabled,
            pressed && styles.pressed,
          ]}
          onPress={handleSignIn}
          disabled={!canSubmit}
          testID="sign-in-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign in</Text>
          )}
        </Pressable>

        {googleEnabled && (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.googleButton,
                pressed && styles.pressed,
                googleLoading && styles.primaryButtonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              testID="google-sign-in-button"
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={colors.foreground} />
              ) : (
                <>
                  <GoogleSVG />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <Link href="/(auth)/sign-up" asChild>
          <Pressable>
            <Text style={styles.footerLink}>Sign up</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

function GoogleSVG() {
  return (
    <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 15, fontWeight: "bold", color: "#4285F4" }}>G</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flexGrow: 1,
      paddingTop: (insets.top || webTopInset) + 48,
      paddingBottom: insets.bottom + webBottomInset + 32,
      paddingHorizontal: 24,
      justifyContent: "center",
    },
    header: {
      alignItems: "center",
      marginBottom: 40,
    },
    wordmark: {
      fontSize: 36,
      fontFamily: "Inter_700Bold",
      letterSpacing: -1,
      marginBottom: 8,
    },
    wordmarkKuot: {
      color: colors.foreground,
    },
    wordmarkFlow: {
      color: colors.primary,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    form: {
      gap: 16,
    },
    errorBox: {
      backgroundColor: "rgba(239,68,68,0.1)",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(239,68,68,0.3)",
      padding: 12,
    },
    errorText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.destructive,
    },
    inputGroup: {
      gap: 6,
    },
    label: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    input: {
      height: 48,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      paddingHorizontal: 14,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    passwordWrapper: {
      position: "relative",
    },
    passwordInput: {
      paddingRight: 48,
    },
    eyeButton: {
      position: "absolute",
      right: 14,
      top: 0,
      bottom: 0,
      justifyContent: "center",
    },
    primaryButton: {
      height: 48,
      borderRadius: colors.radius,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
    },
    pressed: {
      opacity: 0.8,
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    googleButton: {
      height: 48,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    googleButtonText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 32,
    },
    footerText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    footerLink: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
  });
}
