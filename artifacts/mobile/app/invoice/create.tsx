import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth";
import {
  useCreateInvoice,
  useListClients,
  getListInvoicesQueryKey,
} from "@workspace/api-client-react";
import type { InvoiceInput, LineItemInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";

type LineItemDraft = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  unit: string;
};

function newLineItem(): LineItemDraft {
  return { id: Math.random().toString(36).slice(2), description: "", quantity: "1", unitPrice: "0", unit: "unit" };
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatCurrencyNum(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

const TAX_RATES = [
  { label: "No Tax (0%)", value: "0" },
  { label: "5%", value: "5" },
  { label: "10%", value: "10" },
  { label: "15%", value: "15" },
  { label: "20%", value: "20" },
  { label: "25%", value: "25" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "SGD", "JPY", "INR", "CHF", "MXN"];

export default function CreateInvoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();

  const { data: clients, isLoading: clientsLoading } = useListClients({});
  const { mutateAsync: createInvoice, isPending } = useCreateInvoice();

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(daysFromNow(30));
  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([newLineItem()]);

  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showTaxPicker, setShowTaxPicker] = useState(false);

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const styles = makeStyles(colors, insets);

  const selectedClient = clients?.find((c) => c.id === clientId);

  const subtotal = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const taxAmount = subtotal * (parseFloat(taxRate) / 100);
  const total = subtotal + taxAmount;

  const updateLineItem = useCallback((id: string, field: keyof LineItemDraft, value: string) => {
    setLineItems((prev) => prev.map((li) => (li.id === id ? { ...li, [field]: value } : li)));
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => (prev.length > 1 ? prev.filter((li) => li.id !== id) : prev));
  }, []);

  const handleSubmit = async () => {
    if (!clientId) {
      Alert.alert("Missing client", "Please select a client.");
      return;
    }
    const validItems = lineItems.filter((li) => li.description.trim());
    if (validItems.length === 0) {
      Alert.alert("Missing items", "Add at least one line item with a description.");
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const payload: InvoiceInput = {
      clientId,
      issueDate,
      dueDate: dueDate || daysFromNow(30),
      currency,
      taxRate: parseFloat(taxRate),
      notes: notes.trim() || undefined,
      lineItems: validItems.map((li) => ({
        description: li.description.trim(),
        quantity: parseFloat(li.quantity) || 1,
        unitPrice: parseFloat(li.unitPrice) || 0,
        unit: li.unit.trim() || "unit",
      })) as LineItemInput[],
    };

    try {
      await createInvoice({ data: payload });
      await queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to create invoice. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeader}>Client</Text>
        <Pressable
          style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => setShowClientPicker(true)}
        >
          <Feather name="user" size={16} color={colors.mutedForeground} />
          <Text style={[styles.pickerButtonText, { color: selectedClient ? colors.foreground : colors.mutedForeground }]}>
            {selectedClient
              ? selectedClient.name ?? selectedClient.company ?? "Client"
              : "Select a client"}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
        </Pressable>

        <Text style={styles.sectionHeader}>Dates</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Issue Date</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
              value={issueDate}
              onChangeText={setIssueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Due Date</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        </View>

        <Text style={styles.sectionHeader}>Settings</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Currency</Text>
            <Pressable
              style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <Text style={[styles.pickerButtonText, { color: colors.foreground }]}>{currency}</Text>
              <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Tax Rate</Text>
            <Pressable
              style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowTaxPicker(true)}
            >
              <Text style={[styles.pickerButtonText, { color: colors.foreground }]}>{taxRate}%</Text>
              <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        <View style={styles.lineItemsHeader}>
          <Text style={styles.sectionHeader}>Line Items</Text>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.muted }]}
            onPress={() => setLineItems((prev) => [...prev, newLineItem()])}
          >
            <Feather name="plus" size={14} color={colors.foreground} />
            <Text style={[styles.addButtonText, { color: colors.foreground }]}>Add</Text>
          </Pressable>
        </View>

        {lineItems.map((item, index) => (
          <View
            key={item.id}
            style={[styles.lineItemCard, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <View style={styles.lineItemTitleRow}>
              <Text style={[styles.lineItemIndex, { color: colors.mutedForeground }]}>
                Item {index + 1}
              </Text>
              {lineItems.length > 1 && (
                <Pressable
                  onPress={() => removeLineItem(item.id)}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </Pressable>
              )}
            </View>

            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
              value={item.description}
              onChangeText={(v) => updateLineItem(item.id, "description", v)}
              placeholder="Description"
              placeholderTextColor={colors.mutedForeground}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Qty</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
                  value={item.quantity}
                  onChangeText={(v) => updateLineItem(item.id, "quantity", v)}
                  keyboardType="decimal-pad"
                  placeholder="1"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <Text style={styles.label}>Unit Price</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
                  value={item.unitPrice}
                  onChangeText={(v) => updateLineItem(item.id, "unitPrice", v)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Unit</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
                  value={item.unit}
                  onChangeText={(v) => updateLineItem(item.id, "unit", v)}
                  placeholder="unit"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.primary }}>
                {formatCurrencyNum(
                  (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
                  currency
                )}
              </Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionHeader}>Notes</Text>
        <TextInput
          style={[styles.textArea, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional notes for the client..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View style={[styles.totalsCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
            <Text style={[styles.totalsValue, { color: colors.foreground }]}>
              {formatCurrencyNum(subtotal, currency)}
            </Text>
          </View>
          {parseFloat(taxRate) > 0 && (
            <View style={styles.totalsRow}>
              <Text style={[styles.totalsLabel, { color: colors.mutedForeground }]}>
                Tax ({taxRate}%)
              </Text>
              <Text style={[styles.totalsValue, { color: colors.foreground }]}>
                {formatCurrencyNum(taxAmount, currency)}
              </Text>
            </View>
          )}
          <View style={[styles.totalsRow, styles.totalsFinalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalsFinalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.totalsFinalValue, { color: colors.primary }]}>
              {formatCurrencyNum(total, currency)}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85 },
            isPending && { opacity: 0.7 },
          ]}
          onPress={handleSubmit}
          disabled={isPending}
          testID="submit-invoice-button"
        >
          {isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.submitButtonText, { color: colors.primaryForeground }]}>
              Create Invoice
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {showClientPicker && (
        <View style={[styles.pickerModal, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Client</Text>
            {clientsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
            ) : (
              <FlatList
                data={clients ?? []}
                keyExtractor={(c) => c.id}
                style={{ maxHeight: 320 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [
                      styles.pickerItem,
                      { borderBottomColor: colors.border },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      setClientId(item.id);
                      setShowClientPicker(false);
                    }}
                  >
                    <View>
                      <Text style={[styles.pickerItemName, { color: colors.foreground }]}>
                        {item.name ?? item.company ?? "Unnamed Client"}
                      </Text>
                      {item.company && item.name && (
                        <Text style={[styles.pickerItemSub, { color: colors.mutedForeground }]}>
                          {item.company}
                        </Text>
                      )}
                    </View>
                    {clientId === item.id && (
                      <Feather name="check" size={16} color={colors.primary} />
                    )}
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={[styles.pickerEmpty, { color: colors.mutedForeground }]}>
                    No clients found. Add clients on the dashboard.
                  </Text>
                }
              />
            )}
            <Pressable
              style={({ pressed }) => [styles.pickerCancel, pressed && { opacity: 0.7 }]}
              onPress={() => setShowClientPicker(false)}
            >
              <Text style={[styles.pickerCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {showCurrencyPicker && (
        <View style={[styles.pickerModal, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Currency</Text>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(c) => c}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.pickerItem,
                    { borderBottomColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    setCurrency(item);
                    setShowCurrencyPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemName, { color: colors.foreground }]}>{item}</Text>
                  {currency === item && <Feather name="check" size={16} color={colors.primary} />}
                </Pressable>
              )}
            />
            <Pressable
              style={({ pressed }) => [styles.pickerCancel, pressed && { opacity: 0.7 }]}
              onPress={() => setShowCurrencyPicker(false)}
            >
              <Text style={[styles.pickerCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {showTaxPicker && (
        <View style={[styles.pickerModal, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Tax Rate</Text>
            <FlatList
              data={TAX_RATES}
              keyExtractor={(r) => r.value}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.pickerItem,
                    { borderBottomColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    setTaxRate(item.value);
                    setShowTaxPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemName, { color: colors.foreground }]}>{item.label}</Text>
                  {taxRate === item.value && <Feather name="check" size={16} color={colors.primary} />}
                </Pressable>
              )}
            />
            <Pressable
              style={({ pressed }) => [styles.pickerCancel, pressed && { opacity: 0.7 }]}
              onPress={() => setShowTaxPicker(false)}
            >
              <Text style={[styles.pickerCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: ReturnType<typeof useSafeAreaInsets>
) {
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  return StyleSheet.create({
    container: {
      paddingTop: insets.top + webTopInset + 60,
      paddingBottom: insets.bottom + webBottomInset + 40,
      paddingHorizontal: 16,
      gap: 8,
    },
    sectionHeader: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 16,
      marginBottom: 4,
    },
    label: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderRadius: colors.radius,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
    textArea: {
      borderWidth: 1,
      borderRadius: colors.radius,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      minHeight: 80,
    },
    row: { flexDirection: "row", gap: 10 },
    pickerButton: {
      borderWidth: 1,
      borderRadius: colors.radius,
      paddingHorizontal: 12,
      paddingVertical: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    pickerButtonText: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
    lineItemsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 16,
      marginBottom: 4,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: colors.radius,
    },
    addButtonText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    lineItemCard: {
      borderWidth: 1,
      borderRadius: colors.radius + 2,
      padding: 12,
      gap: 8,
      marginBottom: 8,
    },
    lineItemTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    lineItemIndex: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    totalsCard: {
      borderWidth: 1,
      borderRadius: colors.radius + 2,
      padding: 16,
      gap: 8,
      marginTop: 8,
    },
    totalsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    totalsLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
    totalsValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
    totalsFinalRow: {
      borderTopWidth: 1,
      paddingTop: 10,
      marginTop: 4,
    },
    totalsFinalLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
    totalsFinalValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
    submitButton: {
      borderRadius: colors.radius + 2,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 16,
    },
    submitButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
    pickerModal: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "flex-end",
    },
    pickerSheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 12,
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
      marginBottom: 12,
    },
    pickerItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    pickerItemName: { fontSize: 15, fontFamily: "Inter_500Medium" },
    pickerItemSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
    pickerEmpty: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      paddingVertical: 24,
    },
    pickerCancel: { paddingVertical: 16, alignItems: "center" },
    pickerCancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  });
}
