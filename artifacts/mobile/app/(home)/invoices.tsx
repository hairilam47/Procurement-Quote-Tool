import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useListInvoices } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

type InvoiceStatus = "DRAFT" | "SENT" | "PAID";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; bg: string; text: string }> = {
  DRAFT: { label: "Draft", bg: "#f0f4ff", text: "#3b5bdb" },
  SENT: { label: "Sent", bg: "#fff3bf", text: "#e67700" },
  PAID: { label: "Paid", bg: "#d3f9d8", text: "#2b8a3e" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as InvoiceStatus] ?? {
    label: status,
    bg: "#f1f3f5",
    text: "#868e96",
  };
  return (
    <View style={[badgeStyles.badge, { backgroundColor: config.bg }]}>
      <Text style={[badgeStyles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  text: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});

function formatCurrency(amount: string, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(parseFloat(amount));
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const FILTER_OPTIONS = [
  { label: "All", value: undefined },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Paid", value: "PAID" },
];

export default function InvoicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, isLoading, isError, refetch, isFetching } = useListInvoices(
    statusFilter ? { status: statusFilter as InvoiceStatus } : {}
  );

  const styles = makeStyles(colors, insets);

  const handlePress = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/invoice/${id}`);
  };

  const handleCreate = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/invoice/create");
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>Failed to load invoices</Text>
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}
          onPress={() => refetch()}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>
              <Text style={styles.headerKuot}>Kuot</Text>
              <Text style={styles.headerFlow}>Flow</Text>
            </Text>
            <Text style={styles.headerSubtitle}>Invoices</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.createButton, pressed && { opacity: 0.8 }]}
            onPress={handleCreate}
            testID="create-invoice-button"
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
            <Text style={styles.createButtonText}>New</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          data={FILTER_OPTIONS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.label}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterChip,
                statusFilter === item.value && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(item.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        scrollEnabled={!!(data && data.length > 0)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="file" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No invoices yet</Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter
                ? `No ${statusFilter.toLowerCase()} invoices found`
                : "Tap + New to create your first invoice"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            onPress={() => handlePress(item.id)}
            testID={`invoice-card-${item.id}`}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.invoiceNumber}>{item.number}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.clientName} numberOfLines={1}>
              {item.clientName ?? item.clientCompany ?? "Client"}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.amount}>
                {formatCurrency(item.total, item.currency)}
              </Text>
              {item.dueDate ? (
                <Text style={styles.date}>Due {formatDate(item.dueDate)}</Text>
              ) : (
                <Text style={styles.date}>{formatDate(item.issueDate)}</Text>
              )}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: ReturnType<typeof useSafeAreaInsets>
) {
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  return StyleSheet.create({
    container: { flex: 1 },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      backgroundColor: colors.background,
    },
    headerContainer: {
      paddingTop: insets.top + webTopInset + 16,
      paddingHorizontal: 20,
      paddingBottom: 8,
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      letterSpacing: -0.5,
    },
    headerKuot: { color: colors.foreground },
    headerFlow: { color: colors.primary },
    headerSubtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
    createButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: colors.radius + 2,
    },
    createButtonText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
    },
    filtersContainer: {
      paddingTop: 12,
      backgroundColor: colors.background,
    },
    filters: { paddingHorizontal: 16, gap: 8 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    filterChipTextActive: { color: colors.primaryForeground },
    list: {
      padding: 16,
      paddingBottom: insets.bottom + webBottomInset + 80,
      gap: 12,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 2,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    invoiceNumber: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    clientName: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    amount: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    date: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    emptyState: {
      alignItems: "center",
      paddingTop: 80,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    emptySubtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      paddingHorizontal: 40,
    },
    retryButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: colors.radius,
      backgroundColor: colors.primary,
    },
    retryText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
    },
  });
}
