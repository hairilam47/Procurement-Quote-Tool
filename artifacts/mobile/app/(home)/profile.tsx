import React, { ComponentProps } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth, useUser } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useGetMe } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

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

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { data: me, isLoading } = useGetMe();

  const styles = makeStyles(colors, insets);

  const handleSignOut = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.avatarSection}>
        <InitialsAvatar
          name={user?.fullName || me?.name}
          email={user?.primaryEmailAddress?.emailAddress || me?.email}
        />
        <Text style={styles.name} numberOfLines={1}>
          {user?.fullName || me?.name || "KuotFlow User"}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {user?.primaryEmailAddress?.emailAddress || me?.email}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
      ) : (
        <View style={styles.infoCard}>
          <InfoRow icon="mail" label="Email" value={user?.primaryEmailAddress?.emailAddress || me?.email} />
          <InfoRow icon="user" label="Name" value={user?.fullName || me?.name} />
          <InfoRow icon="shield" label="Role" value={me?.role} />
        </View>
      )}

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
