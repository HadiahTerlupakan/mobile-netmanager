import { Config } from '@/constants/Config';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

export const EnvironmentIndicator = () => {
    const variant = Config.VARIANT;
    const isProduction = Config.IS_PRODUCTION;

    if (isProduction) return null;

    const getBgColor = () => {
        if (variant === 'staging') return 'bg-orange-500';
        return 'bg-blue-500'; // development
    };

    const getLabel = () => {
        if (variant === 'staging') return 'BETA / STAGING';
        return 'LOCAL DEV';
    };

    return (
        <View
            pointerEvents="none"
            style={[
                tw`absolute bottom-24 right-4 px-3 py-1.5 rounded-full shadow-lg z-50 flex-row items-center border border-white/20`,
                tw`${getBgColor()}`
            ]}
        >
            <View style={tw`w-2 h-2 rounded-full bg-white mr-2 animate-pulse`} />
            <Text style={tw`text-white font-black text-[10px] tracking-widest uppercase`}>
                {getLabel()}
            </Text>
        </View>
    );
};
