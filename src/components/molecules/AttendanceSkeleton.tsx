import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const AttendanceSkeleton = () => {
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header Skeleton */}
      <View style={tw`bg-blue-600 px-6 pt-6 pb-12 rounded-b-[40px] items-center`}>
        <Skeleton width={120} height={40} style={tw`bg-blue-500 mb-2`} />
        <Skeleton width={180} height={16} style={tw`bg-blue-500`} />
      </View>

      <View style={tw`px-4 -mt-8`}>
        <View style={tw`bg-white rounded-2xl shadow-sm p-4 border border-gray-100`}>
           {/* Location Card Skeleton */}
           <View style={tw`flex-row items-center bg-gray-50 p-3 rounded-xl mb-4`}>
             <Skeleton width={36} height={36} borderRadius={18} style={tw`mr-3`} />
             <View style={tw`flex-1 gap-1`}>
               <Skeleton width={80} height={10} />
               <Skeleton width="90%" height={14} />
             </View>
           </View>

           {/* Stats Skeleton */}
           <View style={tw`flex-row justify-between mb-6`}>
             <View style={tw`items-center flex-1 border-r border-gray-100 gap-1`}>
               <Skeleton width={40} height={10} />
               <Skeleton width={60} height={20} />
             </View>
             <View style={tw`items-center flex-1 gap-1`}>
               <Skeleton width={40} height={10} />
               <Skeleton width={60} height={20} />
             </View>
           </View>

           {/* Big Button Skeleton */}
           <Skeleton width="100%" height={128} borderRadius={16} />
        </View>
      </View>
    </SafeAreaView>
  );
};
