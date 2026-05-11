import React, { ComponentProps } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useGetMe } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

function getBaseURL(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "http://localhost:8080";
}

interface SubscriptionInfo {
  id: string;
  status: string;
  planName: string;
}

async function fetchSubscription(token: string | null): Promise<{ subscription: SubscriptionInfo | null }> {
  if (!token) throw new Error("No token");
  const res = await fetch(`${getBaseURL()}/api/stripe/subscription`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch subscription");
  return res.json();
}

function InitialsAvatar({ name, email }: { name?: string | null; email?: string | null }) {
  const colors = useColors();
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : (email?.[0] ?? "?").toUpperCase();

  return (
    <View
      style={{
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 26,
          fontFamily: "Inter_700Bold",
          color: colors.primaryForeground,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: ComponentProps<typeof Feather>["name"]; label: string; value?: string | null }) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        gap: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Feather name={icon} size={18} color={colors.mutedForeground} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
        <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: colors.foreground, marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}

function SubscriptionSection({ token, tokenLoading }: { token: string | null; tokenLoading: boolean }) {
  const colors = useColors();

  const { data, isLoading } = useQuery({
    queryKey: ["stripe-subscription-mobile", token],
    queryFn: () => fetchSubscription(token),
    enabled: !tokenLoading && !!token,
    retry: false,
    staleTime: 60_000,
  });

  const handleSubscribe = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `${getBaseURL()}/app/settings#billing`;
    Linking.openURL(url);
  };

  const sub = data?.subscription;
  const isActive = sub != null && (sub.status === "active" || sub.status === "trialing");
  const resolving = tokenLoading || isLoading;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: colors.radius + 2,
        borderWidth: 1,
        borderColor: resolving || isActive ? colors.border : "#f59e0b44",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 12,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: resolving || isActive ? "#10b98120" : "#f59e0b20",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather
            name="credit-card"
            size={18}
            color={resolving || isActive ? "#10b981" : "#f59e0b"}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
            Subscription
          </Text>
          {resolving ? (
            <ActivityIndicator color={colors.primary} size="small" style={{ alignSelf: "flex-start", marginTop: 4 }} />
          ) : (
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Inter_600SemiBold",
                color: isActive ? "#10b981" : "#f59e0b",
                marginTop: 2,
              }}
            >
              {isActive
                ? sub?.planName ?? "Active"
                : sub == null
                ? "No active subscription"
                : `${sub.status.charAt(0).toUpperCase()}${sub.status.slice(1)}`}
            </Text>
          )}
        </View>
      </View>

      {!resolving && !isActive && (
        <Pressable
          style={({ pressed }) => ({
            marginHorizontal: 16,
            marginBottom: 14,
            paddingVertical: 11,
            borderRadius: colors.radius,
            backgroundColor: "#f59e0b",
            alignItems: "center",
            opacity: pressed ? 0.85 : 1,
          })}
          onPress={handleSubscribe}
        >
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0b1120" }}>
            Subscribe to get started
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut, user, getToken } = useAuth();
  const { data: me, isLoading } = useGetMe();
  const [token, setToken] = React.useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = React.useState(true);

  React.useEffect(() => {
    getToken().then((t) => {
      setToken(t);
      setTokenLoading(false);
    });
  }, [getToken]);

  const styles = makeStyles(colors, insets);

  const handleSignOut = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
  };

  const displayName = user?.name || me?.name;
  const displayEmail = user?.email || me?.email;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.avatarSection}>
        <InitialsAvatar name={displayName} email={displayEmail} />
        <Text style={styles.name} numberOfLines={1}>
          {displayName || "KuotFlow User"}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {displayEmail}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
      ) : (
        <View style={styles.infoCard}>
          <InfoRow icon="mail" label="Email" value={displayEmail} />
          <InfoRow icon="user" label="Name" value={displayName} />
          <InfoRow icon="shield" label="Role" value={me?.role} />
        </View>
      )}

      <SubscriptionSection token={token} tokenLoading={tokenLoading} />

      <Pressable
        style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.8 }]}
        onPress={handleSignOut}
        testID="sign-out-button"
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
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
      paddingTop: insets.top + webTopInset + 24,
      paddingBottom: insets.bottom + webBottomInset + 80,
      paddingHorizontal: 20,
      gap: 20,
    },
    avatarSection: {
      alignItems: "center",
      paddingVertical: 24,
      gap: 10,
    },
    name: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    email: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    infoCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
    },
    signOutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 14,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.destructive,
      backgroundColor: "transparent",
    },
    signOutText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.destructive,
    },
  });
}
