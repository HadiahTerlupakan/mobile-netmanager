import React from "react";
import { RefreshCw } from "lucide-react-native";
import { Text, View } from "react-native";
import tw from "twrnc";

interface PendingSyncBadgeProps {
  pendingCount: number;
}

export function PendingSyncBadge({ pendingCount }: PendingSyncBadgeProps) {
  if (pendingCount <= 0) {
    return null;
  }

  return (
    <View style={tw`flex-row items-center bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 self-start mb-3`}>
      <RefreshCw size={12} color="#b45309" />
      <Text style={tw`text-amber-700 text-xs font-bold ml-1.5`}>
        Pending Sync: {pendingCount}
      </Text>
    </View>
  );
}
