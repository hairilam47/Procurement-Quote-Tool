import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth";
import { useGetQuotation } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type Status = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "PAID" | "EXPIRED";

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string }> = {
  DRAFT: { label: "Draft", bg: "#f0f4ff", text: "#3b5bdb" },
  SENT: { label: "Sent", bg: "#fff3bf", text: "#e67700" },
  ACCEPTED: { label: "Accepted", bg: "#d3f9d8", text: "#2b8a3e" },
  REJECTED: { label: "Rejected", bg: "#ffe3e3", text: "#c92a2a" },
  PAID: { label: "Paid", bg: "#d3f9d8", text: "#2b8a3e" },
  EXPIRED: { label: "Expired", bg: "#f1f3f5", text: "#868e96" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as Status] ?? {
    label: status,
    bg: "#f1f3f5",
    text: "#868e96",
  };
  return (
    <View style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: config.bg }]}>
      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: config.text }}>
        {config.label}
      </Text>
    </View>
  );
}

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

function SectionTitle({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
      {title}
    </Text>
  );
}

function DataRow({ label, value }: { label: string; value?: string | null }) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground, textAlign: "right", flex: 1, marginLeft: 16 }}>{value}</Text>
    </View>
  );
}

export default function QuotationDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const quotationId = Array.isArray(id) ? id[0] : id;
  const { data: quotation, isLoading, isError, refetch } = useGetQuotation(quotationId);

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const styles = makeStyles(colors, insets);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !quotation) {
    return (
      <View style={styles.centered}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={styles.errorTitle}>Could not load quote</Text>
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}
          onPress={() => refetch()}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const client = quotation.client;
  const lineItems = quotation.lineItems ?? [];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.quoteNumber}>{quotation.number}</Text>
            <Text style={styles.quoteDate}>{formatDate(quotation.issueDate)}</Text>
          </View>
          <StatusBadge status={quotation.status} />
        </View>

        <View style={styles.heroTotal}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>
            {formatCurrency(quotation.total, quotation.currency)}
          </Text>
        </View>
      </View>

      {client && (
        <View style={styles.section}>
          <SectionTitle title="Client" />
          <View style={styles.card}>
            <DataRow label="Name" value={client.name} />
            <DataRow label="Company" value={client.company} />
            <DataRow label="Email" value={client.email} />
            <DataRow label="Phone" value={client.phone} />
            <DataRow
              label="Location"
              value={[client.city, client.country].filter(Boolean).join(", ")}
            />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <SectionTitle title="Summary" />
        <View style={styles.card}>
          <DataRow label="Issue date" value={formatDate(quotation.issueDate)} />
          <DataRow label="Valid until" value={formatDate(quotation.validUntil)} />
          <DataRow label="Subtotal" value={formatCurrency(quotation.subtotal ?? "0", quotation.currency)} />
          {parseFloat(quotation.discountAmount ?? "0") > 0 && (
            <DataRow label="Discount" value={`- ${formatCurrency(quotation.discountAmount ?? "0", quotation.currency)}`} />
          )}
          {parseFloat(quotation.taxAmount ?? "0") > 0 && (
            <DataRow label="Tax" value={formatCurrency(quotation.taxAmount ?? "0", quotation.currency)} />
          )}
        </View>
      </View>

      {lineItems.length > 0 && (
        <View style={styles.section}>
          <SectionTitle title={`Line Items (${lineItems.length})`} />
          <View style={styles.card}>
            {lineItems.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.lineItem,
                  index < lineItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineItemDesc} numberOfLines={2}>{item.description}</Text>
                  {item.sku && (
                    <Text style={styles.lineItemSku}>SKU: {item.sku}</Text>
                  )}
                  <Text style={styles.lineItemQty}>
                    {item.quantity} {item.unit} × {formatCurrency(item.unitPrice, quotation.currency)}
                  </Text>
                </View>
                <Text style={styles.lineItemTotal}>
                  {formatCurrency(item.lineTotal, quotation.currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {quotation.notes && (
        <View style={styles.section}>
          <SectionTitle title="Notes" />
          <View style={styles.card}>
            <Text style={styles.notes}>{quotation.notes}</Text>
          </View>
        </View>
      )}

      {quotation.terms && (
        <View style={styles.section}>
          <SectionTitle title="Terms" />
          <View style={styles.card}>
            <Text style={styles.notes}>{quotation.terms}</Text>
          </View>
        </View>
      )}
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
      paddingTop: insets.top + webTopInset + 60,
      paddingBottom: insets.bottom + webBottomInset + 40,
      paddingHorizontal: 16,
      gap: 20,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      backgroundColor: colors.background,
      paddingTop: insets.top + webTopInset + 60,
    },
    errorTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
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
    heroCard: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius + 4,
      padding: 20,
      gap: 16,
    },
    heroRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    quoteNumber: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "rgba(255,255,255,0.85)",
    },
    quoteDate: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.65)",
      marginTop: 2,
    },
    heroTotal: {
      gap: 2,
    },
    totalLabel: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.65)",
    },
    totalAmount: {
      fontSize: 32,
      fontFamily: "Inter_700Bold",
      color: "#ffffff",
      letterSpacing: -0.5,
    },
    section: {
      gap: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
    },
    lineItem: {
      flexDirection: "row",
      paddingVertical: 14,
      gap: 12,
      alignItems: "flex-start",
    },
    lineItemDesc: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    lineItemSku: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
    lineItemQty: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 4,
    },
    lineItemTotal: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      minWidth: 80,
      textAlign: "right",
    },
    notes: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      lineHeight: 22,
      paddingVertical: 14,
    },
  });
}
