import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const IsolirItemSkeleton = () => {
  return (
    <View
      style={{
        backgroundColor: 'white',
        padding: 16,
        marginBottom: 12,
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 8, gap: 4 }}>
          <Skeleton width={120} height={18} />
          <Skeleton width={150} height={14} />
          <Skeleton width={100} height={12} />
        </View>
        <Skeleton width={60} height={20} borderRadius={4} />
      </View>

      <View style={{ gap: 8, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Skeleton width={14} height={14} borderRadius={7} />
          <Skeleton width="80%" height={14} style={{ marginLeft: 6 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Skeleton width={14} height={14} borderRadius={7} />
          <Skeleton width={120} height={14} style={{ marginLeft: 6 }} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Skeleton width={14} height={14} borderRadius={7} />
          <Skeleton width={100} height={14} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Skeleton width={14} height={14} borderRadius={7} />
          <Skeleton width={80} height={14} />
          <Skeleton width={32} height={32} borderRadius={8} />
        </View>
      </View>
    </View>
  );
};

export const IsolirSkeleton = () => {
  return (
    <View style={tw`flex-1`}>
      {/* Header Search & Filter Skeleton */}
      <View style={tw`p-4 pb-2`}>
        <Skeleton width="100%" height={48} borderRadius={12} style={tw`mb-3`} />
        <View style={tw`flex-row justify-between items-center mb-4`}>
          <Skeleton width={100} height={32} borderRadius={8} />
          <Skeleton width={120} height={14} />
        </View>
      </View>

      <ScrollView scrollEnabled={false}>
        {[1, 2, 3, 4, 5].map((i) => (
          <IsolirItemSkeleton key={i} />
        ))}
      </ScrollView>
    </View>
  );
};
