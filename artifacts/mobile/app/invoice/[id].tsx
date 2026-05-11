import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import {
  useGetInvoice,
  useChangeInvoiceStatus,
  getListInvoicesQueryKey,
  getGetInvoiceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";

type InvoiceStatus = "DRAFT" | "SENT" | "PAID";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; bg: string; text: string }> = {
  DRAFT: { label: "Draft", bg: "#f0f4ff", text: "#3b5bdb" },
  SENT: { label: "Sent", bg: "#fff3bf", text: "#e67700" },
  PAID: { label: "Paid", bg: "#d3f9d8", text: "#2b8a3e" },
};

const STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["PAID"],
  PAID: [],
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Mark as Sent",
  PAID: "Mark as Paid",
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as InvoiceStatus] ?? {
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

export default function InvoiceDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const invoiceId = Array.isArray(id) ? id[0] : id;
  const { data: invoice, isLoading, isError, refetch } = useGetInvoice(invoiceId);
  const { mutateAsync: changeStatus, isPending: isChangingStatus } = useChangeInvoiceStatus();

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

  if (isError || !invoice) {
    return (
      <View style={styles.centered}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={styles.errorTitle}>Could not load invoice</Text>
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}
          onPress={() => refetch()}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const client = invoice.client;
  const lineItems = invoice.lineItems ?? [];
  const currentStatus = invoice.status as InvoiceStatus;
  const nextStatuses = STATUS_TRANSITIONS[currentStatus] ?? [];

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    setStatusModalVisible(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await changeStatus({ id: invoiceId, data: { status: newStatus } });
      await queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(invoiceId) });
      await queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
    } catch {
      Alert.alert("Error", "Failed to update invoice status. Please try again.");
    }
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.invoiceNumber}>{invoice.number}</Text>
              <Text style={styles.invoiceDate}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <StatusBadge status={invoice.status} />
          </View>

          <View style={styles.heroTotal}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(invoice.total, invoice.currency)}
            </Text>
          </View>
        </View>

        {nextStatuses.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.statusButton, pressed && { opacity: 0.8 }]}
            onPress={() => setStatusModalVisible(true)}
            disabled={isChangingStatus}
            testID="change-status-button"
          >
            {isChangingStatus ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <>
                <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
                <Text style={styles.statusButtonText}>
                  {STATUS_LABELS[nextStatuses[0]]}
                </Text>
              </>
            )}
          </Pressable>
        )}

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
            <DataRow label="Issue date" value={formatDate(invoice.issueDate)} />
            {invoice.dueDate && (
              <DataRow label="Due date" value={formatDate(invoice.dueDate)} />
            )}
            <DataRow
              label="Subtotal"
              value={formatCurrency(invoice.subtotal ?? "0", invoice.currency)}
            />
            {parseFloat(invoice.discountAmount ?? "0") > 0 && (
              <DataRow
                label="Discount"
                value={`- ${formatCurrency(invoice.discountAmount ?? "0", invoice.currency)}`}
              />
            )}
            {parseFloat(invoice.taxAmount ?? "0") > 0 && (
              <DataRow
                label="Tax"
                value={formatCurrency(invoice.taxAmount ?? "0", invoice.currency)}
              />
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
                    index < lineItems.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineItemDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                    {item.sku && (
                      <Text style={styles.lineItemSku}>SKU: {item.sku}</Text>
                    )}
                    <Text style={styles.lineItemQty}>
                      {item.quantity} {item.unit} ×{" "}
                      {formatCurrency(item.unitPrice, invoice.currency)}
                    </Text>
                  </View>
                  <Text style={styles.lineItemTotal}>
                    {formatCurrency(item.lineTotal, invoice.currency)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {invoice.notes && (
          <View style={styles.section}>
            <SectionTitle title="Notes" />
            <View style={styles.card}>
              <Text style={styles.notes}>{invoice.notes}</Text>
            </View>
          </View>
        )}

        {invoice.terms && (
          <View style={styles.section}>
            <SectionTitle title="Terms" />
            <View style={styles.card}>
              <Text style={styles.notes}>{invoice.terms}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setStatusModalVisible(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Update Status</Text>
            {nextStatuses.map((s) => (
              <Pressable
                key={s}
                style={({ pressed }) => [
                  styles.modalOption,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => handleStatusChange(s)}
              >
                <View style={[styles.modalOptionDot, { backgroundColor: STATUS_CONFIG[s].text }]} />
                <Text style={[styles.modalOptionText, { color: colors.foreground }]}>
                  {STATUS_LABELS[s]}
                </Text>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.7 }]}
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: ReturnType<typeof useSafeAreaInsets>
) {
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.background },
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
    invoiceNumber: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "rgba(255,255,255,0.85)",
    },
    invoiceDate: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.65)",
      marginTop: 2,
    },
    heroTotal: { gap: 2 },
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
    statusButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: colors.radius + 2,
      paddingVertical: 13,
    },
    statusButtonText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
    },
    section: { gap: 4 },
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
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 4,
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#ccc",
      alignSelf: "center",
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      marginBottom: 8,
    },
    modalOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      gap: 12,
    },
    modalOptionDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    modalOptionText: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_500Medium",
    },
    modalCancel: {
      paddingVertical: 16,
      alignItems: "center",
    },
    modalCancelText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
    },
  });
}
