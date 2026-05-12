import React from "react";
import {
  ActivityIndicator,
  DimensionValue,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useOnboardingStatus, OnboardingStatus } from "@/hooks/useOnboardingStatus";

function getBaseURL(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "http://localhost:8080";
}

interface Step {
  key: keyof OnboardingStatus;
  label: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}

function ChecklistItem({
  step,
  done,
}: {
  step: Step;
  done: boolean;
}) {
  const colors = useColors();

  return (
    <View style={[styles.item, { borderBottomColor: colors.border }]}>
      <View
        style={[
          styles.checkCircle,
          {
            backgroundColor: done ? "#10b981" : "transparent",
            borderColor: done ? "#10b981" : colors.border,
          },
        ]}
      >
        {done ? (
          <Feather name="check" size={12} color="#fff" />
        ) : null}
      </View>
      <View style={styles.itemText}>
        <Text
          style={[
            styles.itemLabel,
            {
              color: done ? colors.mutedForeground : colors.foreground,
              textDecorationLine: done ? "line-through" : "none",
            },
          ]}
        >
          {step.label}
        </Text>
        {!done && (
          <Text style={[styles.itemDescription, { color: colors.mutedForeground }]}>
            {step.description}
          </Text>
        )}
      </View>
      {!done && step.action && step.actionLabel && (
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={step.action}
        >
          <Text style={[styles.actionLabel, { color: colors.primaryForeground }]}>
            {step.actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function OnboardingChecklist() {
  const colors = useColors();
  const { data, isLoading, isError } = useOnboardingStatus();

  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ActivityIndicator color={colors.primary} size="small" style={{ padding: 12 }} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Feather name="check-square" size={16} color={colors.mutedForeground} />
            <Text style={[styles.title, { color: colors.mutedForeground }]}>Setup guide unavailable</Text>
          </View>
        </View>
      </View>
    );
  }

  const allDone =
    data.hasCompanyDetails &&
    data.hasStripeConnect &&
    data.hasClient &&
    data.hasSentQuotation;

  if (allDone) return null;

  const doneCount = [
    data.hasCompanyDetails,
    data.hasStripeConnect,
    data.hasClient,
    data.hasSentQuotation,
  ].filter(Boolean).length;

  const steps: Step[] = [
    {
      key: "hasCompanyDetails",
      label: "Add company details",
      description: "Set your company name and address for quotes and invoices.",
      action: () => Linking.openURL(`${getBaseURL()}/app/settings`),
      actionLabel: "Set up",
    },
    {
      key: "hasStripeConnect",
      label: "Connect Stripe",
      description: "Accept payments directly from clients.",
      action: () => Linking.openURL(`${getBaseURL()}/app/settings#billing`),
      actionLabel: "Connect",
    },
    {
      key: "hasClient",
      label: "Add your first client",
      description: "Create a client so you can send them quotes.",
      action: () => Linking.openURL(`${getBaseURL()}/app/clients`),
      actionLabel: "Add client",
    },
    {
      key: "hasSentQuotation",
      label: "Send a quotation",
      description: "Create and send your first quote to a client.",
      action: () => Linking.openURL(`${getBaseURL()}/app`),
      actionLabel: "Create quote",
    },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="check-square" size={16} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>Get started</Text>
        </View>
        <Text style={[styles.progress, { color: colors.mutedForeground }]}>
          {doneCount} / 4
        </Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: colors.primary, width: `${(doneCount / 4) * 100}%` as DimensionValue },
          ]}
        />
      </View>

      <View style={styles.steps}>
        {steps.map((step) => (
          <ChecklistItem
            key={step.key}
            step={step}
            done={!!data[step.key]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  progress: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  progressBar: {
    height: 3,
    marginHorizontal: 16,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  steps: {
    paddingHorizontal: 0,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  itemLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  itemDescription: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexShrink: 0,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
